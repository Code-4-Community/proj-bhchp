import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { AdminDisciplineMap } from './admin-discipline-map.entity';
import { UsersService } from '../users/users.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

describe('AdminInfoService', () => {
  let service: AdminInfoService;

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

  const mockMapRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockDisciplinesService = {
    ensureActiveDisciplineKeys: jest.fn(),
  };

  const admin: AdminInfo = {
    email: 'admin@example.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    mockAdminRepository.manager.transaction.mockImplementation(
      async (
        cb: (transactionManager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        cb({
          getRepository: (entity: unknown) => {
            if (entity === AdminInfo) {
              return mockAdminRepository;
            }
            return mockMapRepository;
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
          provide: getRepositoryToken(AdminDisciplineMap),
          useValue: mockMapRepository,
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

  it('findAll hydrates disciplines from map rows', async () => {
    mockAdminRepository.find.mockResolvedValue([admin]);
    mockMapRepository.find.mockResolvedValue([
      { adminEmail: 'admin@example.com', disciplineKey: 'rn' },
      { adminEmail: 'admin@example.com', disciplineKey: 'social-work' },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([
      {
        ...admin,
        disciplines: ['rn', 'social-work'],
      },
    ]);
  });

  it('findOne throws not found when missing', async () => {
    mockAdminRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing@example.com')).rejects.toThrow(
      new NotFoundException(
        'AdminInfo with email missing@example.com not found',
      ),
    );
  });

  it('create persists admin and discipline mappings', async () => {
    mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
      undefined,
    );
    mockAdminRepository.create.mockReturnValue(admin);
    mockAdminRepository.save.mockResolvedValue(admin);
    mockMapRepository.create.mockImplementation((v: unknown) => v);
    mockMapRepository.save.mockResolvedValue(undefined);

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

  it('updateDisciplines replaces existing mappings', async () => {
    mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
      undefined,
    );
    mockAdminRepository.findOne.mockResolvedValue(admin);
    mockMapRepository.create.mockImplementation((v: unknown) => v);
    mockMapRepository.save.mockResolvedValue(undefined);
    mockMapRepository.find.mockResolvedValue([
      { adminEmail: 'admin@example.com', disciplineKey: 'rn' },
    ]);

    const result = await service.updateDisciplines('admin@example.com', ['rn']);

    expect(mockMapRepository.delete).toHaveBeenCalledWith({
      adminEmail: 'admin@example.com',
    });
    expect(result).toEqual({ ...admin, disciplines: ['rn'] });
  });

  it('updateEmail rewrites mapping email and returns hydrated result', async () => {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockMapRepository.createQueryBuilder.mockReturnValue(qb);
    mockAdminRepository.findOne.mockResolvedValue(admin);
    mockAdminRepository.save.mockResolvedValue({
      ...admin,
      email: 'new@example.com',
    });
    mockMapRepository.find.mockResolvedValue([
      { adminEmail: 'new@example.com', disciplineKey: 'rn' },
    ]);

    const result = await service.updateEmail('admin@example.com', {
      email: 'new@example.com',
    });

    expect(result).toEqual({
      ...admin,
      email: 'new@example.com',
      disciplines: ['rn'],
    });
    expect(qb.execute).toHaveBeenCalled();
  });

  it('remove deletes mappings then admin', async () => {
    mockAdminRepository.findOne.mockResolvedValue(admin);
    mockAdminRepository.remove.mockResolvedValue(undefined);

    await service.remove('admin@example.com');

    expect(mockMapRepository.delete).toHaveBeenCalledWith({
      adminEmail: 'admin@example.com',
    });
    expect(mockAdminRepository.remove).toHaveBeenCalledWith(admin);
  });

  it('getOldestDisciplineAdminMap returns first name/last name map', async () => {
    const qb = {
      distinctOn: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([
          { adminEmail: 'admin@example.com', disciplineKey: 'rn' },
        ]),
    };
    mockMapRepository.createQueryBuilder.mockReturnValue(qb);
    mockUsersService.findOne.mockResolvedValue({
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    const result = await service.getOldestDisciplineAdminMap();

    expect(result).toEqual({
      rn: { firstName: 'Ada', lastName: 'Lovelace' },
    });
  });
});
