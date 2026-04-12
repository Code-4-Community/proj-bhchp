import { Test, TestingModule } from '@nestjs/testing';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { ApplicationsService } from '../applications/applications.service';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { LearnerInfoService } from '../learner-info/learner-info.service';
import { AppStatus, ApplicantType } from '../applications/types';

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

function buildFullPayload(): Record<string, unknown> {
  return {
    Volunteer_StartDate: '06-01-2026',
    Volunteer_EndDate: '12-01-2026',
    email: 'test@example.com',
    Volunteer_Pronouns: 'he/him',
    Volunteer_Phone: '617-555-0199',
    Volunteer_Languages: '',
    Volunteer_Experience: 'Volunteer/Intern',
    Volunteer_Affiliation: 'Northeastern',
    'Volunteer_ Affiliation_Other': '',
    Volunteer_Discipline: 'Public Health',
    Volunteer_Discipline_Other: '',
    Volunteer_License: 'N/A',
    Volunteer_Referred: 'No',
    Volunteer_ReferredEmail: '',
    Volunteer_TotalHours: '10',
    Volunteer_AvailabilityMonday: '9am-12pm',
    Volunteer_AvailabilityTuesday: '',
    Volunteer_AvailabilityWednesday: '1pm-5pm',
    Volunteer_AvailabilityThursday: '',
    Volunteer_AvailabilityFriday: '9am-12pm',
    Volunteer_AvailabilitySaturday: '',
    Volunteer_ResumeUpload2: 'resume.pdf',
    Volunteer_CoverletterUpload2: 'cl.pdf',
    Volunteer_EmergencyContactName: 'Jane Doe',
    Volunteer_EmergencyContactPhone: '617-555-0100',
    Volunteer_EmergencyContactRelationship: 'Mother',
    Volunteer_Interest_PrimaryCare: 'on',
    Volunteer_HearAboutUs_School: 'on',
    Volunteer_FormFor: 'Supervisor/Instructor',
    Volunteer_Age: 'Yes',
    Volunteer_DOB: '01-15-2000',
    Volunteer_Department: 'Khoury College',
    Volunteer_CourseRequirements: '120 clinical hours',
    Volunteer_InstructorInfo: 'Dr. Smith',
    Volunteer_SyllabusUpload: 'syllabus.pdf',
  };
}

describe('PandadocWebhookService', () => {
  let service: PandadocWebhookService;

  const mockApplicationsService = {
    create: jest.fn(),
  };
  const mockCandidateInfoService = {
    create: jest.fn(),
  };
  const mockLearnerInfoService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandadocWebhookService,
        { provide: ApplicationsService, useValue: mockApplicationsService },
        { provide: CandidateInfoService, useValue: mockCandidateInfoService },
        { provide: LearnerInfoService, useValue: mockLearnerInfoService },
      ],
    }).compile();

    service = module.get<PandadocWebhookService>(PandadocWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook - happy path', () => {
    it('should create all three records in order with correct appId', async () => {
      const payload = buildFullPayload();
      mockApplicationsService.create.mockResolvedValue({ appId: 42 });
      mockCandidateInfoService.create.mockResolvedValue({
        appId: 42,
        email: 'test@example.com',
      });
      mockLearnerInfoService.create.mockResolvedValue({ appId: 42 });

      const result = await service.processWebhook(payload);

      expect(result).toEqual({ appId: 42 });

      // Application created first
      expect(mockApplicationsService.create).toHaveBeenCalledTimes(1);
      const appDto = mockApplicationsService.create.mock.calls[0][0];
      expect(appDto.email).toBe('test@example.com');
      expect(appDto.appStatus).toBe(AppStatus.APP_SUBMITTED);
      expect(appDto.phone).toBe('617-555-0199');

      // CandidateInfo created with the returned appId
      expect(mockCandidateInfoService.create).toHaveBeenCalledWith(
        42,
        'test@example.com',
      );

      // LearnerInfo created with the returned appId
      expect(mockLearnerInfoService.create).toHaveBeenCalledTimes(1);
      const learnerDto = mockLearnerInfoService.create.mock.calls[0][0];
      expect(learnerDto.appId).toBe(42);
    });

    it('should set applicantType to LEARNER when schoolDepartment is present', async () => {
      const payload = buildFullPayload();
      mockApplicationsService.create.mockResolvedValue({ appId: 1 });
      mockCandidateInfoService.create.mockResolvedValue({});
      mockLearnerInfoService.create.mockResolvedValue({});

      await service.processWebhook(payload);

      const appDto = mockApplicationsService.create.mock.calls[0][0];
      expect(appDto.applicantType).toBe(ApplicantType.LEARNER);
    });

    it('should set applicantType to VOLUNTEER when schoolDepartment is empty', async () => {
      const payload = {
        ...buildFullPayload(),
        Volunteer_Department: '',
      };
      mockApplicationsService.create.mockResolvedValue({ appId: 1 });
      mockCandidateInfoService.create.mockResolvedValue({});
      mockLearnerInfoService.create.mockResolvedValue({});

      await service.processWebhook(payload);

      const appDto = mockApplicationsService.create.mock.calls[0][0];
      expect(appDto.applicantType).toBe(ApplicantType.VOLUNTEER);
    });
  });

  describe('processWebhook - date conversion', () => {
    it('should convert Date objects to YYYY-MM-DD strings', async () => {
      const payload = buildFullPayload();
      mockApplicationsService.create.mockResolvedValue({ appId: 1 });
      mockCandidateInfoService.create.mockResolvedValue({});
      mockLearnerInfoService.create.mockResolvedValue({});

      await service.processWebhook(payload);

      const appDto = mockApplicationsService.create.mock.calls[0][0];
      // proposedStartDate should be a YYYY-MM-DD string, not a Date
      expect(typeof appDto.proposedStartDate).toBe('string');
      expect(appDto.proposedStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('processWebhook - error handling', () => {
    it('should propagate mapper errors for missing required fields', async () => {
      const incompletePayload = { email: 'test@example.com' };

      await expect(service.processWebhook(incompletePayload)).rejects.toThrow(
        'Missing required PandaDoc fields',
      );

      expect(mockApplicationsService.create).not.toHaveBeenCalled();
    });

    it('should not create CandidateInfo or LearnerInfo if Application creation fails', async () => {
      const payload = buildFullPayload();
      mockApplicationsService.create.mockRejectedValue(
        new Error('Validation failed'),
      );

      await expect(service.processWebhook(payload)).rejects.toThrow(
        'Validation failed',
      );

      expect(mockCandidateInfoService.create).not.toHaveBeenCalled();
      expect(mockLearnerInfoService.create).not.toHaveBeenCalled();
    });

    it('should propagate CandidateInfo errors after Application is created', async () => {
      const payload = buildFullPayload();
      mockApplicationsService.create.mockResolvedValue({ appId: 99 });
      mockCandidateInfoService.create.mockRejectedValue(
        new Error('Duplicate email'),
      );

      await expect(service.processWebhook(payload)).rejects.toThrow(
        'Duplicate email',
      );

      expect(mockLearnerInfoService.create).not.toHaveBeenCalled();
    });
  });
});
