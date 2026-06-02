import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ArrayContains, Repository } from 'typeorm';

import { CandidateInfoService } from './candidate-info.service';
import { CandidateInfo } from './candidate-info.entity';

const mockEntityManager = {
  getRepository: jest.fn(),
  query: jest.fn(),
};

const mockcandidatesRepository: Partial<Repository<CandidateInfo>> = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
  manager: {
    transaction: jest.fn(),
  } as never,
};

const candidate1: CandidateInfo = {
  email: 'john@example.com',
  appIds: [1],
};

const candidate2: CandidateInfo = {
  email: 'jane@example.com',
  appIds: [2],
};

describe('CandidateInfoService', () => {
  let service: CandidateInfoService;

  beforeEach(async () => {
    mockEntityManager.getRepository.mockReturnValue(mockcandidatesRepository);
    mockEntityManager.query.mockResolvedValue([]);
    (
      mockcandidatesRepository.manager?.transaction as jest.Mock
    ).mockImplementation(async (callback) => callback(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateInfoService,
        {
          provide: getRepositoryToken(CandidateInfo),
          useValue: mockcandidatesRepository,
        },
      ],
    }).compile();

    service = module.get<CandidateInfoService>(CandidateInfoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new candidate', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(mockcandidatesRepository, 'create')
        .mockReturnValue(candidate1);
      jest
        .spyOn(mockcandidatesRepository, 'save')
        .mockResolvedValue(candidate1);

      const result = await service.create(1, 'john@example.com');

      expect(result).toEqual(candidate1);
      expect(mockcandidatesRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockcandidatesRepository.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        appIds: [1],
      });
      expect(mockcandidatesRepository.save).toHaveBeenCalledWith(candidate1);
    });

    it('should trim email before creating a candidate', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(mockcandidatesRepository, 'create')
        .mockReturnValue(candidate1);
      jest
        .spyOn(mockcandidatesRepository, 'save')
        .mockResolvedValue(candidate1);

      await service.create(1, '  john@example.com  ');

      expect(mockcandidatesRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockcandidatesRepository.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        appIds: [1],
      });
    });

    it('should append a new appId to an existing candidate record', async () => {
      const existing: CandidateInfo = {
        email: 'john@example.com',
        appIds: [1, 3],
      };
      const updated: CandidateInfo = {
        email: 'john@example.com',
        appIds: [1, 3, 5],
      };

      jest
        .spyOn(mockcandidatesRepository, 'findOne')
        .mockResolvedValue(existing);
      jest.spyOn(mockcandidatesRepository, 'save').mockResolvedValue(updated);

      await expect(service.create(5, 'john@example.com')).resolves.toEqual(
        updated,
      );
      expect(mockcandidatesRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockcandidatesRepository.create).not.toHaveBeenCalled();
      expect(mockcandidatesRepository.save).toHaveBeenCalledWith(updated);
    });

    it('should not duplicate an existing appId', async () => {
      const existing: CandidateInfo = {
        email: 'john@example.com',
        appIds: [1, 3],
      };

      jest
        .spyOn(mockcandidatesRepository, 'findOne')
        .mockResolvedValue(existing);
      jest.spyOn(mockcandidatesRepository, 'save').mockResolvedValue(existing);

      await service.create(3, 'john@example.com');

      expect(mockcandidatesRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockcandidatesRepository.save).toHaveBeenCalledWith(existing);
      expect(existing.appIds).toEqual([1, 3]);
    });

    it('should throw error if appId is invalid', async () => {
      await expect(service.create(0, 'john@example.com')).rejects.toThrow(
        'Valid app ID is required',
      );
    });

    it('should throw error if email is empty', async () => {
      await expect(service.create(1, '')).rejects.toThrow(
        'candidate email is required',
      );
    });
  });

  describe('findOne', () => {
    it('should throw error if email is not provided', async () => {
      await expect(service.findOne('')).rejects.toThrow(
        'candidate email is required',
      );
      expect(mockcandidatesRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should find CandidateInfo by email', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'findOneBy')
        .mockResolvedValue(candidate1);

      const result = await service.findOne('john@example.com');

      expect(result).toEqual(candidate1);
      expect(mockcandidatesRepository.findOneBy).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
    });

    it('should trim email before lookup', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'findOneBy')
        .mockResolvedValue(candidate1);

      await service.findOne('  john@example.com  ');

      expect(mockcandidatesRepository.findOneBy).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
    });

    it('should throw error if CandidateInfo is not found', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.findOne('notfound@example.com')).rejects.toThrow(
        'candidate with email notfound@example.com not found',
      );
    });
  });

  describe('findLatestAppId', () => {
    it('should return the highest appId for a candidate email', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOneBy').mockResolvedValue({
        email: 'john@example.com',
        appIds: [1, 4, 2],
      });

      await expect(service.findLatestAppId('john@example.com')).resolves.toBe(
        4,
      );
    });

    it('should throw when a candidate has no appIds', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOneBy').mockResolvedValue({
        email: 'john@example.com',
        appIds: [],
      });

      await expect(service.findLatestAppId('john@example.com')).rejects.toThrow(
        'candidate with email john@example.com has no applications',
      );
    });
  });

  describe('findAll', () => {
    it('should return all candidates', async () => {
      const candidates = [candidate1, candidate2];
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockResolvedValue(candidates);

      const result = await service.findAll();

      expect(result).toEqual(candidates);
      expect(mockcandidatesRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByAppId', () => {
    it('should find candidates by app id membership', async () => {
      const candidates = [
        candidate1,
        { email: 'another@example.com', appIds: [1, 7] },
      ];
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockResolvedValue(candidates);

      const result = await service.findByAppId(1);

      expect(result).toEqual(candidates);
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { appIds: ArrayContains([1]) },
      });
      expect(mockcandidatesRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no candidates found for app id', async () => {
      jest.spyOn(mockcandidatesRepository, 'find').mockResolvedValue([]);

      const result = await service.findByAppId(999);

      expect(result).toEqual([]);
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { appIds: ArrayContains([999]) },
      });
    });

    it('should throw error if appId is invalid', async () => {
      await expect(service.findByAppId(0)).rejects.toThrow(
        'Valid app ID is required',
      );
    });
  });

  describe('delete', () => {
    it('should delete a CandidateInfo by email', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'findOneBy')
        .mockResolvedValue(candidate1);
      jest
        .spyOn(mockcandidatesRepository, 'remove')
        .mockResolvedValue(candidate1);

      const result = await service.delete('john@example.com');

      expect(result).toEqual(candidate1);
      expect(mockcandidatesRepository.findOneBy).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
      expect(mockcandidatesRepository.remove).toHaveBeenCalledWith(candidate1);
    });

    it('should throw NotFoundException if CandidateInfo is not found', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.delete('notfound@example.com')).rejects.toThrow(
        new NotFoundException(
          'candidate with email notfound@example.com not found',
        ),
      );
      expect(mockcandidatesRepository.findOneBy).toHaveBeenCalledWith({
        email: 'notfound@example.com',
      });
      expect(mockcandidatesRepository.remove).not.toHaveBeenCalled();
    });
  });
});
