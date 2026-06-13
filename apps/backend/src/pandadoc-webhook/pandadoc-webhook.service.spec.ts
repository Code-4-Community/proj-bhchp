import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DataSource, EntityManager } from 'typeorm';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { AppStatus, ApplicantType } from '../applications/types';

jest.mock('axios');

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

interface Saved {
  Application?: Record<string, unknown>;
  CandidateInfo?: Record<string, unknown>;
  LearnerInfo?: Record<string, unknown>;
  User?: Record<string, unknown>;
}

function buildMockDataSource(opts: {
  generatedAppId?: number;
  failOn?: 'Application' | 'CandidateInfo' | 'LearnerInfo' | 'User';
  saved: Saved;
  existingUser?: Record<string, unknown> | null;
}): DataSource {
  const generatedAppId = opts.generatedAppId ?? 42;

  const em = {
    create: (
      entityClass: new () => unknown,
      data: Record<string, unknown>,
    ) => ({ __entity: entityClass.name, ...data }),
    save: jest.fn(
      async (entity: Record<string, unknown> & { __entity: string }) => {
        const name = entity.__entity;
        if (opts.failOn === name) {
          throw new Error(`Forced failure on ${name}`);
        }
        const stored = { ...entity };
        if (name === 'Application') {
          stored.appId = generatedAppId;
        }
        opts.saved[name as keyof Saved] = stored;
        return stored;
      },
    ),
    findOneBy: jest.fn(async () => opts.existingUser ?? null),
  } as unknown as EntityManager;

  return {
    transaction: async (cb: (em: EntityManager) => Promise<unknown>) => cb(em),
  } as unknown as DataSource;
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

describe('PandadocWebhookService', () => {
  async function buildService(
    dataSource: DataSource,
    configService?: ConfigService,
  ): Promise<PandadocWebhookService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandadocWebhookService,
        { provide: getDataSourceToken(), useValue: dataSource },
        {
          provide: ConfigService,
          useValue: configService ?? buildMockConfigService(),
        },
      ],
    }).compile();
    return module.get<PandadocWebhookService>(PandadocWebhookService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const saved: Saved = {};
    const service = await buildService(buildMockDataSource({ saved }));
    expect(service).toBeDefined();
  });

  describe('handleIncomingWebhook', () => {
    it('fetches fields from PandaDoc API and creates the application', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ generatedAppId: 99, saved }),
      );

      mockedAxios.get = jest.fn().mockResolvedValue({
        data: {
          fields: Object.entries(buildFullPayload()).map(
            ([field_id, value]) => ({
              field_id,
              value,
              assigned_to: { email: 'test@example.com' },
            }),
          ),
        },
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
      expect(saved.Application?.email).toBe('test@example.com');
    });

    it('throws BadRequestException when payload is not an array of events', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));

      await expect(service.handleIncomingWebhook({})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when data.id is missing', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));

      await expect(
        service.handleIncomingWebhook([
          { event: 'document_completed_pdf_ready', data: {} },
        ]),
      ).rejects.toThrow('document ID');
    });

    it('throws InternalServerErrorException when PANDADOC_API_KEY is not set', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ saved }),
        buildMockConfigService(''),
      );

      await expect(
        service.handleIncomingWebhook(buildWebhookEvent()),
      ).rejects.toThrow('PandaDoc API key is not configured');
    });
  });

  describe('processWebhook - happy path', () => {
    it('creates all three records in a single transaction with shared appId', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ generatedAppId: 42, saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);

      const result = await service.processWebhook(buildFullPayload());

      expect(result).toEqual({ appId: 42 });
      expect(txSpy).toHaveBeenCalledTimes(1);
      expect(saved.Application?.email).toBe('test@example.com');
      expect(saved.Application?.appStatus).toBe(AppStatus.APP_SUBMITTED);
      expect(saved.Application?.phone).toBe('617-555-0199');
      expect(saved.CandidateInfo).toEqual(
        expect.objectContaining({ appId: 42, email: 'test@example.com' }),
      );
      expect(saved.LearnerInfo).toEqual(expect.objectContaining({ appId: 42 }));
    });

    it('sets applicantType=LEARNER when school is present', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));
      await service.processWebhook(buildFullPayload());
      expect(saved.Application?.applicantType).toBe(ApplicantType.LEARNER);
    });

    it('sets applicantType=LEARNER when school affiliation is present even if schoolDepartment is empty', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));
      await service.processWebhook({
        ...buildFullPayload(),
        Volunteer_Affiliation: 'Boston University',
        Volunteer_Department: '',
      });
      expect(saved.Application?.applicantType).toBe(ApplicantType.LEARNER);
    });

    it('formats proposedStartDate as YYYY-MM-DD', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));
      await service.processWebhook(buildFullPayload());
      expect(saved.Application?.proposedStartDate).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    });
  });

  describe('processWebhook - user creation', () => {
    it('creates a User record when _firstName is present and no user exists', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ generatedAppId: 42, saved }),
      );

      await service.processWebhook({
        ...buildFullPayload(),
        _firstName: 'Jane',
        _lastName: 'Doe',
      });

      expect(saved.User).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      );
    });

    it('skips User creation when _firstName is absent', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));

      await service.processWebhook(buildFullPayload());

      expect(saved.User).toBeUndefined();
    });

    it('skips User creation when a user with that email already exists', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({
          saved,
          existingUser: {
            email: 'test@example.com',
            firstName: 'Old',
            lastName: 'Name',
          },
        }),
      );

      await service.processWebhook({
        ...buildFullPayload(),
        _firstName: 'Jane',
        _lastName: 'Doe',
      });

      expect(saved.User).toBeUndefined();
    });
  });

  describe('processWebhook - validation', () => {
    it('does not throw when Volunteer_DOB is missing', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));

      const { Volunteer_DOB, ...payloadWithoutDob } = buildFullPayload();

      await expect(service.processWebhook(payloadWithoutDob)).resolves.toEqual({
        appId: 42,
      });
      expect(Volunteer_DOB).toBe('01-15-2000');
      expect(saved.LearnerInfo?.dateOfBirth).toBeUndefined();
    });

    it('throws for missing required PandaDoc fields', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);

      await expect(
        service.processWebhook({ email: 'x@example.com' }),
      ).rejects.toThrow('Missing required PandaDoc fields');

      expect(txSpy).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for malformed phone number', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);

      const payload = { ...buildFullPayload(), Volunteer_Phone: 'not-a-phone' };
      await expect(service.processWebhook(payload)).rejects.toThrow(
        BadRequestException,
      );
      expect(txSpy).not.toHaveBeenCalled();
    });
  });

  describe('processWebhook - transaction rollback', () => {
    it('propagates the error when Application save fails', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ failOn: 'Application', saved }),
      );
      await expect(service.processWebhook(buildFullPayload())).rejects.toThrow(
        'Forced failure on Application',
      );
      expect(saved.Application).toBeUndefined();
      expect(saved.CandidateInfo).toBeUndefined();
      expect(saved.LearnerInfo).toBeUndefined();
    });

    it('propagates the error when CandidateInfo save fails (transaction rolls back)', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ failOn: 'CandidateInfo', saved }),
      );
      await expect(service.processWebhook(buildFullPayload())).rejects.toThrow(
        'Forced failure on CandidateInfo',
      );
      expect(saved.LearnerInfo).toBeUndefined();
    });

    it('propagates the error when LearnerInfo save fails (transaction rolls back)', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ failOn: 'LearnerInfo', saved }),
      );
      await expect(service.processWebhook(buildFullPayload())).rejects.toThrow(
        'Forced failure on LearnerInfo',
      );
    });
  });
});
