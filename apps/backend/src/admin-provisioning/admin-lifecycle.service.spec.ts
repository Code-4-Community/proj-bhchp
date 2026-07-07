import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminLifecycleService } from './admin-lifecycle.service';
import { User } from '../users/user.entity';
import { COGNITO_IDENTITY_PROVIDER } from './cognito.provider';
import { UserType } from '../users/types';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
    },
    AWSConfig: {
      region: 'us-east-2',
    },
  },
}));

const makeAdmin = (overrides: Partial<User> = {}): User => ({
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  userType: UserType.ADMIN,
  isActive: true,
  ...overrides,
});

describe('AdminLifecycleService', () => {
  let service: AdminLifecycleService;

  const mockCognitoIdentityProvider = {
    send: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminLifecycleService,
        {
          provide: COGNITO_IDENTITY_PROVIDER,
          useValue: mockCognitoIdentityProvider,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AdminLifecycleService>(AdminLifecycleService);
    mockCognitoIdentityProvider.send.mockResolvedValue({});
    mockUserRepository.save.mockImplementation(async (user) => user);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listAdmins', () => {
    it('returns admins with their active status', async () => {
      mockUserRepository.find.mockResolvedValue([
        makeAdmin(),
        makeAdmin({ email: 'bob@example.com', isActive: false }),
      ]);

      const result = await service.listAdmins();

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { userType: UserType.ADMIN },
      });
      expect(result).toEqual([
        {
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          isActive: true,
        },
        {
          email: 'bob@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          isActive: false,
        },
      ]);
    });
  });

  describe('deactivateAdmin', () => {
    it('global-signs-out, disables Cognito, and flips isActive', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(makeAdmin());
      mockUserRepository.count.mockResolvedValue(2);

      const result = await service.deactivateAdmin('Ada@Example.com');

      const firstCommand = mockCognitoIdentityProvider.send.mock.calls[0][0];
      const secondCommand = mockCognitoIdentityProvider.send.mock.calls[1][0];
      expect(firstCommand).toBeInstanceOf(AdminUserGlobalSignOutCommand);
      expect(firstCommand.input).toEqual({
        UserPoolId: 'test-user-pool-id',
        Username: 'ada@example.com',
      });
      expect(secondCommand).toBeInstanceOf(AdminDisableUserCommand);
      expect(secondCommand.input).toEqual({
        UserPoolId: 'test-user-pool-id',
        Username: 'ada@example.com',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com', isActive: false }),
      );
      expect(result).toEqual({ email: 'ada@example.com', isActive: false });
    });

    it('refuses to deactivate the last active admin', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(makeAdmin());
      mockUserRepository.count.mockResolvedValue(1);

      await expect(service.deactivateAdmin('ada@example.com')).rejects.toThrow(
        ConflictException,
      );
      expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('skips the last-admin guard when the target is already inactive', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(
        makeAdmin({ isActive: false }),
      );

      await service.deactivateAdmin('ada@example.com');

      expect(mockUserRepository.count).not.toHaveBeenCalled();
      expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(2);
    });

    it('throws NotFound when the user does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.deactivateAdmin('missing@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequest when the user is not an admin', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(
        makeAdmin({ userType: UserType.STANDARD }),
      );

      await expect(service.deactivateAdmin('ada@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reactivateAdmin', () => {
    it('enables the Cognito user and flips isActive', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(
        makeAdmin({ isActive: false }),
      );

      const result = await service.reactivateAdmin('ada@example.com');

      const command = mockCognitoIdentityProvider.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(AdminEnableUserCommand);
      expect(command.input).toEqual({
        UserPoolId: 'test-user-pool-id',
        Username: 'ada@example.com',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com', isActive: true }),
      );
      expect(result).toEqual({ email: 'ada@example.com', isActive: true });
    });

    it('throws NotFound when the user does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.reactivateAdmin('missing@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
