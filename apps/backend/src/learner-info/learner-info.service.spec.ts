import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearnerInfoService } from './learner-info.service';
import { LearnerInfo } from './learner-info.entity';
import { School } from './types';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LearnerInfoService', () => {
  let service: LearnerInfoService;
  let repository: Repository<LearnerInfo>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearnerInfoService,
        {
          provide: getRepositoryToken(LearnerInfo),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LearnerInfoService>(LearnerInfoService);
    repository = module.get<Repository<LearnerInfo>>(
      getRepositoryToken(LearnerInfo),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new learner info', async () => {
      const LearnerInfo: LearnerInfo = {
        appId: 0,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockRepository.save.mockResolvedValue(LearnerInfo);

      const result = await service.create(LearnerInfo);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(LearnerInfo);
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );
      const LearnerInfo: LearnerInfo = {
        appId: 0,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      await expect(service.create(LearnerInfo)).rejects.toThrow(
        new Error(`There was a problem retrieving the info`),
      );
    });

    it('should not accept negative appId', async () => {
      const LearnerInfo: LearnerInfo = {
        appId: -1,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockRepository.save.mockResolvedValue(LearnerInfo);
      await expect(service.create(LearnerInfo)).rejects.toThrow();
    });

    it('should reject duplicate appId', async () => {
      const LearnerInfo: LearnerInfo = {
        appId: 2,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockRepository.findOne.mockResolvedValue(LearnerInfo);

      await expect(service.create(LearnerInfo)).rejects.toThrow(
        new BadRequestException(
          `Learner Info with AppId ${LearnerInfo.appId} already exists`,
        ),
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { appId: LearnerInfo.appId },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a single application', async () => {
      const LearnerInfo: LearnerInfo = {
        appId: 1,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockRepository.findOne.mockResolvedValue(LearnerInfo);

      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(result).toEqual(LearnerInfo);
    });

    it('should throw NotFoundException when application is not found', async () => {
      const nonExistentId = 999;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(nonExistentId)).rejects.toThrow(
        new NotFoundException(
          `Learner Info with AppId ${nonExistentId} not found`,
        ),
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { appId: nonExistentId },
      });
    });

    it('should throw BadRequestException when appId is missing', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(undefined as never)).rejects.toThrow(
        new BadRequestException('Learner info ID is required'),
      );
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.findOne.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.findById(1)).rejects.toThrow(
        new Error(`There was a problem retrieving the info`),
      );
    });
  });
});
