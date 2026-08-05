import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Application } from './application.entity';
import { COGNITO_IDENTITY_PROVIDER } from '../admin-provisioning/cognito.provider';
import envConfig from '../util/aws-exports';
import { EmailService } from '../util/email/email.service';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/types';

type CandidateName = {
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class CandidateProvisioningService {
  private readonly logger = new Logger(CandidateProvisioningService.name);

  constructor(
    @Inject(COGNITO_IDENTITY_PROVIDER)
    private readonly cognitoIdentityProvider: CognitoIdentityProviderClient,
    private readonly emailService: EmailService,
    private readonly candidateInfoService: CandidateInfoService,
    private readonly usersService: UsersService,
  ) {}

  private getCognitoUserPoolId(): string {
    const userPoolId = envConfig.CognitoAuthConfig.userPoolId;

    if (!userPoolId) {
      throw new Error(
        'Missing COGNITO_USER_POOL_ID or VITE_COGNITO_USER_POOL_ID.',
      );
    }

    return userPoolId;
  }

  private getPublicLoginUrl(): string {
    const frontendUrl = envConfig.PublicFrontendUrl;

    if (!frontendUrl) {
      throw new Error(
        'Missing PUBLIC_FRONTEND_URL or VITE_PUBLIC_FRONTEND_URL.',
      );
    }

    return frontendUrl.endsWith('/')
      ? `${frontendUrl}login`
      : `${frontendUrl}/login`;
  }

  private toTitleCase(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private deriveNameParts(email: string): {
    firstName: string;
    lastName: string;
  } {
    const localPart = email.split('@')[0] ?? 'Applicant';
    const segments = localPart.split(/[._-]+/).filter(Boolean);
    const firstName =
      this.toTitleCase(segments[0] ?? 'Applicant') || 'Applicant';
    const lastName =
      this.toTitleCase(segments.slice(1).join(' ')) || 'Applicant';

    return { firstName, lastName };
  }

  private cleanNamePart(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? this.toTitleCase(trimmed) : undefined;
  }

  private resolveCandidateName(
    email: string,
    candidateName?: CandidateName,
  ): { firstName: string; lastName: string } {
    const derived = this.deriveNameParts(email);

    return {
      firstName:
        this.cleanNamePart(candidateName?.firstName) ?? derived.firstName,
      lastName: this.cleanNamePart(candidateName?.lastName) ?? derived.lastName,
    };
  }

  private generateTemporaryPassword(): string {
    const randomSegment = randomBytes(12).toString('base64url');
    return `Bhchp-${randomSegment}Aa1!`;
  }

  private async createCandidateUserInCognito(
    email: string,
    temporaryPassword: string,
  ): Promise<void> {
    const command = new AdminCreateUserCommand({
      UserPoolId: this.getCognitoUserPoolId(),
      Username: email,
      TemporaryPassword: temporaryPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    });

    await this.cognitoIdentityProvider.send(command);
  }

  private async ensureStandardUser(
    email: string,
    candidateName?: CandidateName,
  ): Promise<void> {
    const existingUser = await this.usersService.findOne(email);
    if (existingUser) {
      return;
    }

    const { firstName, lastName } = this.resolveCandidateName(
      email,
      candidateName,
    );
    await this.usersService.create(
      email,
      firstName,
      lastName,
      UserType.STANDARD,
    );
  }

  private isUsernameExistsError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.message.includes('UsernameExistsException');
  }

  private buildSubmissionEmailBody(
    email: string,
    loginUrl: string,
    candidateName?: CandidateName,
    temporaryPassword?: string,
  ): string {
    const { firstName } = this.resolveCandidateName(email, candidateName);
    const passwordBlock = temporaryPassword
      ? `<p><strong>Temporary password:</strong> ${temporaryPassword}</p>`
      : '';

    return `
            <p>Hello ${firstName},</p>

            <p>Thank you for submitting your application! You can now create an account here on the portal to track your status. Please use the same email as your application.</p>

            ${passwordBlock}

            <p><a href="${loginUrl}">Sign in to your account</a></p>

            <p>Or copy and paste this link into your browser:</p>
            <p>${loginUrl}</p>

            <p>Thank you,<br>Boston Health Care for the Homeless Program</p>
          `;
  }

  async provisionSubmittedCandidate(
    application: Application,
    isFirstApplication: boolean,
    candidateName?: CandidateName,
  ): Promise<void> {
    const normalizedEmail = application.email.trim().toLowerCase();
    const loginUrl = this.getPublicLoginUrl();
    let temporaryPassword: string | undefined;

    if (isFirstApplication) {
      temporaryPassword = this.generateTemporaryPassword();

      try {
        await this.createCandidateUserInCognito(
          normalizedEmail,
          temporaryPassword,
        );
        await this.ensureStandardUser(normalizedEmail, candidateName);
      } catch (error) {
        if (this.isUsernameExistsError(error)) {
          this.logger.warn(
            `Candidate Cognito user already exists for ${normalizedEmail}; sending login link without temporary password.`,
          );
          temporaryPassword = undefined;
          await this.ensureStandardUser(normalizedEmail, candidateName);
        } else {
          throw error;
        }
      }
    } else {
      await this.ensureStandardUser(normalizedEmail, candidateName);
    }

    await this.candidateInfoService.create(application.appId, normalizedEmail);

    await this.emailService.queueEmail(
      normalizedEmail,
      'Your application has been submitted',
      this.buildSubmissionEmailBody(
        normalizedEmail,
        loginUrl,
        candidateName,
        temporaryPassword,
      ),
    );
  }
}
