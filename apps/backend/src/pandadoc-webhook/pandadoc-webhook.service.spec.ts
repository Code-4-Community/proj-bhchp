import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { AppStatus, ApplicantType } from '../applications/types';
import { ApplicationsService } from '../applications/applications.service';
import { LearnerInfoService } from '../learner-info/learner-info.service';
import { AWSS3Service } from '../util/aws-s3/aws-s3.service';

jest.mock('axios');

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-2',
      bucketName: 'bucket',
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

const mockedAxios = axios as jest.Mocked<typeof axios>;

function buildMockConfigService(apiKey = 'test-api-key'): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'PANDADOC_API_KEY') return apiKey;
      return undefined;
    }),
  } as unknown as ConfigService;
}

function buildWebhookEvent(documentId = 'doc-abc123') {
  return [{ event: 'document_completed_pdf_ready', data: { id: documentId } }];
}

function buildMockS3Service(): Pick<AWSS3Service, 'uploadWithKey'> {
  return {
    uploadWithKey: jest
      .fn()
      .mockImplementation(
        async (_buffer: Buffer, fileName: string, mimeType: string) => {
          void mimeType;
          return {
            key: `${fileName.replace(/\.pdf$/i, '')}-stored.pdf`,
            url: `https://bucket.s3.us-east-2.amazonaws.com/${fileName.replace(
              /\.pdf$/i,
              '',
            )}-stored.pdf`,
          };
        },
      ),
  };
}

