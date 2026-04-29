import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { UsersService } from '../users/users.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

describe('AdminInfoService', () => {
  let service: AdminInfoService;
  let admin: AdminInfo;

  const mockAdminRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockDisciplinesService = {
    ensureActiveDisciplineKeys: jest.fn(),
  };

  beforeEach(async () => {
    admin = {
      email: 'admin@example.com',
      disciplines: ['rn', 'social-work'],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    mockAdminRepository.manager.transaction.mockImplementation(
      async (
        cb: (transactionManager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        cb({
          getRepository: (entity: unknown) => {
            if (entity === AdminInfo) return mockAdminRepository;
            return mockAdminRepository;
          },
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminInfoService,
        {
          provide: getRepositoryToken(AdminInfo),
          useValue: mockAdminRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: DisciplinesService,
          useValue: mockDisciplinesService,
        },
      ],
    }).compile();

    service = module.get<AdminInfoService>(AdminInfoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns admin list with disciplines', async () => {
    mockAdminRepository.find.mockResolvedValue([admin]);

    const result = await service.findAll();

    expect(result).toEqual([admin]);
  });

  it('findOne throws not found when missing', async () => {
    mockAdminRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing@example.com')).rejects.toThrow(
      new NotFoundException(
        'AdminInfo with email missing@example.com not found',
      ),
    );
  });

  it('create persists admin with disciplines', async () => {
    mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
      undefined,
    );
    mockAdminRepository.create.mockReturnValue({
      ...admin,
      disciplines: ['rn', 'social-work'],
    });
    mockAdminRepository.save.mockResolvedValue(admin);

    const result = await service.create({
      email: 'Admin@Example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      disciplines: ['rn', 'social-work'],
    });

    expect(
      mockDisciplinesService.ensureActiveDisciplineKeys,
    ).toHaveBeenCalledWith(['rn', 'social-work']);
    expect(result).toEqual({
      ...admin,
      disciplines: ['rn', 'social-work'],
    });
  });

  it('updateDisciplines replaces discipline list', async () => {
    mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
      undefined,
    );
    mockAdminRepository.findOne.mockResolvedValue(admin);
    mockAdminRepository.save.mockResolvedValue({
      ...admin,
      disciplines: ['rn'],
    });

    const result = await service.updateDisciplines('admin@example.com', ['rn']);

    expect(result).toEqual({ ...admin, disciplines: ['rn'] });
  });

  it('remove deletes admin', async () => {
    mockAdminRepository.findOne.mockResolvedValue(admin);
    mockAdminRepository.remove.mockResolvedValue(undefined);

    await service.remove('admin@example.com');

    expect(mockAdminRepository.remove).toHaveBeenCalledWith(admin);
  });

  it('getOldestDisciplineAdminMap returns first name/last name map', async () => {
    mockAdminRepository.find.mockResolvedValue([admin]);
    mockUsersService.findOne.mockResolvedValue({
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    const result = await service.getOldestDisciplineAdminMap();

    expect(result).toEqual({
      rn: { firstName: 'Ada', lastName: 'Lovelace' },
      'social-work': { firstName: 'Ada', lastName: 'Lovelace' },
    });
  });
});
