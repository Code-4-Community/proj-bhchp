jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockJwtAuthGuard {
      canActivate() {
        return true;
      }
    },
}));

import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Readable } from 'stream';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { UsersService } from '../users/users.service';
import { EmailService } from '../util/email/email.service';

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

describe('Applications CSV export integration', () => {
  let app: INestApplication;

  const mockApplicationsService = {
    exportCsvByCreatedAtRange: jest.fn(),
  };

  const mockCandidateInfoService = {
    findLatestAppId: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockCurrentUserInterceptor = {
    intercept: jest.fn((_context, next) => next.handle()),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockEmailService = {
    queueEmail: jest.fn(),
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
        {
          provide: CandidateInfoService,
          useValue: mockCandidateInfoService,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
        {
          provide: CurrentUserInterceptor,
          useValue: mockCurrentUserInterceptor,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    });

    moduleBuilder.overrideGuard(RolesGuard).useValue(mockRolesGuard);

    const moduleRef: TestingModule = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('downloads a CSV file with attachment headers', async () => {
    mockApplicationsService.exportCsvByCreatedAtRange.mockResolvedValue({
      fileName: 'applications-export-2026-01-01-to-2026-01-31.csv',
      stream: Readable.from([
        'Application ID,First Name,Last Name\n1,Jane,Doe\n',
      ]),
    });

    const response = await request(app.getHttpServer())
      .get('/api/applications/export/csv')
      .query({ startDate: '2026-01-01', endDate: '2026-01-31' })
      .expect(200);

    expect(
      mockApplicationsService.exportCsvByCreatedAtRange,
    ).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="applications-export-2026-01-01-to-2026-01-31.csv"',
    );
    expect(response.text).toBe(
      'Application ID,First Name,Last Name\n1,Jane,Doe\n',
    );
  });

  it('returns a 400 response when the service rejects the requested range', async () => {
    mockApplicationsService.exportCsvByCreatedAtRange.mockRejectedValue(
      new BadRequestException('endDate must be on or after startDate'),
    );

    const response = await request(app.getHttpServer())
      .get('/api/applications/export/csv')
      .query({ startDate: '2026-02-01', endDate: '2026-01-31' })
      .expect(400);

    expect(response.body.message).toBe('endDate must be on or after startDate');
  });
});
