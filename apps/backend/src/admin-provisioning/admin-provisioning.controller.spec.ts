import { Test, TestingModule } from '@nestjs/testing';
import { AdminProvisioningController } from './admin-provisioning.controller';
import { AdminProvisioningService } from './admin-provisioning.service';
import { ProvisionAdminDto } from './dto/provision-admin.dto';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';

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

const mockAdminProvisioningService = {
  provisionAdmin: jest.fn(),
};

describe('AdminProvisioningController', () => {
  let controller: AdminProvisioningController;

  const provisionAdminDto: ProvisionAdminDto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    discipline: DISCIPLINE_VALUES.RN,
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
          provide: RolesGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: UsersService,
          useValue: { findOne: jest.fn() },
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
    const mockResponse = {
      mode: 'live' as const,
      status: 'SUCCESS' as const,
      cognito: {
        attemptedCreate: true,
        attemptedRollback: false,
        cognitoUsername: 'ada@example.com',
        userStatus: 'FORCE_CHANGE_PASSWORD',
      },
      database: {
        attemptedTransaction: true,
        committed: true,
      },
      records: null,
      notes: ['success'],
    };

    mockAdminProvisioningService.provisionAdmin.mockResolvedValue(mockResponse);

    await expect(controller.provisionAdmin(provisionAdminDto)).resolves.toEqual(
      mockResponse,
    );
    expect(mockAdminProvisioningService.provisionAdmin).toHaveBeenCalledWith(
      provisionAdminDto,
    );
  });
});
