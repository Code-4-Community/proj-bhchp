import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import {
  AppStatus,
  InterestArea,
  ApplicantType,
  DesiredExperience,
} from './types';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { EmailService } from '../util/email/email.service';
import { UsersService } from '../users/users.service';

const dummyApplication: Application = {
  appId: 1,
  appStatus: AppStatus.APP_SUBMITTED,
  mondayAvailability: '12pm and on every other week',
  tuesdayAvailability: 'approximately 10am-3pm',
  wednesdayAvailability: 'no availability',
  thursdayAvailability: 'maybe before 10am',
  fridayAvailability: 'Sometime between 4-6',
  saturdayAvailability: 'no availability',
  interest: [InterestArea.WOMENS_HEALTH],
  license: '',
  applicantType: ApplicantType.LEARNER,
  phone: '123-456-7890',
  email: 'test@example.com',
  discipline: DISCIPLINE_VALUES.RN,
  proposedStartDate: new Date('2024-01-01'),
  referred: false,
  weeklyHours: 20,
  pronouns: 'they/them',
  nonEnglishLangs: 'some french, native spanish speaker',
  desiredExperience: DesiredExperience.PRE_LICENSURE_PLACEMENT,
  resume: 'janedoe_resume_2_6_2026.pdf',
  coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '111-111-1111',
  emergencyContactRelationship: 'Mother',
  heardAboutFrom: [],
};

