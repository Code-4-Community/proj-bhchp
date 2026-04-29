import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { UsersService } from '../users/users.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

describe('AdminInfoService', () => {
  let service: AdminInfoService;

  const mockAdmin: AdminInfo = {
    email: 'admin@example.com',
    disciplines: ['rn', 'social-work'],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

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

  describe('getOldestDisciplineAdminMap', () => {
    it('returns oldest admin for each discipline', async () => {
      mockAdminRepository.find.mockResolvedValue([
        {
          ...mockAdmin,
          email: 'oldest@example.com',
          disciplines: ['rn', 'social-work'],
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          ...mockAdmin,
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

      expect(mockAdminRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', email: 'ASC' },
      });
      expect(result).toEqual({
        rn: { firstName: 'Ada', lastName: 'Lovelace' },
        'social-work': { firstName: 'Ada', lastName: 'Lovelace' },
      });
    });

    it('falls back to email when user record is missing', async () => {
      mockAdminRepository.find.mockResolvedValue([mockAdmin]);
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.getOldestDisciplineAdminMap()).resolves.toEqual({
        rn: { firstName: 'admin@example.com', lastName: '' },
        'social-work': { firstName: 'admin@example.com', lastName: '' },
      });
    });
  });

  describe('create', () => {
    it('persists a new admin with normalized email and deduped disciplines', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockAdminRepository.create.mockReturnValue({
        ...mockAdmin,
        disciplines: ['rn', 'social-work'],
      });
      mockAdminRepository.save.mockResolvedValue(mockAdmin);

      const result = await service.create({
        email: ' Admin@Example.com ',
        firstName: 'Ada',
        lastName: 'Lovelace',
        disciplines: ['rn', 'social-work', 'rn'],
      });

      expect(
        mockDisciplinesService.ensureActiveDisciplineKeys,
      ).toHaveBeenCalledWith(['rn', 'social-work']);
      expect(mockAdminRepository.create).toHaveBeenCalledWith({
        email: 'admin@example.com',
        disciplines: ['rn', 'social-work'],
      });
      expect(result).toEqual(mockAdmin);
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

    it('passes through repository save errors', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockAdminRepository.create.mockReturnValue(mockAdmin);
      mockAdminRepository.save.mockRejectedValueOnce(
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
    it('returns all admins', async () => {
      mockAdminRepository.find.mockResolvedValue([mockAdmin]);
      await expect(service.findAll()).resolves.toEqual([mockAdmin]);
    });

    it('returns empty array when no admins exist', async () => {
      mockAdminRepository.find.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });

    it('passes through repository errors', async () => {
      mockAdminRepository.find.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entries'),
      );
      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the entries',
      );
    });
  });

  describe('findOne', () => {
    it('returns admin by email', async () => {
      mockAdminRepository.findOne.mockResolvedValue(mockAdmin);
      await expect(service.findOne('admin@example.com')).resolves.toEqual(
        mockAdmin,
      );
      expect(mockAdminRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
    });

    it('throws not found when missing', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing@example.com')).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email missing@example.com not found',
        ),
      );
    });

    it('passes through repository errors', async () => {
      mockAdminRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entry'),
      );
      await expect(service.findOne('admin@example.com')).rejects.toThrow(
        'There was a problem retrieving the entry',
      );
    });
  });

  describe('findByEmail', () => {
    it('returns admin when found', async () => {
      mockAdminRepository.findOne.mockResolvedValue(mockAdmin);
      await expect(service.findByEmail('admin@example.com')).resolves.toEqual(
        mockAdmin,
      );
    });

    it('returns null when missing', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);
      await expect(service.findByEmail('missing@example.com')).resolves.toBe(
        null,
      );
    });

    it('passes through repository errors', async () => {
      mockAdminRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entries'),
      );
      await expect(service.findByEmail('admin@example.com')).rejects.toThrow(
        'There was a problem retrieving the entries',
      );
    });
  });

  describe('updateEmail', () => {
    it('updates email and returns refreshed admin', async () => {
      mockAdminRepository.findOne
        .mockResolvedValueOnce({ ...mockAdmin })
        .mockResolvedValueOnce({ ...mockAdmin, email: 'new@example.com' });
      mockAdminRepository.save.mockResolvedValue({
        ...mockAdmin,
        email: 'new@example.com',
      });

      const result = await service.updateEmail('admin@example.com', {
        email: ' New@Example.com ',
      });

      expect(mockAdminRepository.save).toHaveBeenCalledWith({
        ...mockAdmin,
        email: 'new@example.com',
      });
      expect(result.email).toBe('new@example.com');
    });

    it('throws not found when admin is missing', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);

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

    it('passes through save errors', async () => {
      mockAdminRepository.findOne.mockResolvedValue({ ...mockAdmin });
      mockAdminRepository.save.mockRejectedValueOnce(
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
      mockAdminRepository.findOne
        .mockResolvedValueOnce({ ...mockAdmin })
        .mockResolvedValueOnce({ ...mockAdmin, disciplines: ['rn'] });
      mockAdminRepository.save.mockResolvedValue({
        ...mockAdmin,
        disciplines: ['rn'],
      });

      const result = await service.updateDisciplines('admin@example.com', [
        'rn',
        'rn',
      ]);

      expect(
        mockDisciplinesService.ensureActiveDisciplineKeys,
      ).toHaveBeenCalledWith(['rn']);
      expect(mockAdminRepository.save).toHaveBeenCalledWith({
        ...mockAdmin,
        disciplines: ['rn'],
      });
      expect(result).toEqual({ ...mockAdmin, disciplines: ['rn'] });
    });

    it('throws not found when admin is missing', async () => {
      mockDisciplinesService.ensureActiveDisciplineKeys.mockResolvedValue(
        undefined,
      );
      mockAdminRepository.findOne.mockResolvedValue(null);

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
    it('deletes admin when found', async () => {
      mockAdminRepository.findOne.mockResolvedValue(mockAdmin);
      mockAdminRepository.remove.mockResolvedValue(undefined);

      await service.remove('admin@example.com');

      expect(mockAdminRepository.remove).toHaveBeenCalledWith(mockAdmin);
    });

    it('throws not found when missing', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing@example.com')).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email missing@example.com not found',
        ),
      );
    });

    it('passes through repository remove errors', async () => {
      mockAdminRepository.findOne.mockResolvedValue(mockAdmin);
      mockAdminRepository.remove.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );

      await expect(service.remove('admin@example.com')).rejects.toThrow(
        'There was a problem saving the entry',
      );
    });
  });
});
