import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminUserGlobalSignOutCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserType } from '../users/types';
import { COGNITO_IDENTITY_PROVIDER } from './cognito.provider';
import envConfig from '../util/aws-exports';
import {
  AdminAccountSummary,
  AdminLifecycleResult,
} from './admin-lifecycle.types';

/**
 * Handles the admin account lifecycle: deactivation and reactivation.
 *
 * Deactivation flips the app-layer `isActive` flag (enforced on every protected
 * route by the RolesGuard) and disables the Cognito user so no new tokens can
 * be issued. Reactivation re-enables the Cognito user; the admin then logs in
 * normally with their existing credentials. Existing data (User, AdminInfo,
 * applications) is never deleted.
 */
@Injectable()
export class AdminLifecycleService {
  private readonly logger = new Logger(AdminLifecycleService.name);

  constructor(
    @Inject(COGNITO_IDENTITY_PROVIDER)
    private readonly cognitoIdentityProvider: CognitoIdentityProviderClient,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Reads and validates the configured Cognito user pool id.
   * @throws {Error} if the user pool id is not configured.
   */
  private getCognitoUserPoolId(): string {
    const userPoolId = envConfig.CognitoAuthConfig.userPoolId;
    if (!userPoolId) {
      throw new Error(
        'Missing COGNITO_USER_POOL_ID or VITE_COGNITO_USER_POOL_ID.',
      );
    }
    return userPoolId;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Loads an existing admin user or throws if missing / not an admin.
   */
  private async loadAdminUser(normalizedEmail: string): Promise<User> {
    const user = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    if (!user) {
      throw new NotFoundException(`No user found for ${normalizedEmail}.`);
    }
    if (user.userType !== UserType.ADMIN) {
      throw new BadRequestException(
        'Only admin accounts can be deactivated or reactivated.',
      );
    }
    return user;
  }

  /**
   * Returns every admin account with its current active status, for the admin
   * management screen.
   */
  async listAdmins(): Promise<AdminAccountSummary[]> {
    const admins = await this.userRepository.find({
      where: { userType: UserType.ADMIN },
    });
    return admins.map((admin) => ({
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      isActive: admin.isActive,
    }));
  }

  /**
   * Deactivates an admin account.
   *
   * Refuses to deactivate the final remaining active admin so the system is
   * never left without administrative access. Existing sessions are revoked
   * immediately via global sign-out, and the Cognito user is disabled so it can
   * no longer authenticate.
   *
   * @param email the admin to deactivate (their own or another admin's).
   * @throws {NotFoundException} if no user exists for the email.
   * @throws {BadRequestException} if the user is not an admin.
   * @throws {ConflictException} if this is the last active admin.
   */
  async deactivateAdmin(email: string): Promise<AdminLifecycleResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.loadAdminUser(normalizedEmail);

    if (user.isActive) {
      const activeAdminCount = await this.userRepository.count({
        where: { userType: UserType.ADMIN, isActive: true },
      });
      if (activeAdminCount <= 1) {
        throw new ConflictException(
          'Cannot deactivate the last active admin account.',
        );
      }
    }

    const userPoolId = this.getCognitoUserPoolId();
    this.logger.log(`Deactivating admin ${normalizedEmail}`);

    await this.cognitoIdentityProvider.send(
      new AdminUserGlobalSignOutCommand({
        UserPoolId: userPoolId,
        Username: normalizedEmail,
      }),
    );
    await this.cognitoIdentityProvider.send(
      new AdminDisableUserCommand({
        UserPoolId: userPoolId,
        Username: normalizedEmail,
      }),
    );

    user.isActive = false;
    await this.userRepository.save(user);

    return { email: normalizedEmail, isActive: false };
  }

  /**
   * Reactivates an admin account by enabling the Cognito user and clearing the
   * `isActive` flag. The admin then logs in normally with their existing
   * credentials.
   *
   * @throws {NotFoundException} if no user exists for the email.
   * @throws {BadRequestException} if the user is not an admin.
   */
  async reactivateAdmin(email: string): Promise<AdminLifecycleResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.loadAdminUser(normalizedEmail);

    const userPoolId = this.getCognitoUserPoolId();
    this.logger.log(`Reactivating admin ${normalizedEmail}`);

    await this.cognitoIdentityProvider.send(
      new AdminEnableUserCommand({
        UserPoolId: userPoolId,
        Username: normalizedEmail,
      }),
    );

    user.isActive = true;
    await this.userRepository.save(user);

    return { email: normalizedEmail, isActive: true };
  }
}
