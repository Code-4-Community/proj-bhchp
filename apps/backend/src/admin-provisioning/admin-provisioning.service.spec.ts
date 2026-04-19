import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminProvisioningService } from './admin-provisioning.service';
import { ProvisionAdminDto } from './dto/provision-admin.dto';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { User } from '../users/user.entity';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { UserType } from '../users/types';
import { COGNITO_IDENTITY_PROVIDER } from './cognito.provider';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
    AWSConfig: {
      region: 'us-east-1',
    },
  },
}));

const mockCognitoIdentityProvider = {
  send: jest.fn(),
};

const mockUserRepository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockAdminInfoRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('AdminProvisioningService', () => {
  let service: AdminProvisioningService;
  let userRepository: Repository<User>;
  let adminInfoRepository: Repository<AdminInfo>;

  const baseDto: ProvisionAdminDto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    discipline: DISCIPLINE_VALUES.RN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProvisioningService,
        {
          provide: COGNITO_IDENTITY_PROVIDER,
          useValue: mockCognitoIdentityProvider,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(AdminInfo),
          useValue: mockAdminInfoRepository,
        },
      ],
    }).compile();

    service = module.get<AdminProvisioningService>(AdminProvisioningService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    adminInfoRepository = module.get<Repository<AdminInfo>>(
      getRepositoryToken(AdminInfo),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAdminUserInCognito', () => {
    it('should send an AdminCreateUser command with Cognito-managed invite email', async () => {
      mockCognitoIdentityProvider.send.mockResolvedValue({
        User: {
          Username: 'ada@example.com',
          UserStatus: 'FORCE_CHANGE_PASSWORD',
        },
      });

      const result = await service.createAdminUserInCognito(
        'ada@example.com',
        'TempPass123!',
      );

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
      const command = mockCognitoIdentityProvider.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(AdminCreateUserCommand);
      expect(command.input).toEqual({
        UserPoolId: 'test-user-pool-id',
        Username: 'ada@example.com',
        TemporaryPassword: 'TempPass123!',
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: 'ada@example.com' },
          { Name: 'email_verified', Value: 'true' },
        ],
      });
      expect(result).toEqual({
        cognitoUsername: 'ada@example.com',
        userStatus: 'FORCE_CHANGE_PASSWORD',
      });
    });

    it('should propagate Cognito errors', async () => {
      mockCognitoIdentityProvider.send.mockRejectedValue(
        new Error('UsernameExistsException'),
      );

      await expect(
        service.createAdminUserInCognito('ada@example.com', 'TempPass123!'),
      ).rejects.toThrow('UsernameExistsException');
    });
  });

  describe('createAdminDatabaseRecords', () => {
    it('should create and save the user and admin info records', async () => {
      const createdUser = {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: UserType.ADMIN,
      };
      const savedAdminInfo = {
        email: 'ada@example.com',
        discipline: DISCIPLINE_VALUES.RN,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      };

      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockAdminInfoRepository.create.mockReturnValue(savedAdminInfo);
      mockAdminInfoRepository.save.mockResolvedValue(savedAdminInfo);

      const result = await service.createAdminDatabaseRecords(baseDto);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: 'ada@example.com',
      });
      expect(adminInfoRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: UserType.ADMIN,
      });
      expect(adminInfoRepository.create).toHaveBeenCalledWith({
        email: 'ada@example.com',
        discipline: DISCIPLINE_VALUES.RN,
      });
      expect(result).toEqual({
        user: createdUser,
        adminInfo: {
          email: 'ada@example.com',
          discipline: DISCIPLINE_VALUES.RN,
          createdAt: '2026-04-14T00:00:00.000Z',
          updatedAt: '2026-04-14T00:00:00.000Z',
        },
      });
    });

    it('should throw a conflict when the user already exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({
        email: 'ada@example.com',
      });

      await expect(service.createAdminDatabaseRecords(baseDto)).rejects.toThrow(
        new ConflictException(
          'User with email ada@example.com already exists.',
        ),
      );

      expect(adminInfoRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw a conflict when admin info already exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue({
        email: 'ada@example.com',
      });

      await expect(service.createAdminDatabaseRecords(baseDto)).rejects.toThrow(
        new ConflictException(
          'AdminInfo with email ada@example.com already exists.',
        ),
      );
    });

    it('should clean up the saved user if admin info save fails in fallback mode', async () => {
      const createdUser = {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: UserType.ADMIN,
      };

      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockAdminInfoRepository.create.mockReturnValue({
        email: 'ada@example.com',
        discipline: DISCIPLINE_VALUES.RN,
      });
      mockAdminInfoRepository.save.mockRejectedValue(
        new Error('Admin info save failed'),
      );
      mockUserRepository.remove.mockResolvedValue(undefined);

      await expect(service.createAdminDatabaseRecords(baseDto)).rejects.toThrow(
        'Admin info save failed',
      );

      expect(mockUserRepository.remove).toHaveBeenCalledWith(createdUser);
    });
  });

  describe('deleteAdminUserInCognito', () => {
    it('should send an AdminDeleteUser command', async () => {
      mockCognitoIdentityProvider.send.mockResolvedValue({});

      await expect(
        service.deleteAdminUserInCognito('ada@example.com'),
      ).resolves.toBeUndefined();

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
      const command = mockCognitoIdentityProvider.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(AdminDeleteUserCommand);
      expect(command.input).toEqual({
        UserPoolId: 'test-user-pool-id',
        Username: 'ada@example.com',
      });
    });

    it('should propagate Cognito delete errors', async () => {
      mockCognitoIdentityProvider.send.mockRejectedValue(
        new Error('DeleteFailed'),
      );

      await expect(
        service.deleteAdminUserInCognito('ada@example.com'),
      ).rejects.toThrow('DeleteFailed');
    });
  });

  describe('provisionAdmin', () => {
    it('should orchestrate Cognito create and repository writes on success', async () => {
      mockCognitoIdentityProvider.send.mockResolvedValue({
        User: {
          Username: 'ada@example.com',
          UserStatus: 'FORCE_CHANGE_PASSWORD',
        },
      });
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((value) => value);
      mockUserRepository.save.mockImplementation(async (value) => value);
      mockAdminInfoRepository.create.mockImplementation((value) => ({
        ...value,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      }));
      mockAdminInfoRepository.save.mockImplementation(async (value) => value);

      const result = await service.provisionAdmin(baseDto);

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
      expect(result.mode).toBe('live');
      expect(result.status).toBe('SUCCESS');
      expect(result.cognito).toEqual({
        attemptedCreate: true,
        attemptedRollback: false,
        cognitoUsername: 'ada@example.com',
        userStatus: 'FORCE_CHANGE_PASSWORD',
      });
      expect(result.database).toEqual({
        attemptedTransaction: true,
        committed: true,
      });
      expect(result.records?.user).toEqual({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: UserType.ADMIN,
      });
    });

    it('should return Cognito create failure without touching repositories', async () => {
      mockCognitoIdentityProvider.send.mockRejectedValue(
        new Error('UsernameExistsException'),
      );
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue(null);

      const result = await service.provisionAdmin(baseDto);

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: 'ada@example.com',
      });
      expect(adminInfoRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
      });
      expect(result.mode).toBe('live');
      expect(result.status).toBe('COGNITO_CREATE_FAILED');
      expect(result.database).toEqual({
        attemptedTransaction: false,
        committed: false,
      });
      expect(result.notes).toEqual([
        'Cognito user creation failed before any database write was attempted.',
        'UsernameExistsException',
      ]);
    });

    it('should reject duplicate records before calling Cognito', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({
        email: 'ada@example.com',
      });
      mockAdminInfoRepository.findOne.mockResolvedValue(null);

      const result = await service.provisionAdmin(baseDto);

      expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
      expect(result.mode).toBe('live');
      expect(result.status).toBe('DUPLICATE_RECORD');
      expect(result.cognito).toEqual({
        attemptedCreate: false,
        attemptedRollback: false,
      });
      expect(result.database).toEqual({
        attemptedTransaction: false,
        committed: false,
      });
      expect(result.notes).toEqual([
        'Provisioning was rejected before Cognito user creation because a duplicate record already exists.',
        'User with email ada@example.com already exists.',
      ]);
    });

    it('should attempt Cognito rollback when the database write fails', async () => {
      mockCognitoIdentityProvider.send
        .mockResolvedValueOnce({
          User: {
            Username: 'ada@example.com',
            UserStatus: 'FORCE_CHANGE_PASSWORD',
          },
        })
        .mockResolvedValueOnce({});
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((value) => value);
      mockUserRepository.save.mockRejectedValue(
        new Error('Database transaction failed'),
      );

      const result = await service.provisionAdmin(baseDto);

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(2);
      expect(mockCognitoIdentityProvider.send.mock.calls[1][0]).toBeInstanceOf(
        AdminDeleteUserCommand,
      );
      expect(result.mode).toBe('live');
      expect(result.status).toBe('DATABASE_WRITE_FAILED_ROLLED_BACK');
      expect(result.cognito.rollbackSucceeded).toBe(true);
      expect(result.notes).toEqual([
        'Database write failed after Cognito creation.',
        'Cognito rollback succeeded.',
        'Database transaction failed',
      ]);
    });

    it('should return rollback failed when Cognito delete also fails', async () => {
      mockCognitoIdentityProvider.send
        .mockResolvedValueOnce({
          User: {
            Username: 'ada@example.com',
            UserStatus: 'FORCE_CHANGE_PASSWORD',
          },
        })
        .mockRejectedValueOnce(new Error('DeleteFailed'));
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockAdminInfoRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((value) => value);
      mockUserRepository.save.mockRejectedValue(
        new Error('Database transaction failed'),
      );

      const result = await service.provisionAdmin(baseDto);

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(2);
      expect(result.mode).toBe('live');
      expect(result.status).toBe('DATABASE_WRITE_FAILED_ROLLBACK_FAILED');
      expect(result.cognito.rollbackSucceeded).toBe(false);
      expect(result.notes).toEqual([
        'Database write failed after Cognito creation.',
        'Cognito rollback failed; manual cleanup would be required.',
        'Database transaction failed',
        'DeleteFailed',
      ]);
    });
  });
});
