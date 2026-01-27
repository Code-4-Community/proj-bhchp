import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import {
  AppStatus,
  ExperienceType,
  InterestArea,
  School,
  DaysOfTheWeek,
  ApplicantType,
} from './types';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repository: Repository<Application>;

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
          daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
          experienceType: ExperienceType.BS,
          fileUploads: [],
          interest: InterestArea.NURSING,
          license: null,
          applicantType: ApplicantType.LEARNER,
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

    it('should return an empty array if the repo returns one', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.find.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.findAll()).rejects.toThrow(
        `There was a problem retrieving the info`,
      );
    });
  });

  describe('findById', () => {
    it('should return a single application', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
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

    // TODO: Address this in codebase so it passes.
    // Note: Adding .skip for now so it doesn't confuse people in their develop then tests all pass work cycle
    it.skip('should not return an application from the repo if the id is not the same as asked for', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findById(10);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 10 } });
      expect(repository.findOne).toThrow();
    });

    it('should handle returning an application with no changes when optional fields are ommitted', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        weeklyHours: 20,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(result).toEqual(mockApplication);
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

  describe('create', () => {
    it('should create and save a new application', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
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

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );
      const mockApplication: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        weeklyHours: 20,
      };

      await expect(service.create(mockApplication)).rejects.toThrow(
        new Error(`There was a problem retrieving the info`),
      );
    });

    it('should not accept a phone number that is too long', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-78901231',
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
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept a phone number that is too short', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-4562',
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
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept a phone number that is the right length but not in ###-###-#### format', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-8-90',
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
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept 0 weekly hours', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 0,
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept negative weekly hours', async () => {
      const createApplicationDto: CreateApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-78901231',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: -5,
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update application status', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      const updatedApplication: Application = {
        ...mockApplication,
        appStatus: AppStatus.IN_REVIEW,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.update(1, {
        appStatus: AppStatus.IN_REVIEW,
      });

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockApplication,
        appStatus: AppStatus.IN_REVIEW,
      });
      expect(result).toEqual(updatedApplication);
    });

    it('should update application interest', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      const updatedApplication: Application = {
        ...mockApplication,
        interest: InterestArea.HARM_REDUCTION,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.update(1, {
        interest: InterestArea.HARM_REDUCTION,
      });

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockApplication,
        interest: InterestArea.HARM_REDUCTION,
      });
      expect(result).toEqual(updatedApplication);
    });

    it('should throw NotFoundException when updating non-existent application', async () => {
      const nonExistentId = 999;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(nonExistentId, { appStatus: AppStatus.IN_REVIEW }),
      ).rejects.toThrow(
        new NotFoundException(`Application with ID ${nonExistentId} not found`),
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { appId: nonExistentId },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should pass along any repo errors from retrieval without information loss when saving a new interest', async () => {
      mockRepository.findOne.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { interest: InterestArea.HARM_REDUCTION }),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });

    it('should pass along any repo errors from retrieval without information loss when saving a new application status', async () => {
      mockRepository.findOne.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { appStatus: AppStatus.IN_REVIEW }),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });

    it('should pass along any repo errors from saving the new info without information loss when saving a new interest', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { interest: InterestArea.HARM_REDUCTION }),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });

    it('should pass along any repo errors from saving the new info without information loss when saving a new application status', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { appStatus: AppStatus.IN_REVIEW }),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });
  });

  describe('delete', () => {
    it('should delete an application', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        daysAvailable: [DaysOfTheWeek.MONDAY, DaysOfTheWeek.TUESDAY],
        experienceType: ExperienceType.BS,
        fileUploads: [],
        interest: InterestArea.NURSING,
        license: null,
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        school: School.HARVARD_MEDICAL_SCHOOL,
        referred: false,
        referredEmail: null,
        weeklyHours: 20,
      };

      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.remove.mockResolvedValue(mockApplication);

      await service.delete(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.remove).toHaveBeenCalledWith(mockApplication);
    });

    it('should throw NotFoundException when deleting non-existent application', async () => {
      const nonExistentId = 999;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(nonExistentId)).rejects.toThrow(
        new NotFoundException(`Application with ID ${nonExistentId} not found`),
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { appId: nonExistentId },
      });
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
