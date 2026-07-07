import { Test, TestingModule } from '@nestjs/testing';
import { AdminLifecycleController } from './admin-lifecycle.controller';
import { AdminLifecycleService } from './admin-lifecycle.service';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
    },
    AWSConfig: { region: 'us-east-2' },
    PublicFrontendUrl: 'https://app.test',
  },
}));

describe('AdminLifecycleController', () => {
  let controller: AdminLifecycleController;

  const mockAdminLifecycleService = {
    listAdmins: jest.fn(),
    deactivateAdmin: jest.fn(),
    reactivateAdmin: jest.fn(),
  };

  const mockRolesGuard = { canActivate: jest.fn(() => true) };
  const mockUsersService = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLifecycleController],
      providers: [
        { provide: AdminLifecycleService, useValue: mockAdminLifecycleService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: RolesGuard, useValue: mockRolesGuard },
      ],
    }).compile();

    controller = module.get<AdminLifecycleController>(AdminLifecycleController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists admins via the service', async () => {
    const admins = [
      {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        isActive: true,
      },
    ];
    mockAdminLifecycleService.listAdmins.mockResolvedValue(admins);

    await expect(controller.listAdmins()).resolves.toEqual(admins);
    expect(mockAdminLifecycleService.listAdmins).toHaveBeenCalledTimes(1);
  });

  it('delegates deactivation to the service', async () => {
    const result = { email: 'ada@example.com', isActive: false };
    mockAdminLifecycleService.deactivateAdmin.mockResolvedValue(result);

    await expect(
      controller.deactivateAdmin('ada@example.com'),
    ).resolves.toEqual(result);
    expect(mockAdminLifecycleService.deactivateAdmin).toHaveBeenCalledWith(
      'ada@example.com',
    );
  });

  it('delegates reactivation to the service', async () => {
    const result = { email: 'ada@example.com', isActive: true };
    mockAdminLifecycleService.reactivateAdmin.mockResolvedValue(result);

    await expect(
      controller.reactivateAdmin('ada@example.com'),
    ).resolves.toEqual(result);
    expect(mockAdminLifecycleService.reactivateAdmin).toHaveBeenCalledWith(
      'ada@example.com',
    );
  });
});
