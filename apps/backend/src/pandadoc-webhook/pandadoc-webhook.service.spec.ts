import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import axios from 'axios';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { AppStatus, ApplicantType } from '../applications/types';

jest.mock('axios');
const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

/** Flat field map that satisfies all required PandaDoc field validations. */
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

/**
 * Build the PandaDoc webhook envelope that the controller now receives.
 * `overrideData` lets individual tests tweak document-level fields.
 */
function buildEnvelope(
  overrideData?: Partial<{ id: string; status: string; name: string }>,
): unknown[] {
  return [
    {
      event: 'document_completed_pdf_ready',
      data: {
        id: 'test-doc-id',
        name: 'Student/Volunteer Interest Form',
        status: 'document.completed',
        ...overrideData,
      },
    },
  ];
}

/**
 * Prime the axios.get mock to return the given flat field map as a
 * PandaDoc `/documents/{id}/fields` response.
 */
function mockFieldsResponse(payload: Record<string, unknown>): void {
  mockedAxiosGet.mockResolvedValueOnce({
    data: {
      fields: Object.entries(payload).map(([name, value]) => ({
        name,
        value,
      })),
    },
  } as never);
}

interface Saved {
  Application?: Record<string, unknown>;
  CandidateInfo?: Record<string, unknown>;
  LearnerInfo?: Record<string, unknown>;
}

function buildMockDataSource(opts: {
  generatedAppId?: number;
  failOn?: 'Application' | 'CandidateInfo' | 'LearnerInfo';
  saved: Saved;
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
  } as unknown as EntityManager;

  return {
    transaction: async (cb: (em: EntityManager) => Promise<unknown>) => cb(em),
  } as unknown as DataSource;
}

describe('PandadocWebhookService', () => {
  async function buildService(
    dataSource: DataSource,
  ): Promise<PandadocWebhookService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandadocWebhookService,
        { provide: getDataSourceToken(), useValue: dataSource },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
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

  describe('processWebhook - event filtering', () => {
    it('returns null appId and does not persist when document status is not completed', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);

      const result = await service.processWebhook(
        buildEnvelope({ status: 'document.draft' }),
      );

      expect(result).toEqual({ appId: null });
      expect(txSpy).not.toHaveBeenCalled();
      expect(mockedAxiosGet).not.toHaveBeenCalled();
    });
  });

  describe('processWebhook - happy path', () => {
    it('creates all three records in a single transaction with shared appId', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ generatedAppId: 42, saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);
      mockFieldsResponse(buildFullPayload());

      const result = await service.processWebhook(buildEnvelope());

      expect(result).toEqual({ appId: 42 });
      expect(txSpy).toHaveBeenCalledTimes(1);
      expect(mockedAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining('test-doc-id/fields'),
        expect.objectContaining({
          headers: { Authorization: 'API-Key test-api-key' },
        }),
      );
      expect(saved.Application?.email).toBe('test@example.com');
      expect(saved.Application?.appStatus).toBe(AppStatus.APP_SUBMITTED);
      expect(saved.Application?.phone).toBe('617-555-0199');
      expect(saved.CandidateInfo).toEqual(
        expect.objectContaining({ appId: 42, email: 'test@example.com' }),
      );
      expect(saved.LearnerInfo).toEqual(expect.objectContaining({ appId: 42 }));
    });

    it('sets applicantType=LEARNER when schoolDepartment is present', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));
      mockFieldsResponse(buildFullPayload());
      await service.processWebhook(buildEnvelope());
      expect(saved.Application?.applicantType).toBe(ApplicantType.LEARNER);
    });

    it('sets applicantType=VOLUNTEER when schoolDepartment is empty', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));
      mockFieldsResponse({ ...buildFullPayload(), Volunteer_Department: '' });
      await service.processWebhook(buildEnvelope());
      expect(saved.Application?.applicantType).toBe(ApplicantType.VOLUNTEER);
    });

    it('formats proposedStartDate as YYYY-MM-DD', async () => {
      const saved: Saved = {};
      const service = await buildService(buildMockDataSource({ saved }));
      mockFieldsResponse(buildFullPayload());
      await service.processWebhook(buildEnvelope());
      expect(saved.Application?.proposedStartDate).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    });
  });

  describe('processWebhook - validation', () => {
    it('throws for missing required PandaDoc fields', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);
      mockFieldsResponse({ email: 'x@example.com' });

      await expect(service.processWebhook(buildEnvelope())).rejects.toThrow(
        'Missing required PandaDoc fields',
      );

      expect(txSpy).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for malformed phone number', async () => {
      const saved: Saved = {};
      const dataSource = buildMockDataSource({ saved });
      const txSpy = jest.spyOn(dataSource, 'transaction');
      const service = await buildService(dataSource);
      mockFieldsResponse({
        ...buildFullPayload(),
        Volunteer_Phone: 'not-a-phone',
      });

      await expect(service.processWebhook(buildEnvelope())).rejects.toThrow(
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
      mockFieldsResponse(buildFullPayload());
      await expect(service.processWebhook(buildEnvelope())).rejects.toThrow(
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
      mockFieldsResponse(buildFullPayload());
      await expect(service.processWebhook(buildEnvelope())).rejects.toThrow(
        'Forced failure on CandidateInfo',
      );
      expect(saved.LearnerInfo).toBeUndefined();
    });

    it('propagates the error when LearnerInfo save fails (transaction rolls back)', async () => {
      const saved: Saved = {};
      const service = await buildService(
        buildMockDataSource({ failOn: 'LearnerInfo', saved }),
      );
      mockFieldsResponse(buildFullPayload());
      await expect(service.processWebhook(buildEnvelope())).rejects.toThrow(
        'Forced failure on LearnerInfo',
      );
    });
  });
});