function buildMockApplicationsService(generatedAppId = 42) {
  return {
    create: jest.fn(async (dto) => ({
      appId: generatedAppId,
      ...dto,
    })),
    sendSubmissionErrorEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as Pick<
    ApplicationsService,
    'create' | 'sendSubmissionErrorEmail'
  >;
}

function buildMockLearnerInfoService() {
  return {
    create: jest.fn(async (dto) => dto),
  } as unknown as Pick<LearnerInfoService, 'create'>;
}

describe('PandadocWebhookService', () => {
  async function buildService(
    configService?: ConfigService,
    awsS3Service?: Pick<AWSS3Service, 'uploadWithKey'>,
    applicationsService?: Pick<
      ApplicationsService,
      'create' | 'sendSubmissionErrorEmail'
    >,
    learnerInfoService?: Pick<LearnerInfoService, 'create'>,
  ): Promise<PandadocWebhookService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandadocWebhookService,
        {
          provide: ConfigService,
          useValue: configService ?? buildMockConfigService(),
        },
        {
          provide: AWSS3Service,
          useValue: awsS3Service ?? buildMockS3Service(),
        },
        {
          provide: ApplicationsService,
          useValue: applicationsService ?? buildMockApplicationsService(),
        },
        {
          provide: LearnerInfoService,
          useValue: learnerInfoService ?? buildMockLearnerInfoService(),
        },
      ],
    }).compile();
    return module.get<PandadocWebhookService>(PandadocWebhookService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const service = await buildService();
    expect(service).toBeDefined();
  });

  describe('handleIncomingWebhook', () => {
    it('fetches fields from PandaDoc API and delegates creation through existing services', async () => {
      const s3Service = buildMockS3Service();
      const applicationsService = buildMockApplicationsService(99);
      const learnerInfoService = buildMockLearnerInfoService();
      const service = await buildService(
        undefined,
        s3Service,
        applicationsService,
        learnerInfoService,
      );

      mockedAxios.get = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            fields: Object.entries({
              ...buildFullPayload(),
              Volunteer_ResumeUpload2: {
                name: 'resume.pdf',
                url: 'https://files.pandadoc.test/resume.pdf',
              },
              Volunteer_CoverletterUpload2: {
                name: 'cover-letter.pdf',
                url: 'https://files.pandadoc.test/cover-letter.pdf',
              },
              Volunteer_SyllabusUpload: {
                name: 'syllabus.pdf',
                url: 'https://files.pandadoc.test/syllabus.pdf',
              },
            }).map(([field_id, value]) => ({
              field_id,
              value,
              assigned_to: {
                email: 'test@example.com',
                first_name: 'Jamie',
                last_name: 'Smith',
              },
            })),
          },
        })
        .mockResolvedValue({
          data: Buffer.from('file-bytes'),
          headers: { 'content-type': 'application/pdf' },
        });

      const result = await service.handleIncomingWebhook(
        buildWebhookEvent('doc-xyz'),
      );

      expect(result).toEqual({ appId: 99 });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/documents/doc-xyz/fields'),
        expect.objectContaining({
          headers: { Authorization: 'API-Key test-api-key' },
        }),
      );
      expect(s3Service.uploadWithKey).toHaveBeenCalledTimes(3);
      expect(s3Service.uploadWithKey).toHaveBeenNthCalledWith(
        1,
        expect.any(Buffer),
        'resumes/resume.pdf',
        'application/pdf',
      );
      expect(s3Service.uploadWithKey).toHaveBeenNthCalledWith(
        2,
        expect.any(Buffer),
        'cover-letters/cover-letter.pdf',
        'application/pdf',
      );
      expect(s3Service.uploadWithKey).toHaveBeenNthCalledWith(
        3,
        expect.any(Buffer),
        'syllabus/syllabus.pdf',
        'application/pdf',
      );
      expect(applicationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          appStatus: AppStatus.APP_SUBMITTED,
          resume: 'resumes/resume-stored.pdf',
          coverLetter: 'cover-letters/cover-letter-stored.pdf',
        }),
        expect.objectContaining({
          candidateName: expect.objectContaining({
            firstName: 'Jamie',
            lastName: 'Smith',
          }),
        }),
      );
      expect(learnerInfoService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: 99,
          syllabus: 'syllabus/syllabus-stored.pdf',
        }),
      );
    });

    it('throws BadRequestException when payload is not an array of events', async () => {
      const service = await buildService();

      await expect(service.handleIncomingWebhook({})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when data.id is missing', async () => {
      const service = await buildService();

      await expect(
        service.handleIncomingWebhook([
          { event: 'document_completed_pdf_ready', data: {} },
        ]),
      ).rejects.toThrow('document ID');
    });

    it('throws InternalServerErrorException when PANDADOC_API_KEY is not set', async () => {
      const service = await buildService(buildMockConfigService(''));

      await expect(
        service.handleIncomingWebhook(buildWebhookEvent()),
      ).rejects.toThrow('PandaDoc API key is not configured');
    });
  });

  describe('processWebhook - happy path', () => {
    it('delegates application and learner creation to existing services', async () => {
      const applicationsService = buildMockApplicationsService(42);
      const learnerInfoService = buildMockLearnerInfoService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
        learnerInfoService,
      );

      const result = await service.processWebhook(buildFullPayload());

      expect(result).toEqual({ appId: 42 });
      expect(applicationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          appStatus: AppStatus.APP_SUBMITTED,
          phone: '617-555-0199',
        }),
      );
      expect(learnerInfoService.create).toHaveBeenCalledWith(
        expect.objectContaining({ appId: 42 }),
      );
    });

    it('sets applicantType=LEARNER when school is present', async () => {
      const applicationsService = buildMockApplicationsService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
      );

      await service.processWebhook(buildFullPayload());

      expect(applicationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ applicantType: ApplicantType.LEARNER }),
      );
    });

    it('sets applicantType=LEARNER when school affiliation is present even if schoolDepartment is empty', async () => {
      const applicationsService = buildMockApplicationsService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
      );

      await service.processWebhook({
        ...buildFullPayload(),
        Volunteer_Affiliation: 'Boston University',
        Volunteer_Department: '',
      });

      expect(applicationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ applicantType: ApplicantType.LEARNER }),
      );
    });

    it('formats proposedStartDate as YYYY-MM-DD', async () => {
      const applicationsService = buildMockApplicationsService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
      );

      await service.processWebhook(buildFullPayload());

      expect(applicationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          proposedStartDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });
  });

  describe('processWebhook - validation', () => {
    it('does not throw when Volunteer_DOB is missing', async () => {
      const learnerInfoService = buildMockLearnerInfoService();
      const service = await buildService(
        undefined,
        undefined,
        undefined,
        learnerInfoService,
      );

      const { Volunteer_DOB, ...payloadWithoutDob } = buildFullPayload();

      await expect(service.processWebhook(payloadWithoutDob)).resolves.toEqual({
        appId: 42,
      });
      expect(Volunteer_DOB).toBe('01-15-2000');
      expect(learnerInfoService.create).toHaveBeenCalledWith(
        expect.objectContaining({ dateOfBirth: undefined }),
      );
    });

    it('throws for missing required PandaDoc fields', async () => {
      const applicationsService = buildMockApplicationsService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
      );

      await expect(
        service.processWebhook({ email: 'x@example.com' }),
      ).rejects.toThrow('Missing required PandaDoc fields');

      expect(applicationsService.create).not.toHaveBeenCalled();
      expect(
        applicationsService.sendSubmissionErrorEmail,
      ).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for malformed phone number', async () => {
      const applicationsService = buildMockApplicationsService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
      );

      const payload = { ...buildFullPayload(), Volunteer_Phone: 'not-a-phone' };
      await expect(service.processWebhook(payload)).rejects.toThrow(
        BadRequestException,
      );
      expect(applicationsService.create).not.toHaveBeenCalled();
      expect(applicationsService.sendSubmissionErrorEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          phone: 'not-a-phone',
        }),
        'Phone number must be in ###-###-#### format',
      );
    });

    it('sends the invalid-input email through ApplicationsService when create rejects a BadRequestException', async () => {
      const applicationsService = {
        ...buildMockApplicationsService(),
        create: jest
          .fn()
          .mockRejectedValue(
            new BadRequestException(
              'Weekly hours must be greater than 0 and less than 7 * 24 hours',
            ),
          ),
      } as unknown as Pick<
        ApplicationsService,
        'create' | 'sendSubmissionErrorEmail'
      >;
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
      );

      await expect(service.processWebhook(buildFullPayload())).rejects.toThrow(
        'Weekly hours must be greater than 0 and less than 7 * 24 hours',
      );

      expect(applicationsService.sendSubmissionErrorEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          weeklyHours: 10,
        }),
        'Weekly hours must be greater than 0 and less than 7 * 24 hours',
      );
    });
  });

  describe('processWebhook - delegated service failures', () => {
    it('propagates the error when ApplicationsService.create fails', async () => {
      const applicationsService = {
        create: jest
          .fn()
          .mockRejectedValue(new Error('Forced failure on Application')),
        sendSubmissionErrorEmail: jest.fn().mockResolvedValue(undefined),
      } as unknown as Pick<
        ApplicationsService,
        'create' | 'sendSubmissionErrorEmail'
      >;
      const learnerInfoService = buildMockLearnerInfoService();
      const service = await buildService(
        undefined,
        undefined,
        applicationsService,
        learnerInfoService,
      );

      await expect(service.processWebhook(buildFullPayload())).rejects.toThrow(
        'Forced failure on Application',
      );
      expect(learnerInfoService.create).not.toHaveBeenCalled();
      expect(
        applicationsService.sendSubmissionErrorEmail,
      ).not.toHaveBeenCalled();
    });

    it('propagates the error when LearnerInfoService.create fails', async () => {
      const learnerInfoService = {
        create: jest
          .fn()
          .mockRejectedValue(new Error('Forced failure on LearnerInfo')),
      } as unknown as Pick<LearnerInfoService, 'create'>;
      const service = await buildService(
        undefined,
        undefined,
        undefined,
        learnerInfoService,
      );

      await expect(service.processWebhook(buildFullPayload())).rejects.toThrow(
        'Forced failure on LearnerInfo',
      );
    });
  });
});
