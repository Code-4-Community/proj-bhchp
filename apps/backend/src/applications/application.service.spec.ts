import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import { AppStatus, ExperienceType, InterestArea, School } from './types';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repository: Repository<Application>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    repository = module.get<Repository<Application>>(
      getRepositoryToken(Application),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of applications', async () => {
      const mockApplications: Application[] = [
        {
          appId: 1,
          appStatus: AppStatus.APP_SUBMITTED,
          daysAvailable: 'Monday, Tuesday',
          experienceType: ExperienceType.BS,
          fileUploads: [],
          interest: InterestArea.NURSING,
          license: null,
          isInternational: false,
          isLearner: false,
          phone: '123-456-7890',
          school: School.HARVARD_MEDICAL_SCHOOL,
          referred: false,
          referredEmail: null,
          weeklyHours: 20,
        },
      ];

      mockRepository.find.mockResolvedValue(mockApplications);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(mockApplications);
    });
  });

  describe('findById', () => {
    it('should return a single application', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: 'Monday, Tuesday',
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        isInternational: false,
        isLearner: false,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(result).toEqual(mockApplication);
    });

    it('should throw NotFoundException when application is not found', async () => {
      const nonExistentId = 999;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(nonExistentId)).rejects.toThrow(
        new NotFoundException(`Application with ID ${nonExistentId} not found`),
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { appId: nonExistentId },
      });
    });
  });

  describe('create', () => {
    it('should create and save a new application', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: 'Monday, Tuesday',
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        isInternational: false,
        isLearner: false,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
      };

      mockRepository.save.mockResolvedValue(savedApplication);

      const result = await service.create(createApplicationDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(savedApplication);
    });
  });
});