const dummyCreateApplicationDto: CreateApplicationDto = {
  appStatus: AppStatus.APP_SUBMITTED,
  mondayAvailability: '12pm and on every other week',
  tuesdayAvailability: 'approximately 10am-3pm',
  wednesdayAvailability: 'no availability',
  thursdayAvailability: 'maybe before 10am',
  fridayAvailability: 'Sometime between 4-6',
  saturdayAvailability: 'no availability',
  interest: [InterestArea.WOMENS_HEALTH],
  license: '',
  applicantType: ApplicantType.LEARNER,
  phone: '123-456-7890',
  email: 'test@example.com',
  proposedStartDate: '2024-01-01',
  endDate: '2024-06-30',
  discipline: DISCIPLINE_VALUES.RN,
  referred: false,
  weeklyHours: 20,
  pronouns: 'they/them',
  nonEnglishLangs: 'some chinese',
  desiredExperience: DesiredExperience.PRE_LICENSURE_PLACEMENT,
  resume: 'janedoe_resume_2_6_2026.pdf',
  coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '111-111-1111',
  emergencyContactRelationship: 'Mother',
  heardAboutFrom: [],
};
describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repository: Repository<Application>;

  const mockRepository = {
    find: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  const mockEmailService = {
    queueEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockUsersService = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
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
      const mockApplications: Application[] = [dummyApplication];

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

  describe('count endpoints', () => {
    it('should return total applications count', async () => {
      mockRepository.count.mockResolvedValue(298);

      const result = await service.countAll();

      expect(repository.count).toHaveBeenCalledWith();
      expect(result).toBe(298);
    });

    it('should return in-review count', async () => {
      mockRepository.count.mockResolvedValue(52);

      const result = await service.countInReview();

      expect(repository.count).toHaveBeenCalledWith({
        where: { appStatus: AppStatus.IN_REVIEW },
      });
      expect(result).toBe(52);
    });

    it('should return rejected count', async () => {
      mockRepository.count.mockResolvedValue(12);

      const result = await service.countRejected();

      expect(repository.count).toHaveBeenCalledWith({
        where: { appStatus: AppStatus.DECLINED },
      });
      expect(result).toBe(12);
    });

    it('should return approved or active count', async () => {
      mockRepository.count.mockResolvedValue(102);

      const result = await service.countApprovedOrActive();

      expect(repository.count).toHaveBeenCalledWith({
        where: { appStatus: In([AppStatus.ACCEPTED, AppStatus.ACTIVE]) },
      });
      expect(result).toBe(102);
    });

    it('should pass along repository errors for total count', async () => {
      mockRepository.count.mockRejectedValueOnce(new Error('Count failed'));

      await expect(service.countAll()).rejects.toThrow('Count failed');
    });

    it('should pass along repository errors for in-review count', async () => {
      mockRepository.count.mockRejectedValueOnce(new Error('Count failed'));

      await expect(service.countInReview()).rejects.toThrow('Count failed');
    });

    it('should pass along repository errors for rejected count', async () => {
      mockRepository.count.mockRejectedValueOnce(new Error('Count failed'));

      await expect(service.countRejected()).rejects.toThrow('Count failed');
    });

    it('should pass along repository errors for approved or active count', async () => {
      mockRepository.count.mockRejectedValueOnce(new Error('Count failed'));

      await expect(service.countApprovedOrActive()).rejects.toThrow(
        'Count failed',
      );
    });
  });

  describe('findById', () => {
    it('should return a single application', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);

      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(result).toEqual(dummyApplication);
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

    it('should handle returning an application with no changes when optional fields are ommitted', async () => {
      const mockApplication: Application = {
        appId: 1,
        appStatus: AppStatus.APP_SUBMITTED,
        mondayAvailability: '12pm and on every other week',
        tuesdayAvailability: 'approximately 10am-3pm',
        wednesdayAvailability: 'no availability',
        thursdayAvailability: 'maybe before 10am',
        fridayAvailability: 'Sometime between 4-6',
        saturdayAvailability: 'no availability',
        interest: [InterestArea.WOMENS_HEALTH],
        license: '',
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        email: 'test@example.com',
        discipline: DISCIPLINE_VALUES.RN,
        proposedStartDate: new Date('2024-01-01'),
        weeklyHours: 20,
        pronouns: 'they/them',
        nonEnglishLangs: 'none',
        desiredExperience: DesiredExperience.PRE_LICENSURE_PLACEMENT,
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '111-111-1111',
        emergencyContactRelationship: 'Mother',
        heardAboutFrom: [],
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
      const savedApplication: Application = {
        appId: 1,
        ...dummyCreateApplicationDto,
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
        actualStartDate: undefined,
      };

      mockRepository.save.mockResolvedValue(savedApplication);

      const result = await service.create(dummyCreateApplicationDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(savedApplication);
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );
      await expect(service.create(dummyCreateApplicationDto)).rejects.toThrow(
        new Error(`There was a problem retrieving the info`),
      );
    });

    it('should not accept a phone number that is too long', async () => {
      const createApplicationDto: CreateApplicationDto = {
        ...dummyCreateApplicationDto,
        phone: '123-456-78901231',
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
        actualStartDate: undefined,
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept a phone number that is too short', async () => {
      const createApplicationDto: CreateApplicationDto = {
        ...dummyCreateApplicationDto,
        phone: '123-4562',
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        actualStartDate: undefined,
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept a phone number that is the right length but not in ###-###-#### format', async () => {
      const createApplicationDto: CreateApplicationDto = {
        ...dummyCreateApplicationDto,
        phone: '123-456-8-90',
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        actualStartDate: undefined,
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept 0 weekly hours', async () => {
      const createApplicationDto: CreateApplicationDto = {
        ...dummyCreateApplicationDto,
        weeklyHours: 0,
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        actualStartDate: undefined,
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should not accept negative weekly hours', async () => {
      const createApplicationDto: CreateApplicationDto = {
        ...dummyCreateApplicationDto,
        weeklyHours: -5,
      };

      const savedApplication: Application = {
        appId: 1,
        ...createApplicationDto,
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        actualStartDate: undefined,
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      await expect(service.create(createApplicationDto)).rejects.toThrow();
    });

    it('should send an email when creating an application', async () => {
      const savedApplication: Application = {
        appId: 2,
        ...dummyCreateApplicationDto,
        email: 'jane.doe@example.com',
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
        actualStartDate: undefined,
      };

      mockRepository.save.mockResolvedValue(savedApplication);

      const result = await service.create(dummyCreateApplicationDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(savedApplication);
      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        savedApplication.email,
        'Your Application Has Been Received',
        expect.stringContaining('Thank you for submitting'),
      );
    });

    it('should pass along email service errors without information loss', async () => {
      const savedApplication: Application = {
        appId: 3,
        ...dummyCreateApplicationDto,
        email: 'fail@example.com',
        proposedStartDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
        actualStartDate: undefined,
      };

      mockRepository.save.mockResolvedValue(savedApplication);
      mockEmailService.queueEmail.mockRejectedValueOnce(
        new Error('Failed to send email'),
      );

      await expect(service.create(dummyCreateApplicationDto)).rejects.toThrow(
        'Failed to send email',
      );
    });
    it('should not accept weekly hours greater than one week', async () => {
      const createApplicationDto: CreateApplicationDto = {
        ...dummyCreateApplicationDto,
        weeklyHours: 169,
      };

      await expect(service.create(createApplicationDto)).rejects.toThrow(
        'Weekly hours must be greater than 0 and less than 7 * 24 hours',
      );
    });
  });

  describe('update', () => {
    it('should update application status', async () => {
      const updatedApplication: Application = {
        ...dummyApplication,
        appStatus: AppStatus.IN_REVIEW,
        resume: 'janedoe_resume_2_6_2026.pdf',
        coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
      };

      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.update(1, {
        appStatus: AppStatus.IN_REVIEW,
      });

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...dummyApplication,
        appStatus: AppStatus.IN_REVIEW,
      });
      expect(result).toEqual(updatedApplication);
    });

    it('should update application discipline', async () => {
      const updatedApplication: Application = {
        ...dummyApplication,
        interest: [InterestArea.STREET_MEDICINE],
      };

      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.update(1, {
        interest: [InterestArea.STREET_MEDICINE],
      });

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...dummyApplication,
        interest: [InterestArea.STREET_MEDICINE],
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

    it('should pass along any repo errors from retrieval without information loss when saving a new discipline', async () => {
      mockRepository.findOne.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { interest: [InterestArea.STREET_MEDICINE] }),
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

    it('should pass along any repo errors from saving the new info without information loss when saving a new discipline', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { interest: [InterestArea.STREET_MEDICINE] }),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });

    it('should pass along any repo errors from saving the new info without information loss when saving a new application status', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.update(1, { appStatus: AppStatus.IN_REVIEW }),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });
  });

  describe('updateProposedStartDate', () => {
    const updatedproposedStartDate = new Date('2024-02-01');

    it('should update application start date', async () => {
      const updatedApplication: Application = {
        ...dummyApplication,
        proposedStartDate: updatedproposedStartDate,
      };

      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.updateProposedStartDate(
        1,
        updatedproposedStartDate,
      );

      expect(result).toEqual(updatedApplication);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...dummyApplication,
        proposedStartDate: updatedproposedStartDate,
      });
    });

    it('should throw error if application is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProposedStartDate(999, updatedproposedStartDate),
      ).rejects.toThrow('Application with ID 999 not found');
    });

    it('should throw error if start date is after end date', async () => {
      const existingWithEarlierEndDate: Application = {
        ...dummyApplication,
        endDate: new Date('2024-01-15'),
      };
      mockRepository.findOne.mockResolvedValue(existingWithEarlierEndDate);

      await expect(
        service.updateProposedStartDate(1, updatedproposedStartDate),
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should throw error if no start date provided', async () => {
      await expect(service.updateProposedStartDate(1, null)).rejects.toThrow(
        'Start date is required',
      );
    });

    it('should throw error if application id is missing', async () => {
      await expect(
        service.updateProposedStartDate(0, updatedproposedStartDate),
      ).rejects.toThrow('Application ID is required');
    });

    it('should throw error if start date is invalid', async () => {
      await expect(
        service.updateProposedStartDate(1, new Date('not-a-date')),
      ).rejects.toThrow('Start date must be a valid date');
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.updateProposedStartDate(999, updatedproposedStartDate),
      ).rejects.toThrow('There was a problem retrieving the info');
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the info'),
      );

      await expect(
        service.updateProposedStartDate(1, updatedproposedStartDate),
      ).rejects.toThrow('There was a problem saving the info');
    });
  });

  describe('updateActualStartDate', () => {
    const updatedproposedStartDate = new Date('2024-02-01');

    it('should update application start date', async () => {
      const updatedApplication: Application = {
        ...dummyApplication,
        proposedStartDate: updatedproposedStartDate,
      };

      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.updateActualStartDate(
        1,
        updatedproposedStartDate,
      );

      expect(result).toEqual(updatedApplication);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...dummyApplication,
        proposedStartDate: updatedproposedStartDate,
      });
    });

    it('should throw error if application is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateActualStartDate(999, updatedproposedStartDate),
      ).rejects.toThrow('Application with ID 999 not found');
    });

    it('should throw error if start date is after end date', async () => {
      const existingWithEarlierEndDate: Application = {
        ...dummyApplication,
        endDate: new Date('2024-01-15'),
      };
      mockRepository.findOne.mockResolvedValue(existingWithEarlierEndDate);

      await expect(
        service.updateActualStartDate(1, updatedproposedStartDate),
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should throw error if no start date provided', async () => {
      await expect(service.updateActualStartDate(1, null)).rejects.toThrow(
        'Start date is required',
      );
    });

    it('should throw error if application id is missing', async () => {
      await expect(
        service.updateActualStartDate(0, updatedproposedStartDate),
      ).rejects.toThrow('Application ID is required');
    });

    it('should throw error if start date is invalid', async () => {
      await expect(
        service.updateActualStartDate(1, new Date('not-a-date')),
      ).rejects.toThrow('Start date must be a valid date');
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.updateActualStartDate(999, updatedproposedStartDate),
      ).rejects.toThrow('There was a problem retrieving the info');
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the info'),
      );

      await expect(
        service.updateActualStartDate(1, updatedproposedStartDate),
      ).rejects.toThrow('There was a problem saving the info');
    });
  });

  describe('updateEndDate', () => {
    const updatedEndDate = new Date('2024-07-31');

    it('should update application end date', async () => {
      const updatedApplication: Application = {
        ...dummyApplication,
        endDate: updatedEndDate,
      };

      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.updateEndDate(1, updatedEndDate);

      expect(result).toEqual(updatedApplication);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...dummyApplication,
        endDate: updatedEndDate,
      });
    });

    it('should throw error if application is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateEndDate(999, updatedEndDate)).rejects.toThrow(
        'Application with ID 999 not found',
      );
    });

    it('should throw error if end date is before start date', async () => {
      const existingWithLaterStart: Application = {
        ...dummyApplication,
        proposedStartDate: new Date('2024-08-15'),
      };
      mockRepository.findOne.mockResolvedValue(existingWithLaterStart);

      await expect(service.updateEndDate(1, updatedEndDate)).rejects.toThrow(
        'End date must be after start date',
      );
    });

    it('should throw error if no end date provided', async () => {
      await expect(service.updateEndDate(1, null)).rejects.toThrow(
        'End date is required',
      );
    });

    it('should throw error if application id is missing', async () => {
      await expect(service.updateEndDate(0, updatedEndDate)).rejects.toThrow(
        'Application ID is required',
      );
    });

    it('should throw error if end date is invalid', async () => {
      await expect(
        service.updateEndDate(1, new Date('not-a-date')),
      ).rejects.toThrow('End date must be a valid date');
    });

    it('should error out without information loss if the repository throws an error during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.updateEndDate(999, updatedEndDate)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });

    it('should error out without information loss if the repository throws an error during save', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the info'),
      );

      await expect(service.updateEndDate(1, updatedEndDate)).rejects.toThrow(
        'There was a problem saving the info',
      );
    });
  });

  describe('delete', () => {
    it('should delete an application', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);

      await service.delete(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.remove).toHaveBeenCalledWith(dummyApplication);
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

    it('should pass along repository remove errors during delete', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.remove.mockRejectedValueOnce(
        new Error('There was a problem removing the info'),
      );

      await expect(service.delete(1)).rejects.toThrow(
        'There was a problem removing the info',
      );
    });
  });

  describe('findByDiscipline', () => {
    it('should return applications with the specified discipline', async () => {
      const mockApplications: Application[] = [
        {
          appId: 1,
          appStatus: AppStatus.APP_SUBMITTED,
          mondayAvailability: '12pm and on every other week',
          tuesdayAvailability: 'approximately 10am-3pm',
          wednesdayAvailability: 'no availability',
          thursdayAvailability: 'maybe before 10am',
          fridayAvailability: 'Sometime between 4-6',
          saturdayAvailability: 'no availability',
          interest: [InterestArea.WOMENS_HEALTH],
          license: '',
          proposedStartDate: new Date('2025-11-12'),
          applicantType: ApplicantType.LEARNER,
          phone: '123-456-7890',
          email: 'test@example.com',
          discipline: DISCIPLINE_VALUES.RN,
          referred: false,
          weeklyHours: 20,
          pronouns: 'they/them',
          nonEnglishLangs: 'some french, native spanish speaker',
          desiredExperience: DesiredExperience.PRE_LICENSURE_PLACEMENT,
          resume: 'janedoe_resume_2_6_2026.pdf',
          coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
          emergencyContactName: 'Jane Doe',
          emergencyContactPhone: '111-111-1111',
          emergencyContactRelationship: 'Mother',
          heardAboutFrom: [],
        },
        {
          appId: 2,
          appStatus: AppStatus.IN_REVIEW,
          mondayAvailability: '12pm and on every other week',
          tuesdayAvailability: 'approximately 10am-3pm',
          wednesdayAvailability: 'no availability',
          thursdayAvailability: 'maybe before 10am',
          fridayAvailability: 'Sometime between 4-6',
          saturdayAvailability: 'no availability',
          interest: [InterestArea.WOMENS_HEALTH],
          proposedStartDate: new Date('2025-11-12'),
          license: '',
          applicantType: ApplicantType.LEARNER,
          phone: '123-456-7890',
          email: 'test@example.com',
          discipline: DISCIPLINE_VALUES.RN,
          referred: false,
          weeklyHours: 20,
          pronouns: 'they/them',
          nonEnglishLangs: 'some french, native spanish speaker',
          desiredExperience: DesiredExperience.PRE_LICENSURE_PLACEMENT,
          resume: 'janedoe_resume_2_6_2026.pdf',
          coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
          emergencyContactName: 'Jane Doe',
          emergencyContactPhone: '111-111-1111',
          emergencyContactRelationship: 'Mother',
          heardAboutFrom: [],
        },
      ];

      mockRepository.find.mockResolvedValue(mockApplications);

      const result = await service.findByDiscipline(DISCIPLINE_VALUES.RN);

      expect(repository.find).toHaveBeenCalledWith({
        where: { discipline: DISCIPLINE_VALUES.RN },
      });
      expect(result).toEqual(mockApplications);
    });

    it('should return an empty array when no applications match the discipline', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByDiscipline(DISCIPLINE_VALUES.RN);

      expect(repository.find).toHaveBeenCalledWith({
        where: { discipline: DISCIPLINE_VALUES.RN },
      });
      expect(result).toEqual([]);
    });

    it('should throw BadRequestException for invalid discipline', async () => {
      const invalidDiscipline = 'InvalidDiscipline';

      await expect(service.findByDiscipline(invalidDiscipline)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            `Invalid discipline: ${invalidDiscipline}`,
          ),
        }),
      );

      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with list of valid disciplines', async () => {
      const invalidDiscipline = 'InvalidDiscipline';

      try {
        await service.findByDiscipline(invalidDiscipline);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error.message).toContain('Invalid discipline');
        expect(error.message).toContain('Valid disciplines are:');
        expect(error.message).toContain('MD/Medical Student/Pre-Med');
        expect(error.message).toContain('Medical NP/PA');
        expect(error.message).toContain('Psychiatry or Psychiatric NP/PA');
        expect(error.message).toContain('Public Health');
        expect(error.message).toContain('RN');
        expect(error.message).toContain('Social Work');
        expect(error.message).toContain('Other');
      }

      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.find.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(
        service.findByDiscipline(DISCIPLINE_VALUES.RN),
      ).rejects.toThrow(`There was a problem retrieving the info`);
    });

    it('should work with all valid discipline values', async () => {
      const allDisciplines = Object.values(DISCIPLINE_VALUES);

      for (const discipline of allDisciplines) {
        mockRepository.find.mockResolvedValue([]);

        await service.findByDiscipline(discipline);

        expect(repository.find).toHaveBeenCalledWith({
          where: { discipline },
        });
      }
    });
  });

  describe('updateStatus', () => {
    it('should update the application status and return the updated application', async () => {
      const updatedApplication: Application = {
        ...dummyApplication,
        appStatus: AppStatus.ACCEPTED,
      };

      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.updateStatus(1, AppStatus.ACCEPTED);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { appId: 1 } });
      expect(repository.save).toHaveBeenCalledWith({
        ...dummyApplication,
        appStatus: AppStatus.ACCEPTED,
      });
      expect(result).toEqual(updatedApplication);
    });

    it('should send an email when status is updated to ACCEPTED', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.ACCEPTED,
      });

      await service.updateStatus(1, AppStatus.ACCEPTED);

      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        dummyApplication.email,
        'Your Application Has Been Updated',
        expect.stringContaining('Congratulations'),
      );
    });

    it('should send an email when status is updated to DECLINED', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.DECLINED,
      });

      await service.updateStatus(1, AppStatus.DECLINED);

      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        dummyApplication.email,
        'Your Application Has Been Updated',
        expect.stringContaining('not been accepted'),
      );
    });

    it('should send an email when status is updated to NO_AVAILABILITY', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.NO_AVAILABILITY,
      });

      await service.updateStatus(1, AppStatus.NO_AVAILABILITY);

      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        dummyApplication.email,
        'Your Application Has Been Updated',
        expect.stringContaining('no availability'),
      );
    });

    it('should not send an email when status is updated to IN_REVIEW', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.IN_REVIEW,
      });

      await service.updateStatus(1, AppStatus.IN_REVIEW);

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
    });

    it('should not send an email when status is updated to ACTIVE', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.ACTIVE,
      });

      await service.updateStatus(1, AppStatus.ACTIVE);

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when application is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(999, AppStatus.ACCEPTED),
      ).rejects.toThrow('Application with ID 999 not found');

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
    });

    it('should pass along repo errors during retrieval without information loss', async () => {
      mockRepository.findOne.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.updateStatus(1, AppStatus.ACCEPTED)).rejects.toThrow(
        'There was a problem retrieving the info',
      );

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
    });

    it('should pass along repo errors during save without information loss', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockRejectedValue(
        new Error('There was a problem saving the info'),
      );

      await expect(service.updateStatus(1, AppStatus.ACCEPTED)).rejects.toThrow(
        'There was a problem saving the info',
      );

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
    });

    it('should pass along email service errors without information loss', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.ACCEPTED,
      });
      mockEmailService.queueEmail.mockRejectedValueOnce(
        new Error('Failed to send email'),
      );

      await expect(service.updateStatus(1, AppStatus.ACCEPTED)).rejects.toThrow(
        'Failed to send email',
      );
    });

    it('should use the database user name in title case when available', async () => {
      mockRepository.findOne.mockResolvedValue(dummyApplication);
      mockRepository.save.mockResolvedValue({
        ...dummyApplication,
        appStatus: AppStatus.ACCEPTED,
      });
      mockUsersService.findOne.mockResolvedValueOnce({
        email: dummyApplication.email,
        firstName: 'jANE',
        lastName: 'doE',
        userType: 'STANDARD',
      });

      await service.updateStatus(1, AppStatus.ACCEPTED);

      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        dummyApplication.email,
        'Your Application Has Been Updated',
        expect.stringContaining('Hello Jane Doe'),
      );
    });
  });

  describe('private helpers', () => {
    it('should validate application dto phone and hours', () => {
      expect(() =>
        (
          service as unknown as {
            validateApplicationDto: (dto: CreateApplicationDto) => void;
          }
        ).validateApplicationDto(dummyCreateApplicationDto),
      ).not.toThrow();
    });

    it('should throw for invalid private application dto validation', () => {
      expect(() =>
        (
          service as unknown as {
            validateApplicationDto: (dto: CreateApplicationDto) => void;
          }
        ).validateApplicationDto({
          ...dummyCreateApplicationDto,
          phone: 'bad-phone',
        }),
      ).toThrow('Phone number must be in ###-###-#### format');
    });

    it('should validate private discipline helper', () => {
      expect(() =>
        (
          service as unknown as {
            validateDiscipline: (discipline: string) => void;
          }
        ).validateDiscipline(DISCIPLINE_VALUES.RN),
      ).not.toThrow();
    });

    it('should throw for invalid private discipline helper input', () => {
      expect(() =>
        (
          service as unknown as {
            validateDiscipline: (discipline: string) => void;
          }
        ).validateDiscipline('Invalid'),
      ).toThrow('Invalid discipline: Invalid');
    });

    it('should build and escape the submission error email body', () => {
      const result = (
        service as unknown as {
          buildApplicationSubmissionErrorEmailBody: (
            applicantName: string,
            applicantDto: CreateApplicationDto,
            errorMessage: string,
            pandaDocLink: string,
          ) => string;
        }
      ).buildApplicationSubmissionErrorEmailBody(
        'Jane Applicant',
        {
          ...dummyCreateApplicationDto,
          emergencyContactName: '<script>alert("x")</script>',
        },
        'Bad field: <invalid>',
        'https://example.com/form?x=<bad>',
      );

      expect(result).toContain('Hello Jane Applicant');
      expect(result).toContain('Bad field: &lt;invalid&gt;');
      expect(result).toContain('&lt;script&gt;alert(');
      expect(result).toContain('&lt;/script&gt;');
      expect(result).toContain('href="https://example.com/form?x=&lt;bad&gt;"');
    });
  });
});
