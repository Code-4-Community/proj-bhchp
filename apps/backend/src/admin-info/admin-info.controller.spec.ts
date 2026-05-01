import { Test, TestingModule } from '@nestjs/testing';
import { AdminInfoController } from './admin-info.controller';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';

const mockAdminInfoService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  getOldestDisciplineAdminMap: jest.fn(),
  updateEmail: jest.fn(),
  remove: jest.fn(),
};

const mockAdminInfo: AdminInfo = {
  email: 'admin@example.com',
  discipline: DISCIPLINE_VALUES.RN,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('AdminInfoController', () => {
  let controller: AdminInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInfoController],
      providers: [
        {
          provide: AdminInfoService,
          useValue: mockAdminInfoService,
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: UsersService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: CurrentUserInterceptor,
          useValue: { intercept: jest.fn() },
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
      discipline: DISCIPLINE_VALUES.RN,
    };

    mockAdminInfoService.create.mockResolvedValue(mockAdminInfo);

    await expect(controller.create(dto)).resolves.toEqual(mockAdminInfo);
    expect(mockAdminInfoService.create).toHaveBeenCalledWith(dto);
  });

  it('should return the discipline-admin map', async () => {
    const map = {
      [DISCIPLINE_VALUES.RN]: { firstName: 'Alex', lastName: 'Kim' },
      [DISCIPLINE_VALUES.SocialWork]: {
        firstName: 'Jo',
        lastName: 'Rivera',
      },
    };
    mockAdminInfoService.getOldestDisciplineAdminMap.mockResolvedValue(map);

    await expect(controller.getDisciplineAdminMap()).resolves.toEqual(map);
    expect(mockAdminInfoService.getOldestDisciplineAdminMap).toHaveBeenCalled();
  });

  it('should find an admin by email', async () => {
    mockAdminInfoService.findOne.mockResolvedValue(mockAdminInfo);

    await expect(controller.findOne('admin@example.com')).resolves.toEqual(
      mockAdminInfo,
    );
    expect(mockAdminInfoService.findOne).toHaveBeenCalledWith(
      'admin@example.com',
    );
  });

  it('should find an admin by email or return null', async () => {
    mockAdminInfoService.findByEmail.mockResolvedValue(mockAdminInfo);

    await expect(controller.findByEmail('admin@example.com')).resolves.toEqual(
      mockAdminInfo,
    );
    expect(mockAdminInfoService.findByEmail).toHaveBeenCalledWith(
      'admin@example.com',
    );
  });

  it('should update an admin email', async () => {
    const updatedAdmin = { ...mockAdminInfo, email: 'updated@example.com' };
    const dto = { email: 'updated@example.com' };

    mockAdminInfoService.updateEmail.mockResolvedValue(updatedAdmin);

    await expect(
      controller.updateEmail('admin@example.com', dto),
    ).resolves.toEqual(updatedAdmin);
    expect(mockAdminInfoService.updateEmail).toHaveBeenCalledWith(
      'admin@example.com',
      dto,
    );
  });

  it('should remove an admin and return a confirmation message', async () => {
    mockAdminInfoService.remove.mockResolvedValue(undefined);

    await expect(controller.remove('admin@example.com')).resolves.toEqual({
      message: 'AdminInfo with email admin@example.com has been deleted',
    });
    expect(mockAdminInfoService.remove).toHaveBeenCalledWith(
      'admin@example.com',
    );
  });
});
