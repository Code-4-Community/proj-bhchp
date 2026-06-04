import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { ProvisionAdminDto } from './dto/provision-admin.dto';
import {
  CognitoCreateResult,
  DatabaseCreateResult,
  ProvisionAdminResponse,
} from './types';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { UserType } from '../users/types';
import { User } from '../users/user.entity';
import { COGNITO_IDENTITY_PROVIDER } from './cognito.provider';
import envConfig from '../util/aws-exports';
import { EmailService } from '../util/email/email.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

/**
 * Service for phases 2-5 of the admin provisioning plan.
 *
 * The outward response shape remains stable for the current tests, but the
 * internals now perform the real Cognito SDK and repository work required by
 * the module.
 */
@Injectable()
export class AdminProvisioningService {
  private readonly logger = new Logger(AdminProvisioningService.name);

  /**
   * Reads and validates the configured Cognito user pool id.
   * @returns the Cognito user pool id.
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

  constructor(
    @Inject(COGNITO_IDENTITY_PROVIDER)
    private readonly cognitoIdentityProvider: CognitoIdentityProviderClient,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AdminInfo)
    private readonly adminInfoRepository: Repository<AdminInfo>,
    private readonly disciplinesService: DisciplinesService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * Generates a backend-only temporary password that satisfies the common
   * Cognito password policy requirements of upper/lowercase, numeric, and
   * special characters.
   */
  generateTemporaryPassword(): string {
    this.logger.debug('Generating temporary password for admin provisioning');

    const randomSegment = randomBytes(12).toString('base64url');
    return `Bhchp-${randomSegment}Aa1!`;
  }

  /**
   * Rejects duplicate admin provisioning requests before Cognito is called so
   * we avoid creating an external identity when the database truth source
   * already contains the user.
   */
  async assertAdminDoesNotAlreadyExist(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser, existingAdmin] = await Promise.all([
      this.userRepository.findOneBy({ email: normalizedEmail }),
      this.adminInfoRepository.findOne({ where: { email: normalizedEmail } }),
    ]);

    if (existingUser) {
      throw new ConflictException(
        `User with email ${normalizedEmail} already exists.`,
      );
    }

