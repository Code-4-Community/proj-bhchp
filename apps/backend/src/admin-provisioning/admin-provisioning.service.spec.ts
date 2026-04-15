import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminProvisioningService } from './admin-provisioning.service';
import {
  AdminProvisioningMockScenario,
  ProvisionAdminDto,
} from './dto/provision-admin.dto';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { User } from '../users/user.entity';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { UserType } from '../users/types';
import { COGNITO_IDENTITY_PROVIDER } from './cognito.provider';

const mockCognitoIdentityProvider = {
  send: jest.fn(),
};

const mockUserRepository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
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

  const originalUserPoolId = process.env.COGNITO_USER_POOL_ID;

  const baseDto: ProvisionAdminDto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    discipline: DISCIPLINE_VALUES.RN,
  };

  beforeEach(async () => {
    process.env.COGNITO_USER_POOL_ID = 'test-user-pool-id';

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
    process.env.COGNITO_USER_POOL_ID = originalUserPoolId;
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
        AdminProvisioningMockScenario.SUCCESS,
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

    it('should throw the forced Cognito failure before calling AWS', async () => {
      await expect(
        service.createAdminUserInCognito(
          'ada@example.com',
          'TempPass123!',
          AdminProvisioningMockScenario.COGNITO_CREATE_FAILS,
        ),
      ).rejects.toThrow(
        '[MOCK] Cognito AdminCreateUser failed before any database write began.',
      );

      expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
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

      const result = await service.createAdminDatabaseRecords(
        baseDto,
        AdminProvisioningMockScenario.SUCCESS,
      );

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

      await expect(
        service.createAdminDatabaseRecords(
          baseDto,
          AdminProvisioningMockScenario.SUCCESS,
        ),
      ).rejects.toThrow(
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

      await expect(
        service.createAdminDatabaseRecords(
          baseDto,
          AdminProvisioningMockScenario.SUCCESS,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'AdminInfo with email ada@example.com already exists.',
        ),
      );
    });
  });

  describe('deleteAdminUserInCognito', () => {
    it('should send an AdminDeleteUser command', async () => {
      mockCognitoIdentityProvider.send.mockResolvedValue({});

      await expect(
        service.deleteAdminUserInCognito(
          'ada@example.com',
          AdminProvisioningMockScenario.SUCCESS,
        ),
      ).resolves.toBe(true);

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
      const command = mockCognitoIdentityProvider.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(AdminDeleteUserCommand);
      expect(command.input).toEqual({
        UserPoolId: 'test-user-pool-id',
        Username: 'ada@example.com',
      });
    });

    it('should return false for the forced rollback failure scenario', async () => {
      await expect(
        service.deleteAdminUserInCognito(
          'ada@example.com',
          AdminProvisioningMockScenario.ROLLBACK_FAILS,
        ),
      ).resolves.toBe(false);

      expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
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
      const result = await service.provisionAdmin({
        ...baseDto,
        mockScenario: AdminProvisioningMockScenario.COGNITO_CREATE_FAILS,
      });

      expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
      expect(userRepository.findOneBy).not.toHaveBeenCalled();
      expect(result.status).toBe('COGNITO_CREATE_FAILED');
      expect(result.database).toEqual({
        attemptedTransaction: false,
        committed: false,
      });
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

      const result = await service.provisionAdmin({
        ...baseDto,
        mockScenario: AdminProvisioningMockScenario.DATABASE_WRITE_FAILS,
      });

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(2);
      expect(mockCognitoIdentityProvider.send.mock.calls[1][0]).toBeInstanceOf(
        AdminDeleteUserCommand,
      );
      expect(result.status).toBe('DATABASE_WRITE_FAILED_ROLLED_BACK');
      expect(result.cognito.rollbackSucceeded).toBe(true);
    });

    it('should return rollback failed when the forced rollback scenario is used', async () => {
      mockCognitoIdentityProvider.send.mockResolvedValueOnce({
        User: {
          Username: 'ada@example.com',
          UserStatus: 'FORCE_CHANGE_PASSWORD',
        },
      });

      const result = await service.provisionAdmin({
        ...baseDto,
        mockScenario: AdminProvisioningMockScenario.ROLLBACK_FAILS,
      });

      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('DATABASE_WRITE_FAILED_ROLLBACK_FAILED');
      expect(result.cognito.rollbackSucceeded).toBe(false);
    });
  });
});
