import { Test, TestingModule } from '@nestjs/testing';
import { AdminProvisioningController } from './admin-provisioning.controller';
import { AdminProvisioningService } from './admin-provisioning.service';
import { InjectionToken } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-2',
      bucketName: 'bucket',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
}));
describe('AdminProvisioningController', () => {
  let controller: AdminProvisioningController;

  const mockAdminProvisioningService = {
    provisionAdmin: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProvisioningController],
      providers: [
        {
          provide: AdminProvisioningService,
          useValue: mockAdminProvisioningService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
      ],
    }).compile();

    controller = module.get<AdminProvisioningController>(
      AdminProvisioningController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate provisioning to the service', async () => {
    const dto = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      disciplines: ['rn', 'social-work'],
    };

    const response = {
      mode: 'live' as const,
      status: 'SUCCESS' as const,
      cognito: {
        attemptedCreate: true,
        attemptedRollback: false,
      },
      database: {
        attemptedTransaction: true,
        committed: true,
      },
      records: null,
      notes: [],
    };

    mockAdminProvisioningService.provisionAdmin.mockResolvedValue(response);

    await expect(controller.provisionAdmin(dto)).resolves.toEqual(response);
    expect(mockAdminProvisioningService.provisionAdmin).toHaveBeenCalledWith(
      dto,
    );
  });
});
