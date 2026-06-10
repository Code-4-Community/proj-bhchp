import { Test, TestingModule } from '@nestjs/testing';
import { AdminInfoController } from './admin-info.controller';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { UsersService } from '../users/users.service';
import { RolesGuard } from '../auth/roles.guard';

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

const mockAdminInfoService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  getOldestDisciplineAdminMap: jest.fn(),
  updateDisciplines: jest.fn(),
  remove: jest.fn(),
};

const mockAdminInfo: AdminInfo = {
  email: 'admin@example.com',
  disciplines: ['rn'],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AdminInfoController', () => {
  let controller: AdminInfoController;

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInfoController],
      providers: [
        {
          provide: AdminInfoService,
          useValue: mockAdminInfoService,
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

    controller = module.get<AdminInfoController>(AdminInfoController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an admin', async () => {
    const dto = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'admin@example.com',
      disciplines: ['rn'],
    };

    mockAdminInfoService.create.mockResolvedValue(mockAdminInfo);

    await expect(controller.create(dto)).resolves.toEqual(mockAdminInfo);
    expect(mockAdminInfoService.create).toHaveBeenCalledWith(dto);
  });

  it('should return the discipline-admin map', async () => {
    const map = {
      rn: { firstName: 'Ada', lastName: 'Lovelace' },
      'social-work': { firstName: 'Jo', lastName: 'Rivera' },
    };
    mockAdminInfoService.getOldestDisciplineAdminMap.mockResolvedValue(map);

    await expect(controller.getDisciplineAdminMap()).resolves.toEqual(map);
  });

  it('should find an admin by email', async () => {
    mockAdminInfoService.findOne.mockResolvedValue(mockAdminInfo);

    await expect(controller.findOne('admin@example.com')).resolves.toEqual(
      mockAdminInfo,
    );
  });

  it('should find an admin by email or return null', async () => {
    mockAdminInfoService.findByEmail.mockResolvedValue(mockAdminInfo);
    await expect(controller.findByEmail('admin@example.com')).resolves.toEqual(
      mockAdminInfo,
    );

    mockAdminInfoService.findByEmail.mockResolvedValue(null);
    await expect(
      controller.findByEmail('missing@example.com'),
    ).resolves.toBeNull();
  });

  it('updates admin disciplines', async () => {
    const updated = { ...mockAdminInfo, disciplines: ['rn', 'social-work'] };
    mockAdminInfoService.updateDisciplines.mockResolvedValue(updated);

    await expect(
      controller.updateDisciplines('admin@example.com', {
        disciplines: ['rn', 'social-work'],
      }),
    ).resolves.toEqual(updated);
  });

  it('should remove an admin and return a confirmation message', async () => {
    mockAdminInfoService.remove.mockResolvedValue(undefined);

    await expect(controller.remove('admin@example.com')).resolves.toEqual({
      message: 'AdminInfo with email admin@example.com has been deleted',
    });
  });
});
