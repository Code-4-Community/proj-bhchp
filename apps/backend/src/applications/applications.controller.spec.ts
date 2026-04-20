import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import {
  AppStatus,
  InterestArea,
  ApplicantType,
  DesiredExperience,
} from './types';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';
import { EmailService } from '../util/email/email.service';
import { ApplicationValidationEmailFilter } from './filters/application-validation-email.filter';
import { ApplicationCreationErrorFilter } from './filters/application-creation-validation.filter';
import { NotFoundException } from '@nestjs/common';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { UserType } from '../users/types';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-2',
      bucket: 'bucket',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
}));

const mockEmailService = {
  queueEmail: jest.fn().mockResolvedValue(undefined),
};

const mockApplicationsService: Partial<ApplicationsService> = {
  findAll: jest.fn(),
  countAll: jest.fn(),
  countInReview: jest.fn(),
  countRejected: jest.fn(),
  countApprovedOrActive: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
  findByDiscipline: jest.fn(),
  updateProposedStartDate: jest.fn(),
  updateActualStartDate: jest.fn(),
  updateEndDate: jest.fn(),
  getConfidentialityTemplateUrl: jest.fn(),
  getConfidentialityForm: jest.fn(),
  uploadConfidentialityForm: jest.fn(),
};

const mockRolesGuard = {
  canActivate: jest.fn(() => true),
};

const mockUsersService = {
  findOne: jest.fn(),
};

const mockCandidateInfoService = {
  findOne: jest.fn(),
  findByApplicationId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

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
  license: 'n/a',
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
  confidentialityForm: undefined,
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '111-111-1111',
  emergencyContactRelationship: 'Mother',
  heardAboutFrom: [],
  proposedStartDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'),
};

