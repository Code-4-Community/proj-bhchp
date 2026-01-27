import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';

import { LearnersService } from './learners.service';
import { Learner } from './learner.entity';
import { learnerFactory } from '../testing/factories/learner.factory';

const mockLearnersRepository: Partial<Repository<Learner>> = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
};

const learner1: Learner = learnerFactory({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
});
const learner2: Learner = learnerFactory({
  id: 2,
  firstName: 'Jane',
  lastName: 'Doe',
});

describe('LearnersService', () => {
  let service: LearnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearnersService,
        {
          provide: getRepositoryToken(Learner),
          useValue: mockLearnersRepository,
        },
      ],
    }).compile();

    service = module.get<LearnersService>(LearnersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new learner', async () => {
      const createData = {
        appId: 1,
        firstName: 'John',
        lastName: 'Doe',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      };

      jest.spyOn(mockLearnersRepository, 'create').mockReturnValue(learner1);
      jest.spyOn(mockLearnersRepository, 'save').mockResolvedValue(learner1);

      const result = await service.create(
        createData.appId,
        createData.firstName,
        createData.lastName,
        createData.startDate,
        createData.endDate,
      );

      expect(result).toEqual(learner1);
      expect(mockLearnersRepository.create).toHaveBeenCalledWith(createData);
      expect(mockLearnersRepository.save).toHaveBeenCalledWith(learner1);
    });

    it('should throw error if appId is invalid', async () => {
      await expect(
        service.create(
          0,
          'John',
          'Doe',
          new Date('2024-01-01'),
          new Date('2024-06-30'),
        ),
      ).rejects.toThrow('Valid app ID is required');
    });

    it('should throw error if first name is empty', async () => {
      await expect(
        service.create(
          1,
          '',
          'Doe',
          new Date('2024-01-01'),
          new Date('2024-06-30'),
        ),
      ).rejects.toThrow('Learner first name is required');
    });

    it('should throw error if last name is empty', async () => {
      await expect(
        service.create(
          1,
          'Jane',
          '',
          new Date('2024-01-01'),
          new Date('2024-06-30'),
        ),
      ).rejects.toThrow('Learner last name is required');
    });

    it('should throw error if start date is after end date', async () => {
      await expect(
        service.create(
          1,
          'John',
          'Doe',
          new Date('2024-06-30'),
          new Date('2024-01-01'),
        ),
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should error out without information loss if the repository throws an error during create', async () => {
      const createData = {
        appId: 1,
        firstName: 'John',
        lastName: 'Doe',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      };

      jest
        .spyOn(mockLearnersRepository, 'create')
        .mockImplementationOnce(() => {
          throw new Error('There was a problem retrieving the info');
        });

      await expect(
        service.create(
          createData.appId,
          createData.firstName,
          createData.lastName,
          createData.startDate,
          createData.endDate,
        ),
      ).rejects.toThrow(`There was a problem retrieving the info`);
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      const createData = {
        appId: 1,
        firstName: 'John',
        lastName: 'Doe',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      };

      jest.spyOn(mockLearnersRepository, 'save').mockImplementationOnce(() => {
        throw new Error('There was a problem saving the info');
      });

      await expect(
        service.create(
          createData.appId,
          createData.firstName,
          createData.lastName,
          createData.startDate,
          createData.endDate,
        ),
      ).rejects.toThrow(`There was a problem saving the info`);
    });
  });

  describe('findOne', () => {
    it('should throw error if id is not provided', async () => {
      await expect(service.findOne(null)).rejects.toThrow(
        'Learner ID is required',
      );
      expect(mockLearnersRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should find a learner by id', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(learner1);

      const result = await service.findOne(1);

      expect(result).toEqual(learner1);
      expect(mockLearnersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw error if learner is not found', async () => {
      jest.spyOn(mockLearnersRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Learner with ID 999 not found',
      );
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.findOne(1)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('findAll', () => {
    it('should return all learners', async () => {
      const learners = [learner1, learner2];
      jest.spyOn(mockLearnersRepository, 'find').mockResolvedValue(learners);

      const result = await service.findAll();

      expect(result).toEqual(learners);
      expect(mockLearnersRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no learners exist', async () => {
      jest.spyOn(mockLearnersRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockLearnersRepository, 'find')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('findByAppId', () => {
    it('should find learners by app id', async () => {
      const learners = [learner1];
      jest.spyOn(mockLearnersRepository, 'find').mockResolvedValue(learners);

      const result = await service.findByAppId(1);

      expect(result).toEqual(learners);
      expect(mockLearnersRepository.find).toHaveBeenCalledWith({
        where: { appId: 1 },
      });
    });

    it('should return empty array when no learners found for app id', async () => {
      jest.spyOn(mockLearnersRepository, 'find').mockResolvedValue([]);

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
        .spyOn(mockLearnersRepository, 'find')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.findByAppId(8)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('updateStartDate', () => {
    const updatedStartDate = new Date('2024-02-01');
    const updatedLearner = { ...learner1, startDate: updatedStartDate };

    it('should update learner start date', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(learner1);
      jest
        .spyOn(mockLearnersRepository, 'save')
        .mockResolvedValue(updatedLearner);

      const result = await service.updateStartDate(1, updatedStartDate);

      expect(result).toEqual(updatedLearner);
      expect(mockLearnersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockLearnersRepository.save).toHaveBeenCalledWith({
        ...learner1,
        startDate: updatedStartDate,
      });
    });

    it('should throw error if learner is not found', async () => {
      jest.spyOn(mockLearnersRepository, 'findOneBy').mockResolvedValue(null);

      await expect(
        service.updateStartDate(999, updatedStartDate),
      ).rejects.toThrow('Learner with ID 999 not found');
    });

    it('should throw error if start date is after end date', async () => {
      const existingLearner = {
        ...learner1,
        endDate: new Date('2024-01-15'),
      };
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(existingLearner);

      await expect(
        service.updateStartDate(1, updatedStartDate),
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should throw error if no start date provided', async () => {
      await expect(service.updateStartDate(1, null)).rejects.toThrow(
        'Start date is required',
      );
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(
        service.updateStartDate(999, updatedStartDate),
      ).rejects.toThrow('There was a problem retrieving the info');
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(learner1);
      jest
        .spyOn(mockLearnersRepository, 'save')
        .mockRejectedValueOnce(
          new Error('There was a problem saving the info'),
        );

      await expect(
        service.updateStartDate(1, updatedStartDate),
      ).rejects.toThrow('There was a problem saving the info');
    });
  });

  describe('updateEndDate', () => {
    const updatedEndDate = new Date('2024-07-31');
    const updatedLearner = { ...learner1, endDate: updatedEndDate };

    it('should update learner end date', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(learner1);
      jest
        .spyOn(mockLearnersRepository, 'save')
        .mockResolvedValue(updatedLearner);

      const result = await service.updateEndDate(1, updatedEndDate);

      expect(result).toEqual(updatedLearner);
      expect(mockLearnersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockLearnersRepository.save).toHaveBeenCalledWith({
        ...learner1,
        endDate: updatedEndDate,
      });
    });

    it('should throw error if learner is not found', async () => {
      jest.spyOn(mockLearnersRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.updateEndDate(999, updatedEndDate)).rejects.toThrow(
        'Learner with ID 999 not found',
      );
    });

    it('should throw error if end date is before start date', async () => {
      const existingLearner = {
        ...learner1,
        startDate: new Date('2024-08-15'),
      };
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(existingLearner);

      await expect(service.updateEndDate(1, updatedEndDate)).rejects.toThrow(
        'End date must be after start date',
      );
    });

    it('should throw error if no end date provided', async () => {
      await expect(service.updateEndDate(1, null)).rejects.toThrow(
        'End date is required',
      );
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockRejectedValueOnce(
          new Error('There was a problem retrieving the info'),
        );

      await expect(service.updateEndDate(999, updatedEndDate)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      jest
        .spyOn(mockLearnersRepository, 'findOneBy')
        .mockResolvedValue(learner1);
      jest
        .spyOn(mockLearnersRepository, 'save')
        .mockRejectedValueOnce(
          new Error('There was a problem saving the info'),
        );

      await expect(service.updateEndDate(1, updatedEndDate)).rejects.toThrow(
        'There was a problem saving the info',
      );
    });
  });
});