    if (existingAdmin) {
      throw new ConflictException(
        `AdminInfo with email ${normalizedEmail} already exists.`,
      );
    }
  }

  /**
   * Creates the Cognito user record and relies on Cognito-managed invite email
   * delivery.
   */
  async createAdminUserInCognito(
    email: string,
    temporaryPassword: string,
  ): Promise<CognitoCreateResult> {
    this.logger.debug(`Creating Cognito admin user for ${email}`);
    const userPoolId = this.getCognitoUserPoolId();

    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: temporaryPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    });

    const response = await this.cognitoIdentityProvider.send(command);
    this.logger.log(
      `Cognito AdminCreateUser response: username=${
        response.User?.Username ?? email
      }, status=${response.User?.UserStatus}`,
    );

    return {
      cognitoUsername: response.User?.Username ?? email,
      userStatus:
        (response.User?.UserStatus as 'FORCE_CHANGE_PASSWORD' | undefined) ??
        'FORCE_CHANGE_PASSWORD',
    };
  }

  /**
   * Creates the BHCHP database records.
   *
   * In the real app runtime, this uses a TypeORM transaction via the injected
   * repository manager so `User` and `AdminInfo` are committed atomically.
   *
   * The fallback branch exists only for lightweight unit-test doubles that do
   * not expose a TypeORM manager.
   */
  async createAdminDatabaseRecords(
    provisionAdminDto: ProvisionAdminDto,
  ): Promise<DatabaseCreateResult> {
    const normalizedEmail = provisionAdminDto.email.trim().toLowerCase();
    const disciplines = [
      ...new Set(
        provisionAdminDto.disciplines
          .map((discipline) => discipline.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    this.logger.debug(`Creating database admin records for ${normalizedEmail}`);

    await this.disciplinesService.ensureActiveDisciplineKeys(disciplines);

    const manager = (
      this.userRepository as Repository<User> & {
        manager?: {
          transaction?: <T>(
            runInTransaction: (transactionManager: {
              getRepository: <Entity extends ObjectLiteral>(
                target: new () => Entity,
              ) => Repository<Entity>;
            }) => Promise<T>,
          ) => Promise<T>;
        };
      }
    ).manager;

    if (manager?.transaction) {
      return manager.transaction(async (transactionManager) => {
        const transactionalUserRepository =
          transactionManager.getRepository(User);
        const transactionalAdminInfoRepository =
          transactionManager.getRepository(AdminInfo);

        const existingUser = await transactionalUserRepository.findOneBy({
          email: normalizedEmail,
        });
        if (existingUser) {
          throw new ConflictException(
            `User with email ${normalizedEmail} already exists.`,
          );
        }

        const existingAdmin = await transactionalAdminInfoRepository.findOne({
          where: { email: normalizedEmail },
        });
        if (existingAdmin) {
          throw new ConflictException(
            `AdminInfo with email ${normalizedEmail} already exists.`,
          );
        }

        const normalizedFirstName = provisionAdminDto.firstName
          .trim()
          .replace(/\s+/g, ' ');
        const normalizedLastName = provisionAdminDto.lastName
          .trim()
          .replace(/\s+/g, ' ');

        const user = transactionalUserRepository.create({
          email: normalizedEmail,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          userType: UserType.ADMIN,
        });
        const savedUser = await transactionalUserRepository.save(user);

        const adminInfo = transactionalAdminInfoRepository.create({
          email: normalizedEmail,
          disciplines,
        });
        const savedAdminInfo = await transactionalAdminInfoRepository.save(
          adminInfo,
        );

        return {
          user: savedUser,
          adminInfo: {
            email: savedAdminInfo.email,
            disciplines,
            createdAt: savedAdminInfo.createdAt.toISOString(),
            updatedAt: savedAdminInfo.updatedAt.toISOString(),
          },
        };
      });
    }

    const existingUser = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    if (existingUser) {
      throw new ConflictException(
        `User with email ${normalizedEmail} already exists.`,
      );
    }

    const existingAdmin = await this.adminInfoRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingAdmin) {
      throw new ConflictException(
        `AdminInfo with email ${normalizedEmail} already exists.`,
      );
    }

    let savedUser: User | null = null;

    const user = this.userRepository.create({
      email: normalizedEmail,
      firstName: provisionAdminDto.firstName,
      lastName: provisionAdminDto.lastName,
      userType: UserType.ADMIN,
    });

    try {
      savedUser = await this.userRepository.save(user);

      const adminInfo = this.adminInfoRepository.create({
        email: normalizedEmail,
        disciplines,
      });
      const savedAdminInfo = await this.adminInfoRepository.save(adminInfo);

      return {
        user: savedUser,
        adminInfo: {
          email: savedAdminInfo.email,
          disciplines,
          createdAt: savedAdminInfo.createdAt.toISOString(),
          updatedAt: savedAdminInfo.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      if (savedUser) {
        try {
          await this.userRepository.remove(savedUser);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up partially created user ${normalizedEmail}`,
            cleanupError instanceof Error ? cleanupError.stack : undefined,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Deletes the Cognito user when database persistence fails after Cognito
   * creation.
   */
  async deleteAdminUserInCognito(cognitoUsername: string): Promise<void> {
    this.logger.warn(`Deleting Cognito admin user ${cognitoUsername}`);

    const userPoolId = this.getCognitoUserPoolId();

    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: cognitoUsername,
    });
    await this.cognitoIdentityProvider.send(command);
  }

  /**
   * Top-level orchestrator for phases 2-5 of the plan:
   * - generate password on the backend
   * - create Cognito user
   * - rely on Cognito-managed invite delivery
   * - create DB records in a transaction
   * - compensate with Cognito delete if DB write fails
   */
  async provisionAdmin(
    provisionAdminDto: ProvisionAdminDto,
  ): Promise<ProvisionAdminResponse> {
    const normalizedEmail = provisionAdminDto.email.trim().toLowerCase();
    this.logger.log(`Provisioning admin ${normalizedEmail}`);

    try {
      await this.assertAdminDoesNotAlreadyExist(normalizedEmail);
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          mode: 'live',
          status: 'DUPLICATE_RECORD',
          cognito: {
            attemptedCreate: false,
            attemptedRollback: false,
          },
          database: {
            attemptedTransaction: false,
            committed: false,
          },
          records: null,
          notes: [
            'Provisioning was rejected before Cognito user creation because a duplicate record already exists.',
            error.message,
          ],
        };
      }

      throw error;
    }

    const temporaryPassword = this.generateTemporaryPassword();

    let cognitoResult: CognitoCreateResult;
    try {
      cognitoResult = await this.createAdminUserInCognito(
        normalizedEmail,
        temporaryPassword,
      );
      this.logger.log(
        `Cognito create completed for ${normalizedEmail}: cognitoUsername=${cognitoResult.cognitoUsername}, userStatus=${cognitoResult.userStatus}`,
      );
    } catch (error) {
      return {
        mode: 'live',
        status: 'COGNITO_CREATE_FAILED',
        cognito: {
          attemptedCreate: true,
          attemptedRollback: false,
        },
        database: {
          attemptedTransaction: false,
          committed: false,
        },
        records: null,
        notes: [
          'Cognito user creation failed before any database write was attempted.',
          error instanceof Error ? error.message : 'Unknown Cognito error.',
        ],
      };
    }

    try {
      const normalizedDto: ProvisionAdminDto = {
        ...provisionAdminDto,
        email: normalizedEmail,
      };

      const records = await this.createAdminDatabaseRecords(normalizedDto);
      this.logger.log(`Database records created for ${normalizedEmail}`);
      const responseNotes = [
        'Cognito AdminCreateUser was called with invite delivery suppressed.',
        'Database record creation completed through the service transaction boundary.',
        'User and AdminInfo writes are transactional when the TypeORM manager is available.',
      ];

      try {
        const frontendUrl = envConfig.PublicFrontendUrl;
        if (!this.emailService) {
          this.logger.warn('EmailService is not available for admin emails.');
          responseNotes.push(
            'Admin creation email was skipped (EmailService missing).',
          );
        } else if (!frontendUrl) {
          this.logger.warn('PUBLIC_FRONTEND_URL is not configured.');
          responseNotes.push(
            'Admin creation email was skipped (PUBLIC_FRONTEND_URL missing).',
          );
        } else if (!process.env.AWS_SES_SENDER_EMAIL) {
          this.logger.warn('AWS_SES_SENDER_EMAIL is not configured.');
          responseNotes.push(
            'Admin creation email was skipped (AWS_SES_SENDER_EMAIL missing).',
          );
        } else {
          const loginUrl = frontendUrl.endsWith('/')
            ? `${frontendUrl}login`
            : `${frontendUrl}/login`;
          const subject = 'Your BHCHP Application Tracker admin account';
          const body = `
            <p>Hello ${provisionAdminDto.firstName},</p>

            <p>Welcome to the Boston Health Care for the Homeless Program Application Tracker></p>

            <p>Your admin account has been created.</p>

            <p><strong>Temporary password:</strong> ${temporaryPassword}</p>

            <p><a href="${loginUrl}">Sign in to your account</a></p>

            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${loginUrl}">${loginUrl}</a></p>

            <p>If you did not request this account, you can ignore this email.</p>
          `;
          await this.emailService.queueEmail(normalizedEmail, subject, body);
          this.logger.log(`Admin creation email queued for ${normalizedEmail}`);
          responseNotes.push('Admin creation email was sent via SES.');
        }
      } catch (emailErr) {
        this.logger.warn(
          `Failed to send admin creation email to ${normalizedEmail}`,
          emailErr instanceof Error ? emailErr.stack : undefined,
        );
        responseNotes.push('Admin creation email failed to send.');
      }

      return {
        mode: 'live',
        status: 'SUCCESS',
        cognito: {
          attemptedCreate: true,
          attemptedRollback: false,
          cognitoUsername: cognitoResult.cognitoUsername,
          userStatus: cognitoResult.userStatus,
        },
        database: {
          attemptedTransaction: true,
          committed: true,
        },
        records,
        notes: responseNotes,
      };
    } catch (databaseError) {
      try {
        await this.deleteAdminUserInCognito(cognitoResult.cognitoUsername);

        return {
          mode: 'live',
          status: 'DATABASE_WRITE_FAILED_ROLLED_BACK',
          cognito: {
            attemptedCreate: true,
            attemptedRollback: true,
            cognitoUsername: cognitoResult.cognitoUsername,
            userStatus: cognitoResult.userStatus,
            rollbackSucceeded: true,
          },
          database: {
            attemptedTransaction: true,
            committed: false,
          },
          records: null,
          notes: [
            'Database write failed after Cognito creation.',
            'Cognito rollback succeeded.',
            databaseError instanceof Error
              ? databaseError.message
              : 'Unknown database error.',
          ],
        };
      } catch (rollbackError) {
        this.logger.error(
          `Manual cleanup required for Cognito user ${cognitoResult.cognitoUsername} after database write failure for ${normalizedEmail}`,
          rollbackError instanceof Error ? rollbackError.stack : undefined,
        );

        return {
          mode: 'live',
          status: 'DATABASE_WRITE_FAILED_ROLLBACK_FAILED',
          cognito: {
            attemptedCreate: true,
            attemptedRollback: true,
            cognitoUsername: cognitoResult.cognitoUsername,
            userStatus: cognitoResult.userStatus,
            rollbackSucceeded: false,
          },
          database: {
            attemptedTransaction: true,
            committed: false,
          },
          records: null,
          notes: [
            'Database write failed after Cognito creation.',
            'Cognito rollback failed; manual cleanup would be required.',
            databaseError instanceof Error
              ? databaseError.message
              : 'Unknown database error.',
            rollbackError instanceof Error
              ? rollbackError.message
              : 'Unknown rollback error.',
          ],
        };
      }
    }
  }
}
