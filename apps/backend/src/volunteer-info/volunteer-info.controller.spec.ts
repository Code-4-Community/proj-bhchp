import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VolunteerInfoController } from './volunteer-info.controller';
import { VolunteerInfoService } from './volunteer-info.service';
import { VolunteerInfo } from './volunteer-info.entity';
import { CreateVolunteerInfoDto } from './dto/create-volunteer-info.request.dto';
import { BadRequestException } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';

describe('VolunteerInfoController', () => {
  let controller: VolunteerInfoController;

  const mockVolunteerInfoService = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VolunteerInfoController],
      providers: [
        {
          provide: VolunteerInfoService,
          useValue: mockVolunteerInfoService,
        },
        {
          provide: getRepositoryToken(VolunteerInfo),
          useValue: {},
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<VolunteerInfoController>(VolunteerInfoController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /', () => {
    it('should create a new volunteer info', async () => {
      const createVolunteerInfo: CreateVolunteerInfoDto = {
        appId: 0,
        license: 'example',
      };

      mockVolunteerInfoService.create.mockResolvedValue(
        createVolunteerInfo as VolunteerInfo,
      );

      // Call controller method
      const result = await controller.createVolunteerInfo(createVolunteerInfo);

      // Verify results
      expect(result).toEqual(createVolunteerInfo as VolunteerInfo);
      expect(mockVolunteerInfoService.create).toHaveBeenCalledWith(
        createVolunteerInfo,
      );
    });

    it('should pass along any service errors without information loss', async () => {
      mockVolunteerInfoService.create.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );
      const createVolunteerInfoDto: CreateVolunteerInfoDto = {
        appId: 0,
        license: 'example',
      };

      await expect(
        controller.createVolunteerInfo(createVolunteerInfoDto),
      ).rejects.toThrow(new Error(`There was a problem retrieving the info`));
    });

    it('should not accept negative appId', async () => {
      const createVolunteerInfoDto: CreateVolunteerInfoDto = {
        appId: 0,
        license: 'example',
      };

      mockVolunteerInfoService.create.mockRejectedValue(
        new BadRequestException('appId must not be negative'),
      );

      await expect(
        controller.createVolunteerInfo(createVolunteerInfoDto),
      ).rejects.toThrow(new BadRequestException(`appId must not be negative`));
    });
  });

  describe('GET /:id', () => {
    it('should return a volunteer info by appId', async () => {
      const volunteerInfo: VolunteerInfo = {
        appId: 0,
        license: 'example',
      };

      mockVolunteerInfoService.findById.mockResolvedValue(volunteerInfo);

      const result = await controller.getVolunteerInfo(0);

      expect(result).toEqual(volunteerInfo);
      expect(mockVolunteerInfoService.findById).toHaveBeenCalledWith(0);
    });
  });
});
