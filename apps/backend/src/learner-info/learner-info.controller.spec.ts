import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LearnerInfoController } from './learner-info.controller';
import { LearnerInfoService } from './learner-info.service';
import { LearnerInfo } from './learner-info.entity';
import { CreateLearnerInfoDto } from './dto/create-learner-info.request.dto';
import { School } from './types';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RolesGuard } from '../auth/roles.guard';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-2',
      bucketName: 'bucket',
      sesSenderEmail: 'dummyemail@gmail.com',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
}));
const mockRolesGuard = {
  canActivate: jest.fn(() => true),
};

const mockUsersService = {
  findOne: jest.fn(),
};

describe('LearnerInfoController', () => {
  let controller: LearnerInfoController;

  const mockLearnerInfoService = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearnerInfoController],
      providers: [
        {
          provide: LearnerInfoService,
          useValue: mockLearnerInfoService,
        },
        {
          provide: getRepositoryToken(LearnerInfo),
          useValue: {},
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<LearnerInfoController>(LearnerInfoController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /', () => {
    it('should create a new learner info', async () => {
      const createLearnerInfo: CreateLearnerInfoDto = {
        appId: 0,
        school: School.BOSTON_UNIVERSITY,
        schoolDepartment: 'Infectious Diseases',
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockLearnerInfoService.create.mockResolvedValue(
        createLearnerInfo as LearnerInfo,
      );

      // Call controller method
      const result = await controller.createLearnerInfo(createLearnerInfo);

      // Verify results
      expect(result).toEqual(createLearnerInfo as LearnerInfo);
      expect(mockLearnerInfoService.create).toHaveBeenCalledWith(
        createLearnerInfo,
      );
    });

    it('should pass along any service errors without information loss', async () => {
      mockLearnerInfoService.create.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );
      const createLearnerInfoDto: CreateLearnerInfoDto = {
        appId: 0,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      await expect(
        controller.createLearnerInfo(createLearnerInfoDto),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });

    it('should not accept negative appId', async () => {
      const createLearnerInfoDto: CreateLearnerInfoDto = {
        appId: -1,
        school: School.BOSTON_UNIVERSITY,
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockLearnerInfoService.create.mockRejectedValue(
        new BadRequestException('appId must not be negative'),
      );

      await expect(
        controller.createLearnerInfo(createLearnerInfoDto),
      ).rejects.toThrow(new BadRequestException(`appId must not be negative`));
    });
  });

  describe('GET /:id', () => {
    it('should get the learner info by appId', async () => {
      const learnerInfo: LearnerInfo = {
        appId: 0,
        school: School.BOSTON_UNIVERSITY,
        schoolDepartment: 'Infectious Diseases',
        isSupervisorApplying: false,
        isLegalAdult: true,
      };

      mockLearnerInfoService.findById.mockResolvedValue(learnerInfo);

      const result = await controller.getLearnerInfo(0);

      expect(result).toEqual(learnerInfo);
      expect(mockLearnerInfoService.findById).toHaveBeenCalledWith(0);
    });
  });
});
