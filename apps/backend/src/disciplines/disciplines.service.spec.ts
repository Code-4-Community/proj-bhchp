import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { CreateDisciplineRequestDto } from './dto/create-discipline.request.dto';

describe('DisciplinesService', () => {
  let service: DisciplinesService;
  let repository: Repository<Discipline>;

  const mockRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };

  const mockDiscipline: Discipline = {
    id: 1,
    key: 'rn',
    label: 'RN',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplinesService,
        {
          provide: getRepositoryToken(Discipline),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DisciplinesService>(DisciplinesService);
    repository = module.get<Repository<Discipline>>(
      getRepositoryToken(Discipline),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns active disciplines sorted by label', async () => {
      mockRepository.find.mockResolvedValue([mockDiscipline]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { label: 'ASC' },
      });
      expect(result).toEqual([mockDiscipline]);
    });

    it('returns empty array when no disciplines exist', async () => {
      mockRepository.find.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });

    it('passes through repository errors', async () => {
      mockRepository.find.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );
      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('findAllIncludingInactive', () => {
    it('returns all disciplines sorted by label', async () => {
      mockRepository.find.mockResolvedValue([mockDiscipline]);

      const result = await service.findAllIncludingInactive();

      expect(repository.find).toHaveBeenCalledWith({
        order: { label: 'ASC' },
      });
      expect(result).toEqual([mockDiscipline]);
    });
  });

  describe('findOne', () => {
    it('returns discipline by id', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline);

      const result = await service.findOne(1);

      expect(result).toEqual(mockDiscipline);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('throws not found when missing', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Discipline with id 999 not found'),
      );
    });

    it('passes through repository errors', async () => {
      mockRepository.findOneBy.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.findOne(1)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('create', () => {
    it('normalizes key and label and defaults isActive', async () => {
      const dto: CreateDisciplineRequestDto = {
        key: ' RN ',
        label: ' RN Label ',
      };
      const created: Discipline = {
        ...mockDiscipline,
        key: 'rn',
        label: 'RN Label',
      };

      mockRepository.create.mockReturnValue(created);
      mockRepository.save.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith({
        key: 'rn',
        label: 'RN Label',
        isActive: true,
      });
      expect(result).toEqual(created);
    });

    it('respects explicit isActive false', async () => {
      const dto: CreateDisciplineRequestDto = {
        key: 'social-work',
        label: 'Social Work',
        isActive: false,
      };

      const created: Discipline = {
        ...mockDiscipline,
        key: 'social-work',
        label: 'Social Work',
        isActive: false,
      };

      mockRepository.create.mockReturnValue(created);
      mockRepository.save.mockResolvedValue(created);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith({
        key: 'social-work',
        label: 'Social Work',
        isActive: false,
      });
    });

    it('passes through repository save errors', async () => {
      const dto: CreateDisciplineRequestDto = {
        key: 'rn',
        label: 'RN',
      };
      mockRepository.create.mockReturnValue(mockDiscipline);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.create(dto)).rejects.toThrow('Save failed');
    });
  });

  describe('getActiveDisciplineKeys', () => {
    it('returns active keys sorted by key', async () => {
      mockRepository.find.mockResolvedValue([
        { key: 'rn' },
        { key: 'social-work' },
      ]);

      const result = await service.getActiveDisciplineKeys();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { key: true },
        order: { key: 'ASC' },
      });
      expect(result).toEqual(['rn', 'social-work']);
    });
  });

  describe('ensureActiveDisciplineKey', () => {
    it('passes for active key', async () => {
      mockRepository.exists.mockResolvedValue(true);
      await expect(
        service.ensureActiveDisciplineKey('rn'),
      ).resolves.toBeUndefined();
      expect(repository.exists).toHaveBeenCalledWith({
        where: { key: 'rn', isActive: true },
      });
    });

    it('throws bad request with valid key list for invalid key', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.find.mockResolvedValue([
        { key: 'public-health' },
        { key: 'rn' },
      ]);

      await expect(
        service.ensureActiveDisciplineKey('invalid'),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid discipline: invalid. Valid disciplines are: public-health, rn',
        ),
      );
    });
  });

  describe('ensureActiveDisciplineKeys', () => {
    it('throws for empty list', async () => {
      await expect(service.ensureActiveDisciplineKeys([])).rejects.toThrow(
        new BadRequestException('At least one discipline is required'),
      );
    });

    it('checks unique keys only once each', async () => {
      mockRepository.exists.mockResolvedValue(true);

      await service.ensureActiveDisciplineKeys(['rn', 'social-work', 'rn']);

      expect(repository.exists).toHaveBeenCalledTimes(2);
      expect(repository.exists).toHaveBeenNthCalledWith(1, {
        where: { key: 'rn', isActive: true },
      });
      expect(repository.exists).toHaveBeenNthCalledWith(2, {
        where: { key: 'social-work', isActive: true },
      });
    });
  });

  describe('remove', () => {
    it('removes discipline', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline);
      mockRepository.remove.mockResolvedValue(mockDiscipline);

      const result = await service.remove(1);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repository.remove).toHaveBeenCalledWith(mockDiscipline);
      expect(result).toEqual(mockDiscipline);
    });

    it('throws not found when discipline does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Discipline with id 999 not found'),
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('passes through repository remove errors', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline);
      mockRepository.remove.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.remove(1)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
