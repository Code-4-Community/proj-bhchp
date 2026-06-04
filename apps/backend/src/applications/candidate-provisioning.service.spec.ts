import { Test, TestingModule } from '@nestjs/testing';
import { AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CandidateProvisioningService } from './candidate-provisioning.service';
import { COGNITO_IDENTITY_PROVIDER } from '../admin-provisioning/cognito.provider';
import { EmailService } from '../util/email/email.service';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/types';
import { Application } from './application.entity';
import {
  AppStatus,
  ApplicantType,
  DesiredExperience,
  InterestArea,
} from './types';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      region: 'us-east-2',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
    PublicFrontendUrl: 'https://frontend.example.com',
  },
}));

describe('CandidateProvisioningService', () => {
  let service: CandidateProvisioningService;

  const mockCognitoIdentityProvider = {
    send: jest.fn(),
  };

  const mockEmailService = {
    queueEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockCandidateInfoService = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  const mockUsersService = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
  };

  const application: Application = {
    appId: 10,
    appStatus: AppStatus.APP_SUBMITTED,
    mondayAvailability: 'morning',
    tuesdayAvailability: 'morning',
    wednesdayAvailability: 'morning',
    thursdayAvailability: 'morning',
    fridayAvailability: 'morning',
    saturdayAvailability: 'none',
    interest: [InterestArea.WOMENS_HEALTH],
    license: '',
    applicantType: ApplicantType.LEARNER,
    phone: '123-456-7890',
    email: 'jane.doe@example.com',
    discipline: 'rn',
    proposedStartDate: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    referred: false,
    weeklyHours: 20,
    pronouns: 'they/them',
    nonEnglishLangs: 'spanish',
    desiredExperience: DesiredExperience.PRE_LICENSURE_PLACEMENT,
    resume: 'resume.pdf',
    coverLetter: 'cover-letter.pdf',
    confidentialityForm: undefined,
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '111-111-1111',
    emergencyContactRelationship: 'Mother',
    heardAboutFrom: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProvisioningService,
        {
          provide: COGNITO_IDENTITY_PROVIDER,
          useValue: mockCognitoIdentityProvider,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: CandidateInfoService,
          useValue: mockCandidateInfoService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<CandidateProvisioningService>(
      CandidateProvisioningService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('provisions a new candidate account and sends a temporary password for first-time applicants', async () => {
    mockCognitoIdentityProvider.send.mockResolvedValue({});

    await service.provisionSubmittedCandidate(application, true);

    expect(mockCognitoIdentityProvider.send).toHaveBeenCalledTimes(1);
    const command = mockCognitoIdentityProvider.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(AdminCreateUserCommand);
    expect(command.input).toMatchObject({
      UserPoolId: 'test-user-pool-id',
      Username: 'jane.doe@example.com',
      MessageAction: 'SUPPRESS',
    });
    expect(mockUsersService.create).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Jane',
      'Doe',
      UserType.STANDARD,
    );
    expect(mockCandidateInfoService.create).toHaveBeenCalledWith(
      application.appId,
      'jane.doe@example.com',
    );
    expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Your application has been submitted',
      expect.stringContaining('Temporary password:'),
    );
    expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Your application has been submitted',
      expect.stringContaining('https://frontend.example.com/login'),
    );
  });

  it('sends the submission email without a temporary password for repeat applicants', async () => {
    await service.provisionSubmittedCandidate(application, false);

    expect(mockCognitoIdentityProvider.send).not.toHaveBeenCalled();
    expect(mockCandidateInfoService.create).toHaveBeenCalledWith(
      application.appId,
      'jane.doe@example.com',
    );
    expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Your application has been submitted',
      expect.not.stringContaining('Temporary password:'),
    );
    expect(mockUsersService.create).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Jane',
      'Doe',
      UserType.STANDARD,
    );
  });

  it('falls back to a login-link-only email when the candidate already has a Cognito account', async () => {
    mockCognitoIdentityProvider.send.mockRejectedValue(
      new Error('UsernameExistsException'),
    );

    await service.provisionSubmittedCandidate(application, true);

    expect(mockUsersService.create).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Jane',
      'Doe',
      UserType.STANDARD,
    );
    expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Your application has been submitted',
      expect.not.stringContaining('Temporary password:'),
    );
  });
});
