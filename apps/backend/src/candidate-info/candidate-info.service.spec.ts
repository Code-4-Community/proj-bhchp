import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';

import { CandidateInfoService } from './candidate-info.service';
import { CandidateInfo } from './candidate-info.entity';

const mockcandidatesRepository: Partial<Repository<CandidateInfo>> = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
};

const candidate1: CandidateInfo = {
  appId: 1,
  email: 'john@example.com',
};

const candidate2: CandidateInfo = {
  appId: 2,
  email: 'jane@example.com',
};

describe('CandidateInfoService', () => {
  let service: CandidateInfoService;

  beforeEach(async () => {
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
      const createData = {
        appId: 1,
        email: 'john@example.com',
      };

      jest
        .spyOn(mockcandidatesRepository, 'create')
        .mockReturnValue(candidate1);
      jest
        .spyOn(mockcandidatesRepository, 'save')
        .mockResolvedValue(candidate1);

      const result = await service.create(createData.appId, createData.email);

      expect(result).toEqual(candidate1);
      expect(mockcandidatesRepository.create).toHaveBeenCalledWith(createData);
      expect(mockcandidatesRepository.save).toHaveBeenCalledWith(candidate1);
    });

    it('should trim email before creating a candidate', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'create')
        .mockReturnValue(candidate1);
      jest
        .spyOn(mockcandidatesRepository, 'save')
        .mockResolvedValue(candidate1);

      await service.create(1, '  john@example.com  ');

      expect(mockcandidatesRepository.create).toHaveBeenCalledWith({
        appId: 1,
        email: 'john@example.com',
      });
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

    it('should error out without information loss if the repository throws an error during create', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'create')
        .mockImplementationOnce(() => {
          throw new Error('There was a problem retrieving the info');
        });

      await expect(service.create(1, 'john@example.com')).rejects.toThrow(
        `There was a problem retrieving the info`,
      );
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'save')
        .mockImplementationOnce(() => {
          throw new Error('There was a problem saving the info');
        });

      await expect(service.create(1, 'john@example.com')).rejects.toThrow(
        `There was a problem saving the info`,
      );
    });
  });

  describe('findOne', () => {
    it('should throw error if email is not provided', async () => {
      await expect(service.findOne('')).rejects.toThrow(
        'candidate email is required',
      );
      expect(mockcandidatesRepository.findOne).not.toHaveBeenCalled();
    });

    it('should find the latest CandidateInfo by email', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'findOne')
        .mockResolvedValue(candidate1);

      const result = await service.findOne('john@example.com');

      expect(result).toEqual(candidate1);
      expect(mockcandidatesRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        order: { appId: 'DESC' },
      });
    });

    it('should trim email before lookup', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'findOne')
        .mockResolvedValue(candidate1);

      await service.findOne('  john@example.com  ');

      expect(mockcandidatesRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        order: { appId: 'DESC' },
      });
    });

    it('should throw error if CandidateInfo is not found', async () => {
      jest.spyOn(mockcandidatesRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('notfound@example.com')).rejects.toThrow(
        'candidate with email notfound@example.com not found',
      );
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'findOne')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.findOne('john@example.com')).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('findAllByEmail', () => {
    it('should return all CandidateInfo records for an email ordered by descending appId', async () => {
      const candidates = [{ appId: 3, email: 'john@example.com' }, candidate1];

      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockResolvedValue(candidates);

      await expect(service.findAllByEmail('john@example.com')).resolves.toEqual(
        candidates,
      );
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        order: { appId: 'DESC' },
      });
    });

    it('should throw error if email is not provided for findAllByEmail', async () => {
      await expect(service.findAllByEmail('')).rejects.toThrow(
        'candidate email is required',
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

    it('should return empty array when no candidates exist', async () => {
      jest.spyOn(mockcandidatesRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('findByAppId', () => {
    it('should find candidates by app id', async () => {
      const candidates = [candidate1];
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockResolvedValue(candidates);

      const result = await service.findByAppId(1);

      expect(result).toEqual(candidates);
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { appId: 1 },
      });
    });

    it('should return empty array when no candidates found for app id', async () => {
      jest.spyOn(mockcandidatesRepository, 'find').mockResolvedValue([]);

      const result = await service.findByAppId(999);

      expect(result).toEqual([]);
    });

    it('should throw error if appId is invalid', async () => {
      await expect(service.findByAppId(0)).rejects.toThrow(
        'Valid app ID is required',
      );
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.findByAppId(8)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('delete', () => {
    it('should delete all CandidateInfo records for an email', async () => {
      const candidates = [candidate1, { appId: 3, email: 'john@example.com' }];
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockResolvedValue(candidates);
      jest
        .spyOn(mockcandidatesRepository, 'remove')
        .mockResolvedValue(candidates as never);

      const result = await service.delete('john@example.com');

      expect(result).toEqual(candidates);
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        order: { appId: 'DESC' },
      });
      expect(mockcandidatesRepository.remove).toHaveBeenCalledWith(candidates);
    });

    it('should throw NotFoundException if CandidateInfo is not found', async () => {
      jest.spyOn(mockcandidatesRepository, 'find').mockResolvedValue([]);

      await expect(service.delete('notfound@example.com')).rejects.toThrow(
        new NotFoundException(
          'candidate with email notfound@example.com not found',
        ),
      );
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { email: 'notfound@example.com' },
        order: { appId: 'DESC' },
      });
      expect(mockcandidatesRepository.remove).not.toHaveBeenCalled();
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.delete('john@example.com')).rejects.toThrow(
        'There was a problem retrieving the info',
      );
      expect(mockcandidatesRepository.remove).not.toHaveBeenCalled();
    });

    it('should error out without information loss if the repository throws an error during removal', async () => {
      jest
        .spyOn(mockcandidatesRepository, 'find')
        .mockResolvedValue([candidate1]);
      jest
        .spyOn(mockcandidatesRepository, 'remove')
        .mockRejectedValueOnce(
          new Error('There was a problem removing the info'),
        );

      await expect(service.delete('john@example.com')).rejects.toThrow(
        'There was a problem removing the info',
      );
      expect(mockcandidatesRepository.find).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        order: { appId: 'DESC' },
      });
      expect(mockcandidatesRepository.remove).toHaveBeenCalledWith([
        candidate1,
      ]);
    });
  });
});
