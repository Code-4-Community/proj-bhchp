import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CandidateInfoController } from './candidate-info.controller';
import { CandidateInfoService } from './candidate-info.service';
import { CandidateInfo } from './candidate-info.entity';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RolesGuard } from '../auth/roles.guard';
import { UserType } from '../users/types';

jest.mock('../aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      region: 'us-east-2',
      clientSecret: 'test-client-secret',
    },
  },
}));

const mockCandidateInfoService: Partial<CandidateInfoService> = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByAppId: jest.fn(),
  delete: jest.fn(),
};

const mockAuthService = {
  getUser: jest.fn(),
};

const mockUsersService = {
  find: jest.fn(),
};

const mockRolesGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const defaultCandidateInfo: CandidateInfo = {
  appId: 1,
  email: 'john@example.com',
};

describe('CandidateInfoController', () => {
  let controller: CandidateInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateInfoController],
      providers: [
        {
          provide: CandidateInfoService,
          useValue: mockCandidateInfoService,
        },
        {
          provide: getRepositoryToken(CandidateInfo),
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
      ],
    }).compile();

    controller = module.get<CandidateInfoController>(CandidateInfoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCandidateInfo', () => {
    it('should create a new CandidateInfo', async () => {
      const createCandidateInfoDto = {
        appId: 1,
        email: 'john@example.com',
      };
      const request = {
        user: {
          email: 'john@example.com',
          userType: UserType.ADMIN,
        },
      };

      jest
        .spyOn(mockCandidateInfoService, 'create')
        .mockResolvedValue(defaultCandidateInfo);

      const result = await controller.createCandidateInfo(
        createCandidateInfoDto,
        request as never,
      );

      expect(result).toEqual(defaultCandidateInfo);
      expect(mockCandidateInfoService.create).toHaveBeenCalledWith(
        1,
        'john@example.com',
      );
    });

    it('should handle service errors when creating CandidateInfo', async () => {
      const createCandidateInfoDto = {
        appId: 1,
        email: 'john@example.com',
      };
      const request = {
        user: {
          email: 'john@example.com',
          userType: UserType.ADMIN,
        },
      };

      const errorMessage = 'Failed to create CandidateInfo';
      jest
        .spyOn(mockCandidateInfoService, 'create')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.createCandidateInfo(
          createCandidateInfoDto,
          request as never,
        ),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getAllCandidateInfo', () => {
    it('should return all CandidateInfo', async () => {
      const CandidateInfo: CandidateInfo[] = [
        defaultCandidateInfo,
        {
          appId: 2,
          email: 'janedoe@gmail.com',
        },
      ];
      jest
        .spyOn(mockCandidateInfoService, 'findAll')
        .mockResolvedValue(CandidateInfo);

      const result = await controller.getAllCandidateInfo();

      expect(result).toEqual(CandidateInfo);
      expect(mockCandidateInfoService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no CandidateInfo exist', async () => {
      jest.spyOn(mockCandidateInfoService, 'findAll').mockResolvedValue([]);

      const result = await controller.getAllCandidateInfo();

      expect(result).toEqual([]);
    });

    it('should error out without information loss if the service throws an error', async () => {
      jest
        .spyOn(mockCandidateInfoService, 'findAll')
        .mockRejectedValue(
          new Error('There was a problem retrieving the info'),
        );

      await expect(controller.getAllCandidateInfo()).rejects.toThrow(
        `There was a problem retrieving the info`,
      );
    });
  });

  describe('getCandidateInfoByEmail', () => {
    it('should return a specific CandidateInfo by email', async () => {
      jest
        .spyOn(mockCandidateInfoService, 'findOne')
        .mockResolvedValue(defaultCandidateInfo);
      const request = {
        user: {
          email: 'john@example.com',
          userType: UserType.ADMIN,
        },
      };

      const result = await controller.getCandidateInfoByEmail(
        'john@example.com',
        request as never,
      );

      expect(result).toEqual(defaultCandidateInfo);
      expect(mockCandidateInfoService.findOne).toHaveBeenCalledWith(
        'john@example.com',
      );
    });

    it('should throw an error if CandidateInfo is not found', async () => {
      const errorMessage =
        'CandidateInfo with email notfound@example.com not found';
      const request = {
        user: {
          email: 'john@example.com',
          userType: UserType.ADMIN,
        },
      };
      jest
        .spyOn(mockCandidateInfoService, 'findOne')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.getCandidateInfoByEmail(
          'notfound@example.com',
          request as never,
        ),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getCandidateInfoByAppId', () => {
    it('should return CandidateInfo for the given app id', async () => {
      const CandidateInfo = [defaultCandidateInfo];
      jest
        .spyOn(mockCandidateInfoService, 'findByAppId')
        .mockResolvedValue(CandidateInfo);

      const result = await controller.getCandidateInfoByAppId(1);

      expect(result).toEqual(CandidateInfo);
      expect(mockCandidateInfoService.findByAppId).toHaveBeenCalledWith(1);
    });
  });

  describe('deleteCandidateInfo', () => {
    it('should delete an CandidateInfo by email', async () => {
      jest
        .spyOn(mockCandidateInfoService, 'delete')
        .mockResolvedValue(defaultCandidateInfo);

      const result = await controller.deleteCandidateInfo('john@example.com');

      expect(result).toEqual(defaultCandidateInfo);
      expect(mockCandidateInfoService.delete).toHaveBeenCalledWith(
        'john@example.com',
      );
    });

    it('should handle service errors when deleting CandidateInfo', async () => {
      const errorMessage = 'Failed to delete CandidateInfo';
      jest
        .spyOn(mockCandidateInfoService, 'delete')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.deleteCandidateInfo('john@example.com'),
      ).rejects.toThrow('Failed to delete CandidateInfo');
    });

    it('should throw an error if CandidateInfo is not found', async () => {
      const errorMessage =
        'CandidateInfo with email notfound@example.com not found';
      jest
        .spyOn(mockCandidateInfoService, 'delete')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.deleteCandidateInfo('notfound@example.com'),
      ).rejects.toThrow(errorMessage);
    });
  });
});
