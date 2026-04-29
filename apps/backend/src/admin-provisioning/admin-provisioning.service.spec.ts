import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConflictException } from '@nestjs/common';
import { AdminProvisioningService } from './admin-provisioning.service';
import { User } from '../users/user.entity';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { COGNITO_IDENTITY_PROVIDER } from './cognito.provider';
import { DisciplinesService } from '../disciplines/disciplines.service';
import { UserType } from '../users/types';

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

describe('AdminProvisioningService', () => {
  let service: AdminProvisioningService;

  const mockCognitoIdentityProvider = {
    send: jest.fn(),
  };

  const mockUserRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    manager: undefined,
  };

  const mockAdminInfoRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDisciplinesService = {
    ensureActiveDisciplineKeys: jest.fn(),
  };

  const baseDto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    disciplines: ['rn', 'social-work'],
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
        {
          provide: DisciplinesService,
          useValue: mockDisciplinesService,
        },
      ],
    }).compile();

    service = module.get<AdminProvisioningService>(AdminProvisioningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createAdminUserInCognito sends expected command', async () => {
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

    const command = mockCognitoIdentityProvider.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(AdminCreateUserCommand);
    expect(result.cognitoUsername).toBe('ada@example.com');
  });

  it('createAdminDatabaseRecords writes user and admin_info records', async () => {
    const createdUser = {
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      userType: UserType.ADMIN,
    };
    const createdAdminInfo = {
      email: 'ada@example.com',
      disciplines: ['rn', 'social-work'],
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
    };

    mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
      undefined,
    );
    mockUserRepository.findOneBy.mockResolvedValue(null);
    mockAdminInfoRepository.findOne.mockResolvedValue(null);
    mockUserRepository.create.mockReturnValue(createdUser);
    mockUserRepository.save.mockResolvedValue(createdUser);
    mockAdminInfoRepository.create.mockReturnValue(createdAdminInfo);
    mockAdminInfoRepository.save.mockResolvedValue(createdAdminInfo);

    const result = await service.createAdminDatabaseRecords(baseDto);

    expect(
      mockDisciplinesService.ensureActiveDisciplineKeys,
    ).toHaveBeenCalledWith(['rn', 'social-work']);
    expect(result.adminInfo.disciplines).toEqual(['rn', 'social-work']);
  });

  it('createAdminDatabaseRecords throws conflict when user exists', async () => {
    mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
      undefined,
    );
    mockUserRepository.findOneBy.mockResolvedValue({
      email: 'ada@example.com',
    });

    await expect(service.createAdminDatabaseRecords(baseDto)).rejects.toThrow(
      new ConflictException('User with email ada@example.com already exists.'),
    );
  });

  it('deleteAdminUserInCognito sends delete command', async () => {
    mockCognitoIdentityProvider.send.mockResolvedValue({});

    await service.deleteAdminUserInCognito('ada@example.com');

    expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
    expect(mockCognitoIdentityProvider.send.mock.calls[0][0]).toBeInstanceOf(
      AdminDeleteUserCommand,
    );
  });

  it('provisionAdmin returns duplicate status before cognito call', async () => {
    mockUserRepository.findOneBy.mockResolvedValue({
      email: 'ada@example.com',
    });
    mockAdminInfoRepository.findOne.mockResolvedValue(null);

    const result = await service.provisionAdmin(baseDto);

    expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
    expect(result.status).toBe('DUPLICATE_RECORD');
  });
});
