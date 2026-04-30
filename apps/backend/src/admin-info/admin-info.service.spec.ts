import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { UsersService } from '../users/users.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

describe('AdminInfoService', () => {
  let service: AdminInfoService;

  const mockAdminInfo: AdminInfo = {
    email: 'admin@example.com',
    disciplines: ['rn', 'social-work'],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockRepository = {
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
    mockRepository.manager.transaction.mockImplementation(
      async (
        cb: (transactionManager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        cb({
          getRepository: (entity: unknown) => {
            if (entity === AdminInfo) return mockRepository;
            return mockRepository;
          },
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminInfoService,
        {
          provide: getRepositoryToken(AdminInfo),
          useValue: mockRepository,
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

  describe('getOldestDisciplineAdminMap', () => {
    it('should return one oldest admin per discipline with names', async () => {
      mockRepository.find.mockResolvedValue([
        {
          ...mockAdminInfo,
          email: 'oldest@example.com',
          disciplines: ['rn', 'social-work'],
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          ...mockAdminInfo,
          email: 'newer@example.com',
          disciplines: ['rn'],
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      ]);
      mockUsersService.findOne
        .mockResolvedValueOnce({
          email: 'oldest@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
        })
        .mockResolvedValueOnce({
          email: 'oldest@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
        });

      const result = await service.getOldestDisciplineAdminMap();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', email: 'ASC' },
      });
      expect(result).toEqual({
        rn: { firstName: 'Ada', lastName: 'Lovelace' },
        'social-work': { firstName: 'Ada', lastName: 'Lovelace' },
      });
    });

    it('should fall back to email when user record is missing', async () => {
      mockRepository.find.mockResolvedValue([mockAdminInfo]);
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.getOldestDisciplineAdminMap()).resolves.toEqual({
        rn: { firstName: 'admin@example.com', lastName: '' },
        'social-work': { firstName: 'admin@example.com', lastName: '' },
      });
    });
  });

  describe('create', () => {
    it('should create and save a new admin', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockRepository.create.mockReturnValue({
        ...mockAdminInfo,
        disciplines: ['rn', 'social-work'],
      });
      mockRepository.save.mockResolvedValue(mockAdminInfo);

      const result = await service.create({
        email: ' Admin@Example.com ',
        firstName: 'Ada',
        lastName: 'Lovelace',
        disciplines: ['rn', 'social-work', 'rn'],
      });

      expect(
        mockDisciplinesService.ensureActiveDisciplineKeys,
      ).toHaveBeenCalledWith(['rn', 'social-work']);
      expect(mockRepository.create).toHaveBeenCalledWith({
        email: 'admin@example.com',
        disciplines: ['rn', 'social-work'],
      });
      expect(result).toEqual(mockAdminInfo);
    });

    it('passes through discipline validation errors', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockRejectedValueOnce(
        new Error('Invalid disciplines'),
      );

      await expect(
        service.create({
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          disciplines: ['invalid'],
        }),
      ).rejects.toThrow('Invalid disciplines');
    });

    it('should pass along any repo errors without information loss during save', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockRepository.create.mockReturnValue(mockAdminInfo);
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );

      await expect(
        service.create({
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          disciplines: ['rn'],
        }),
      ).rejects.toThrow('There was a problem saving the entry');
    });
  });

  describe('findAll', () => {
    it('should return an array of admins', async () => {
      mockRepository.find.mockResolvedValue([mockAdminInfo]);
      await expect(service.findAll()).resolves.toEqual([mockAdminInfo]);
    });

    it('should return empty array when no admins exist', async () => {
      mockRepository.find.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.find.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entries'),
      );
      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the entries',
      );
    });
  });

  describe('findOne', () => {
    it('should return an admin by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      await expect(service.findOne('admin@example.com')).resolves.toEqual(
        mockAdminInfo,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
    });

    it('should throw NotFoundException when admin not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing@example.com')).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email missing@example.com not found',
        ),
      );
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entry'),
      );
      await expect(service.findOne('admin@example.com')).rejects.toThrow(
        'There was a problem retrieving the entry',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return an admin by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      await expect(service.findByEmail('admin@example.com')).resolves.toEqual(
        mockAdminInfo,
      );
    });

    it('should return null when admin not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findByEmail('missing@example.com')).resolves.toBe(
        null,
      );
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entries'),
      );
      await expect(service.findByEmail('admin@example.com')).rejects.toThrow(
        'There was a problem retrieving the entries',
      );
    });
  });

  describe('updateEmail', () => {
    it('should update admin email and return the admin', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockAdminInfo })
        .mockResolvedValueOnce({ ...mockAdminInfo, email: 'new@example.com' });
      mockRepository.save.mockResolvedValue({
        ...mockAdminInfo,
        email: 'new@example.com',
      });

      const result = await service.updateEmail('admin@example.com', {
        email: ' New@Example.com ',
      });

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockAdminInfo,
        email: 'new@example.com',
      });
      expect(result.email).toBe('new@example.com');
    });

    it('should throw NotFoundException when admin not found for email update', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateEmail('missing@example.com', {
          email: 'new@example.com',
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email missing@example.com not found',
        ),
      );
    });

    it('should pass along any repo errors without information loss during saving', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockAdminInfo });
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );

      await expect(
        service.updateEmail('admin@example.com', {
          email: 'new@example.com',
        }),
      ).rejects.toThrow('There was a problem saving the entry');
    });
  });

  describe('updateDisciplines', () => {
    it('replaces disciplines and returns refreshed admin', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockAdminInfo })
        .mockResolvedValueOnce({ ...mockAdminInfo, disciplines: ['rn'] });
      mockRepository.save.mockResolvedValue({
        ...mockAdminInfo,
        disciplines: ['rn'],
      });

      const result = await service.updateDisciplines('admin@example.com', [
        'rn',
        'rn',
      ]);

      expect(
        mockDisciplinesService.ensureActiveDisciplineKeys,
      ).toHaveBeenCalledWith(['rn']);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockAdminInfo,
        disciplines: ['rn'],
      });
      expect(result).toEqual({ ...mockAdminInfo, disciplines: ['rn'] });
    });

    it('throws not found when admin is missing', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDisciplines('missing@example.com', ['rn']),
      ).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email missing@example.com not found',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove an admin', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.remove.mockResolvedValue(undefined);

      await service.remove('admin@example.com');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockAdminInfo);
    });

    it('should throw NotFoundException when admin not found for removal', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing@example.com')).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email missing@example.com not found',
        ),
      );
    });

    it('should pass along any repo errors without information loss during removal', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.remove.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );

      await expect(service.remove('admin@example.com')).rejects.toThrow(
        'There was a problem saving the entry',
      );
    });
  });
});
