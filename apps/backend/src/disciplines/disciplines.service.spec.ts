import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
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

    it('throws when missing', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Discipline with id 999 not found',
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
  });

  describe('getActiveDisciplineKeys', () => {
    it('returns active keys', async () => {
      mockRepository.find.mockResolvedValue([
        { key: 'rn' },
        { key: 'social-work' },
      ]);

      const result = await service.getActiveDisciplineKeys();
      expect(result).toEqual(['rn', 'social-work']);
    });
  });

  describe('ensureActiveDisciplineKey', () => {
    it('passes for active key', async () => {
      mockRepository.exists.mockResolvedValue(true);
      await expect(
        service.ensureActiveDisciplineKey('rn'),
      ).resolves.toBeUndefined();
    });

    it('throws bad request for invalid key', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.find.mockResolvedValue([
        { key: 'rn' },
        { key: 'public-health' },
      ]);

      await expect(
        service.ensureActiveDisciplineKey('invalid'),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid discipline: invalid. Valid disciplines are: rn, public-health',
        ),
      );
    });
  });

  describe('ensureActiveDisciplineKeys', () => {
    it('throws for empty list', async () => {
      await expect(service.ensureActiveDisciplineKeys([])).rejects.toThrow(
        'At least one discipline is required',
      );
    });
  });

  describe('remove', () => {
    it('removes discipline', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline);
      mockRepository.remove.mockResolvedValue(mockDiscipline);

      const result = await service.remove(1);
      expect(result).toEqual(mockDiscipline);
    });
  });
});