function createMockHttpHost(body: Record<string, unknown> | undefined) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { body };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
  return { host, json, status };
}

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: CandidateInfoService,
          useValue: mockCandidateInfoService,
        },
        ApplicationValidationEmailFilter,
        ApplicationCreationErrorFilter,
      ],
    }).compile();

    controller = testingModule.get<ApplicationsController>(
      ApplicationsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApplication exception filters', () => {
    let validationEmailFilter: ApplicationValidationEmailFilter;
    let creationErrorFilter: ApplicationCreationErrorFilter;

    beforeEach(() => {
      validationEmailFilter = testingModule.get(
        ApplicationValidationEmailFilter,
      );
      creationErrorFilter = testingModule.get(ApplicationCreationErrorFilter);
    });

    it('ApplicationValidationEmailFilter sends email and returns 400 body when ValidationPipe-style BadRequestException is caught', async () => {
      const payload = {
        email: 'applicant@example.com',
        appStatus: 'invalid',
      };
      const { host, json, status } = createMockHttpHost(payload);
      const exceptionResponse = {
        message: ['appStatus must be one of the following values: x'],
        error: 'Bad Request',
        statusCode: 400,
      };
      const exception = new BadRequestException(exceptionResponse);

      await validationEmailFilter.catch(exception, host);

      expect(mockEmailService.queueEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        'applicant@example.com',
        'Action Required: Issue with Your Application Submission',
        expect.stringContaining('Hello Applicant'),
      );
      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        'applicant@example.com',
        'Action Required: Issue with Your Application Submission',
        expect.stringContaining('Application Status'),
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(exceptionResponse);
    });

    it('ApplicationValidationEmailFilter skips email when request body has no email', async () => {
      const { host, json, status } = createMockHttpHost({ appStatus: 'bad' });
      const exceptionResponse = {
        message: ['appStatus must be valid'],
        error: 'Bad Request',
        statusCode: 400,
      };
      const exception = new BadRequestException(exceptionResponse);

      await validationEmailFilter.catch(exception, host);

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(exceptionResponse);
    });

    it('ApplicationCreationErrorFilter sends generic email and returns 500 for non-BadRequest errors', async () => {
      const payload = { email: 'applicant@example.com' };
      const { host, json, status } = createMockHttpHost(payload);

      await creationErrorFilter.catch(new Error('database unavailable'), host);

      expect(mockEmailService.queueEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
        'applicant@example.com',
        'Issue with Your Application Submission',
        expect.stringContaining('unexpected issue'),
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        message:
          'An unexpected error occurred while processing your application.',
        statusCode: 500,
      });
    });

    it('ApplicationCreationErrorFilter skips email when body has no email', async () => {
      const { host, json, status } = createMockHttpHost({});

      await creationErrorFilter.catch(new Error('fail'), host);

      expect(mockEmailService.queueEmail).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        message:
          'An unexpected error occurred while processing your application.',
        statusCode: 500,
      });
    });
  });

  describe('count endpoints', () => {
    it('should return total applications count', async () => {
      jest.spyOn(mockApplicationsService, 'countAll').mockResolvedValue(298);

      const result = await controller.getTotalApplicationsCount();

      expect(result).toEqual({ count: 298 });
      expect(mockApplicationsService.countAll).toHaveBeenCalled();
    });

    it('should return in-review applications count', async () => {
      jest
        .spyOn(mockApplicationsService, 'countInReview')
        .mockResolvedValue(52);

      const result = await controller.getInReviewApplicationsCount();

      expect(result).toEqual({ count: 52 });
      expect(mockApplicationsService.countInReview).toHaveBeenCalled();
    });

    it('should return rejected applications count', async () => {
      jest
        .spyOn(mockApplicationsService, 'countRejected')
        .mockResolvedValue(12);

      const result = await controller.getRejectedApplicationsCount();

      expect(result).toEqual({ count: 12 });
      expect(mockApplicationsService.countRejected).toHaveBeenCalled();
    });

    it('should return approved applications count', async () => {
      jest
        .spyOn(mockApplicationsService, 'countApprovedOrActive')
        .mockResolvedValue(102);

      const result = await controller.getApprovedApplicationsCount();

      expect(result).toEqual({ count: 102 });
      expect(mockApplicationsService.countApprovedOrActive).toHaveBeenCalled();
    });
  });

  describe('getAllApplications', () => {
    it('should return all applications', async () => {
      jest
        .spyOn(mockApplicationsService, 'findAll')
        .mockResolvedValue([mockApplication]);

      await expect(controller.getAllApplications()).resolves.toEqual([
        mockApplication,
      ]);
      expect(mockApplicationsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should pass along service errors without information loss', async () => {
      jest
        .spyOn(mockApplicationsService, 'findAll')
        .mockRejectedValue(
          new Error('There was a problem retrieving the info'),
        );

      await expect(controller.getAllApplications()).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('getApplicationsByDiscipline', () => {
    it('should return applications with the specified discipline', async () => {
      const mockApplications: Application[] = [
        mockApplication,
        {
          ...mockApplication,
          appId: 2,
          email: 'test2@example.com',
        },
      ];

      jest
        .spyOn(mockApplicationsService, 'findByDiscipline')
        .mockResolvedValue(mockApplications);

      const result = await controller.getApplicationsByDiscipline(
        DISCIPLINE_VALUES.RN,
      );

      expect(result).toEqual(mockApplications);
      expect(mockApplicationsService.findByDiscipline).toHaveBeenCalledWith(
        DISCIPLINE_VALUES.RN,
      );
    });

    it('should return an empty array when no applications match the discipline', async () => {
      jest
        .spyOn(mockApplicationsService, 'findByDiscipline')
        .mockResolvedValue([]);

      const result = await controller.getApplicationsByDiscipline(
        DISCIPLINE_VALUES.RN,
      );

      expect(result).toEqual([]);
      expect(mockApplicationsService.findByDiscipline).toHaveBeenCalledWith(
        DISCIPLINE_VALUES.RN,
      );
    });

    it('should throw BadRequestException for invalid discipline', async () => {
      const invalidDiscipline = 'InvalidDiscipline';
      const errorMessage = `Invalid discipline: ${invalidDiscipline}. Valid disciplines are: ${Object.values(
        DISCIPLINE_VALUES,
      ).join(', ')}`;

      jest
        .spyOn(mockApplicationsService, 'findByDiscipline')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(
        controller.getApplicationsByDiscipline(invalidDiscipline),
      ).rejects.toThrow(BadRequestException);

      expect(mockApplicationsService.findByDiscipline).toHaveBeenCalledWith(
        invalidDiscipline,
      );
    });

    it('should pass along service errors without information loss', async () => {
      const errorMessage = 'There was a problem retrieving the info';

      jest
        .spyOn(mockApplicationsService, 'findByDiscipline')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.getApplicationsByDiscipline(DISCIPLINE_VALUES.RN),
      ).rejects.toThrow(errorMessage);

      expect(mockApplicationsService.findByDiscipline).toHaveBeenCalledWith(
        DISCIPLINE_VALUES.RN,
      );
    });

    it('should work with all valid discipline values', async () => {
      const allDisciplines = Object.values(DISCIPLINE_VALUES);

      for (const discipline of allDisciplines) {
        jest
          .spyOn(mockApplicationsService, 'findByDiscipline')
          .mockResolvedValue([]);

        await controller.getApplicationsByDiscipline(discipline);

        expect(mockApplicationsService.findByDiscipline).toHaveBeenCalledWith(
          discipline,
        );
      }
    });
  });

  describe('getApplicationById', () => {
    it('should return an application for an admin user', async () => {
      jest
        .spyOn(mockApplicationsService, 'findById')
        .mockResolvedValue(mockApplication);

      await expect(
        controller.getApplicationById(1, {
          user: { email: 'admin@example.com', userType: UserType.ADMIN },
        }),
      ).resolves.toEqual(mockApplication);
      expect(mockApplicationsService.findById).toHaveBeenCalledWith(1);
    });

    it('should return an application for the matching standard user', async () => {
      jest
        .spyOn(mockApplicationsService, 'findById')
        .mockResolvedValue(mockApplication);

      await expect(
        controller.getApplicationById(1, {
          user: { email: 'test@example.com', userType: UserType.STANDARD },
        }),
      ).resolves.toEqual(mockApplication);
      expect(mockApplicationsService.findById).toHaveBeenCalledWith(1);
    });

    it('should throw ForbiddenException when a standard user requests another user application', async () => {
      jest
        .spyOn(mockApplicationsService, 'findById')
        .mockResolvedValue(mockApplication);

      await expect(
        controller.getApplicationById(1, {
          user: { email: 'other@example.com', userType: UserType.STANDARD },
        }),
      ).rejects.toThrow(
        'Standard users can only access their own application.',
      );
    });

    it('should pass through service errors from findById', async () => {
      jest
        .spyOn(mockApplicationsService, 'findById')
        .mockRejectedValue(
          new NotFoundException('Application with ID 99 not found'),
        );

      await expect(
        controller.getApplicationById(99, {
          user: { email: 'admin@example.com', userType: UserType.ADMIN },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createApplication', () => {
    it('should create an application', async () => {
      const createApplicationDto = {
        appStatus: AppStatus.APP_SUBMITTED,
        mondayAvailability: 'monday',
        tuesdayAvailability: 'tuesday',
        wednesdayAvailability: 'wednesday',
        thursdayAvailability: 'thursday',
        fridayAvailability: 'friday',
        saturdayAvailability: 'saturday',
        interest: [InterestArea.WOMENS_HEALTH],
        license: 'n/a',
        applicantType: ApplicantType.LEARNER,
        phone: '123-456-7890',
        email: 'test@example.com',
        discipline: DISCIPLINE_VALUES.RN,
        proposedStartDate: '2024-01-01',
        referred: false,
        weeklyHours: 20,
        pronouns: 'they/them',
        desiredExperience: DesiredExperience.VOLUNTEER_INTERN,
        resume: 'resume.pdf',
        coverLetter: 'cover.pdf',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '111-111-1111',
        emergencyContactRelationship: 'Mother',
        heardAboutFrom: [],
      };

      jest
        .spyOn(mockApplicationsService, 'create')
        .mockResolvedValue(mockApplication);

      await expect(
        controller.createApplication(createApplicationDto as never),
      ).resolves.toEqual(mockApplication);
      expect(mockApplicationsService.create).toHaveBeenCalledWith(
        createApplicationDto,
      );
    });

    it('should pass along service errors while creating an application', async () => {
      jest
        .spyOn(mockApplicationsService, 'create')
        .mockRejectedValue(new Error('Failed to create application'));

      await expect(controller.createApplication({} as never)).rejects.toThrow(
        'Failed to create application',
      );
    });
  });

  /**
   * Tests for PATCH /:appId/discipline (updateApplicationDiscipline).
   * Verifies that the controller delegates to the service and returns or throws as documented.
   */
  describe('updateApplicationDiscipline', () => {
    /**
     * When the service returns an updated application, the controller should return that same application.
     */
    it('should return the updated application when discipline is updated successfully', async () => {
      const updateDisciplineDto = {
        discipline: DISCIPLINE_VALUES.PublicHealth,
      };
      const updatedApplication: Application = {
        ...mockApplication,
        discipline: DISCIPLINE_VALUES.PublicHealth,
      };

      jest
        .spyOn(mockApplicationsService, 'update')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationDiscipline(
        1,
        updateDisciplineDto,
      );

      expect(result).toEqual(updatedApplication);
      expect(mockApplicationsService.update).toHaveBeenCalledWith(1, {
        discipline: DISCIPLINE_VALUES.PublicHealth,
      });
    });

    /**
     * The returned application's discipline field must equal the discipline sent in the request (discipline is changeable).
     */
    it('should return an application whose discipline field equals the requested discipline', async () => {
      const requestedDiscipline = DISCIPLINE_VALUES.PublicHealth;
      const updateDisciplineDto = { discipline: requestedDiscipline };
      const updatedApplication: Application = {
        ...mockApplication,
        discipline: requestedDiscipline,
      };

      jest
        .spyOn(mockApplicationsService, 'update')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationDiscipline(
        1,
        updateDisciplineDto,
      );

      expect(result.discipline).toBe(requestedDiscipline);
      expect(result.discipline).not.toBe(mockApplication.discipline);
    });

    /**
     * The controller should call the service with the application id and the discipline from the DTO.
     */
    it('should call the service with the correct appId and discipline', async () => {
      const appId = 42;
      const updateDisciplineDto = { discipline: DISCIPLINE_VALUES.RN };
      const updatedApplication: Application = {
        ...mockApplication,
        appId,
        discipline: DISCIPLINE_VALUES.RN,
      };

      jest
        .spyOn(mockApplicationsService, 'update')
        .mockResolvedValue(updatedApplication);

      await controller.updateApplicationDiscipline(appId, updateDisciplineDto);

      expect(mockApplicationsService.update).toHaveBeenCalledWith(appId, {
        discipline: DISCIPLINE_VALUES.RN,
      });
    });
  });

  describe('updateApplicationAvailability', () => {
    it("should successfully update an application's availability", async () => {
      const appId = 42;
      const updateAvailabilityDto = { mondayAvailability: 'not available' };
      const updatedApplication: Application = {
        ...mockApplication,
        appId,
        mondayAvailability: 'not available',
      };

      jest
        .spyOn(mockApplicationsService, 'update')
        .mockResolvedValue(updatedApplication);

      await controller.updateApplicationAvailability(
        appId,
        updateAvailabilityDto,
      );

      expect(mockApplicationsService.update).toHaveBeenCalledWith(appId, {
        mondayAvailability: 'not available',
      });
    });
  });

  describe('updateApplicationProposedStartDate', () => {
    const updatedStartDate = '2024-02-01';
    const updatedApplication: Application = {
      ...mockApplication,
      proposedStartDate: new Date(updatedStartDate),
    };

    it('should update the proposed start date of an application', async () => {
      jest
        .spyOn(mockApplicationsService, 'updateProposedStartDate')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationProposedStartDate(
        1,
        updatedStartDate,
      );

      expect(result).toEqual(updatedApplication);
      expect(
        mockApplicationsService.updateProposedStartDate,
      ).toHaveBeenCalledWith(1, new Date(updatedStartDate));
    });

    it('should handle service errors when updating proposed start date', async () => {
      const errorMessage = 'Start date must be before end date';
      jest
        .spyOn(mockApplicationsService, 'updateProposedStartDate')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.updateApplicationProposedStartDate(1, updatedStartDate),
      ).rejects.toThrow(errorMessage);
    });
  });
  describe('updateApplicationActualStartDate', () => {
    const updatedStartDate = '2024-02-01';
    const updatedApplication: Application = {
      ...mockApplication,
      proposedStartDate: new Date(updatedStartDate),
    };

    it('should update the actual start date of an application', async () => {
      jest
        .spyOn(mockApplicationsService, 'updateActualStartDate')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationActualStartDate(
        1,
        updatedStartDate,
      );

      expect(result).toEqual(updatedApplication);
      expect(
        mockApplicationsService.updateActualStartDate,
      ).toHaveBeenCalledWith(1, new Date(updatedStartDate));
    });

    it('should handle service errors when updating actual start date', async () => {
      const errorMessage = 'Start date must be before end date';
      jest
        .spyOn(mockApplicationsService, 'updateActualStartDate')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.updateApplicationActualStartDate(1, updatedStartDate),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('updateApplicationEndDate', () => {
    const updatedEndDate = '2024-07-31';
    const updatedApplication: Application = {
      ...mockApplication,
      endDate: new Date(updatedEndDate),
    };

    it('should update the end date of an application', async () => {
      jest
        .spyOn(mockApplicationsService, 'updateEndDate')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationEndDate(
        1,
        updatedEndDate,
      );

      expect(result).toEqual(updatedApplication);
      expect(mockApplicationsService.updateEndDate).toHaveBeenCalledWith(
        1,
        new Date(updatedEndDate),
      );
    });

    it('should handle service errors when updating end date', async () => {
      const errorMessage = 'End date must be after proposed start date';
      jest
        .spyOn(mockApplicationsService, 'updateEndDate')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.updateApplicationEndDate(1, updatedEndDate),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('confidentiality forms endpoints', () => {
    it('should return confidentiality template URL', async () => {
      jest
        .spyOn(mockApplicationsService, 'getConfidentialityTemplateUrl')
        .mockResolvedValue({
          templateUrl:
            'https://bucket.s3.us-east-2.amazonaws.com/Confidentiality_Form.pdf',
        });

      await expect(controller.getConfidentialityTemplateUrl()).resolves.toEqual(
        {
          templateUrl:
            'https://bucket.s3.us-east-2.amazonaws.com/Confidentiality_Form.pdf',
        },
      );
    });

    it('should return uploaded confidentiality form when present', async () => {
      jest
        .spyOn(mockApplicationsService, 'getConfidentialityForm')
        .mockResolvedValue({
          fileName: '1_confidentiality-123-abc123.pdf',
          fileUrl:
            'https://bucket.s3.us-east-2.amazonaws.com/1_confidentiality-123-abc123.pdf',
        });

      await expect(
        controller.getCurrentUserConfidentialityForm({
          user: {
            email: 'test@example.com',
            userType: UserType.STANDARD,
            firstName: 'Test',
            lastName: 'User',
          },
        }),
      ).resolves.toEqual({
        fileName: '1_confidentiality-123-abc123.pdf',
        fileUrl:
          'https://bucket.s3.us-east-2.amazonaws.com/1_confidentiality-123-abc123.pdf',
      });
    });

    it('should return an empty payload when no uploaded confidentiality form exists', async () => {
      jest
        .spyOn(mockApplicationsService, 'getConfidentialityForm')
        .mockResolvedValue(null);

      await expect(
        controller.getCurrentUserConfidentialityForm({
          user: {
            email: 'test@example.com',
            userType: UserType.STANDARD,
            firstName: 'Test',
            lastName: 'User',
          },
        }),
      ).resolves.toEqual({ fileName: null, fileUrl: null });
    });

    it('should upload confidentiality form for the current user', async () => {
      jest
        .spyOn(mockApplicationsService, 'uploadConfidentialityForm')
        .mockResolvedValue({
          fileName: '1_confidentiality-123-abc123.pdf',
          fileUrl:
            'https://bucket.s3.us-east-2.amazonaws.com/1_confidentiality-123-abc123.pdf',
          appStatus: AppStatus.FORMS_SIGNED,
        });

      const mockFile = {
        buffer: Buffer.from('pdf'),
        mimetype: 'application/pdf',
      };

      await expect(
        controller.uploadCurrentUserConfidentialityForm(
          {
            user: {
              email: 'test@example.com',
              userType: UserType.STANDARD,
              firstName: 'Test',
              lastName: 'User',
            },
          },
          mockFile,
        ),
      ).resolves.toEqual({
        fileName: '1_confidentiality-123-abc123.pdf',
        fileUrl:
          'https://bucket.s3.us-east-2.amazonaws.com/1_confidentiality-123-abc123.pdf',
        appStatus: AppStatus.FORMS_SIGNED,
      });
    });
  });

  describe('updateApplicationStatus', () => {
    it('should call updateStatus with the correct appId and status', async () => {
      const updatedApplication: Application = {
        ...mockApplication,
        appStatus: AppStatus.ACCEPTED,
      };

      jest
        .spyOn(mockApplicationsService, 'updateStatus')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationStatus(1, {
        appStatus: AppStatus.ACCEPTED,
      });

      expect(result).toEqual(updatedApplication);
      expect(mockApplicationsService.updateStatus).toHaveBeenCalledWith(
        1,
        AppStatus.ACCEPTED,
      );
    });

    it('should call updateStatus with DECLINED status', async () => {
      const updatedApplication: Application = {
        ...mockApplication,
        appStatus: AppStatus.DECLINED,
      };

      jest
        .spyOn(mockApplicationsService, 'updateStatus')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationStatus(1, {
        appStatus: AppStatus.DECLINED,
      });

      expect(result).toEqual(updatedApplication);
      expect(mockApplicationsService.updateStatus).toHaveBeenCalledWith(
        1,
        AppStatus.DECLINED,
      );
    });

    it('should call updateStatus with NO_AVAILABILITY status', async () => {
      const updatedApplication: Application = {
        ...mockApplication,
        appStatus: AppStatus.NO_AVAILABILITY,
      };

      jest
        .spyOn(mockApplicationsService, 'updateStatus')
        .mockResolvedValue(updatedApplication);

      const result = await controller.updateApplicationStatus(1, {
        appStatus: AppStatus.NO_AVAILABILITY,
      });

      expect(result).toEqual(updatedApplication);
      expect(mockApplicationsService.updateStatus).toHaveBeenCalledWith(
        1,
        AppStatus.NO_AVAILABILITY,
      );
    });

    it('should throw NotFoundException when application does not exist', async () => {
      jest
        .spyOn(mockApplicationsService, 'updateStatus')
        .mockRejectedValue(
          new NotFoundException('Application with ID 999 not found'),
        );

      await expect(
        controller.updateApplicationStatus(999, {
          appStatus: AppStatus.ACCEPTED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass along service errors without information loss', async () => {
      jest
        .spyOn(mockApplicationsService, 'updateStatus')
        .mockRejectedValue(
          new Error('There was a problem updating the status'),
        );

      await expect(
        controller.updateApplicationStatus(1, {
          appStatus: AppStatus.ACCEPTED,
        }),
      ).rejects.toThrow('There was a problem updating the status');
    });
  });

  describe('deleteApplication', () => {
    it('should delete an application', async () => {
      jest
        .spyOn(mockApplicationsService, 'delete')
        .mockResolvedValue(undefined);

      await expect(controller.deleteApplication(1)).resolves.toBeUndefined();
      expect(mockApplicationsService.delete).toHaveBeenCalledWith(1);
    });

    it('should pass along service errors while deleting', async () => {
      jest
        .spyOn(mockApplicationsService, 'delete')
        .mockRejectedValue(
          new NotFoundException('Application with ID 999 not found'),
        );

      await expect(controller.deleteApplication(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCurrentApplication', () => {
    it('should return NotFoundException when request user context is missing', async () => {
      const result = await controller.getCurrentApplication({});

      expect(result).toBeInstanceOf(NotFoundException);
      expect((result as NotFoundException).message).toBe(
        'No user matching the JWT was found.',
      );
    });

    it('should return the current user application when candidate info exists', async () => {
      mockCandidateInfoService.findOne.mockResolvedValue({
        email: 'test@example.com',
        appId: 1,
      });
      jest
        .spyOn(mockApplicationsService, 'findById')
        .mockResolvedValue(mockApplication);

      await expect(
        controller.getCurrentApplication({
          user: {
            email: 'test@example.com',
            userType: UserType.STANDARD,
            firstName: 'Test',
            lastName: 'User',
          },
        }),
      ).resolves.toEqual(mockApplication);
      expect(mockCandidateInfoService.findOne).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockApplicationsService.findById).toHaveBeenCalledWith(1);
    });

    it('should pass through candidate lookup errors', async () => {
      mockCandidateInfoService.findOne.mockRejectedValue(
        new NotFoundException(
          'candidate with email test@example.com not found',
        ),
      );

      await expect(
        controller.getCurrentApplication({
          user: {
            email: 'test@example.com',
            userType: UserType.STANDARD,
            firstName: 'Test',
            lastName: 'User',
          },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
