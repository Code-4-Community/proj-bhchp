import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import {
  AppStatus,
  ExperienceType,
  InterestArea,
  ApplicantType,
} from './types';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';

const mockApplicationsService: Partial<ApplicationsService> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByDiscipline: jest.fn(),
  updateProposedStartDate: jest.fn(),
  updateActualStartDate: jest.fn(),
  updateEndDate: jest.fn(),
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
  experienceType: ExperienceType.BS,
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
  desiredExperience:
    'I want to give back to the boston community and learn to talk better with patients',
  resume: 'janedoe_resume_2_6_2026.pdf',
  coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '111-111-1111',
  emergencyContactRelationship: 'Mother',
  heardAboutFrom: [],
  proposedStartDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'),
};

describe('ApplicationsController', () => {
  let controller: ApplicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
});
