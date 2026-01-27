import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LearnersController } from './learners.controller';
import { LearnersService } from './learners.service';
import { Learner } from './learner.entity';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { learnerFactory } from '../testing/factories/learner.factory';

const mockLearnersService: Partial<LearnersService> = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByAppId: jest.fn(),
  updateStartDate: jest.fn(),
  updateEndDate: jest.fn(),
};

const mockAuthService = {
  getUser: jest.fn(),
};

const mockUsersService = {
  find: jest.fn(),
};

const defaultLearner: Learner = learnerFactory({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
});

describe('LearnersController', () => {
  let controller: LearnersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearnersController],
      providers: [
        {
          provide: LearnersService,
          useValue: mockLearnersService,
        },
        {
          provide: getRepositoryToken(Learner),
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<LearnersController>(LearnersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLearner', () => {
    it('should create a new learner', async () => {
      const createLearnerDto = {
        appId: 1,
        firstName: 'John',
        lastName: 'Doe',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      };

      jest
        .spyOn(mockLearnersService, 'create')
        .mockResolvedValue(defaultLearner);

      const result = await controller.createLearner(createLearnerDto);

      expect(result).toEqual(defaultLearner);
      expect(mockLearnersService.create).toHaveBeenCalledWith(
        1,
        'John',
        'Doe',
        new Date('2024-01-01'),
        new Date('2024-06-30'),
      );
    });

    it('should handle service errors when creating learner', async () => {
      const createLearnerDto = {
        appId: 1,
        firstName: 'John',
        lastName: 'Doe',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      };

      const errorMessage = 'Failed to create learner';
      jest
        .spyOn(mockLearnersService, 'create')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.createLearner(createLearnerDto)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('getAllLearners', () => {
    it('should return all learners', async () => {
      const learners = [
        defaultLearner,
        learnerFactory({ id: 2, firstName: 'Jane', lastName: 'Doe' }),
      ];
      jest.spyOn(mockLearnersService, 'findAll').mockResolvedValue(learners);

      const result = await controller.getAllLearners();

      expect(result).toEqual(learners);
      expect(mockLearnersService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no learners exist', async () => {
      jest.spyOn(mockLearnersService, 'findAll').mockResolvedValue([]);

      const result = await controller.getAllLearners();

      expect(result).toEqual([]);
    });

    it('should error out without information loss if the service throws an error', async () => {
      jest
        .spyOn(mockLearnersService, 'findAll')
        .mockRejectedValue(
          new Error('There was a problem retrieving the info'),
        );

      await expect(controller.getAllLearners()).rejects.toThrow(
        `There was a problem retrieving the info`,
      );
    });
  });

  describe('getLearner', () => {
    it('should return a specific learner', async () => {
      jest
        .spyOn(mockLearnersService, 'findOne')
        .mockResolvedValue(defaultLearner);

      const result = await controller.getLearner(1);

      expect(result).toEqual(defaultLearner);
      expect(mockLearnersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw an error if learner is not found', async () => {
      const errorMessage = 'Learner with ID 999 not found';
      jest
        .spyOn(mockLearnersService, 'findOne')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getLearner(999)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateStartDate', () => {
    const updatedStartDate = '2024-02-01';
    const updatedLearner = {
      ...defaultLearner,
      startDate: new Date(updatedStartDate),
    };

    it('should update the start date of a learner', async () => {
      jest
        .spyOn(mockLearnersService, 'updateStartDate')
        .mockResolvedValue(updatedLearner);

      const result = await controller.updateStartDate(1, updatedStartDate);

      expect(result).toEqual(updatedLearner);
      expect(mockLearnersService.updateStartDate).toHaveBeenCalledWith(
        1,
        new Date(updatedStartDate),
      );
    });

    it('should handle service errors when updating start date', async () => {
      const errorMessage = 'Start date must be before end date';
      jest
        .spyOn(mockLearnersService, 'updateStartDate')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.updateStartDate(1, updatedStartDate),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('updateEndDate', () => {
    const updatedEndDate = '2024-07-31';
    const updatedLearner = {
      ...defaultLearner,
      endDate: new Date(updatedEndDate),
    };

    it('should update the end date of a learner', async () => {
      jest
        .spyOn(mockLearnersService, 'updateEndDate')
        .mockResolvedValue(updatedLearner);

      const result = await controller.updateEndDate(1, updatedEndDate);

      expect(result).toEqual(updatedLearner);
      expect(mockLearnersService.updateEndDate).toHaveBeenCalledWith(
        1,
        new Date(updatedEndDate),
      );
    });

    it('should handle service errors when updating end date', async () => {
      const errorMessage = 'End date must be after start date';
      jest
        .spyOn(mockLearnersService, 'updateEndDate')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.updateEndDate(1, updatedEndDate)).rejects.toThrow(
        errorMessage,
      );
    });
  });
});
