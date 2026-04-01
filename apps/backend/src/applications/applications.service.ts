import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import { AppStatus, PHONE_REGEX } from './types';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';

/**
 * Service for applications that interfaces with the application repository.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  /**
   * Validates the fields of a CreateApplicationDto.
   * @param dto The DTO to validate.
   * @throws {BadRequestException} if any field fails validation.
   */
  private validateApplicationDto(dto: CreateApplicationDto): void {
    // Validate phone number format
    if (!PHONE_REGEX.test(dto.phone)) {
      throw new BadRequestException(
        'Phone number must be in ###-###-#### format',
      );
    }

    // Validate weeklyHours is positive
    if (dto.weeklyHours <= 0 || dto.weeklyHours > 7 * 24) {
      throw new BadRequestException(
        'Weekly hours must be greater than 0 and less than 7 * 24 hours',
      );
    }
  }

  /**
   * Returns all applications in the repository.
   * @returns A promise resolving to all applications in the repository.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async findAll(): Promise<Application[]> {
    return await this.applicationRepository.find();
  }

  /**
   * Returns the total number of applications.
   * @returns A promise resolving to the total number of applications.
   */
  async countAll(): Promise<number> {
    return await this.applicationRepository.count();
  }

  /**
   * Returns the number of applications in review.
   * @returns A promise resolving to the count for AppStatus.IN_REVIEW.
   */
  async countInReview(): Promise<number> {
    return await this.applicationRepository.count({
      where: { appStatus: AppStatus.IN_REVIEW },
    });
  }

  /**
   * Returns the number of rejected applications.
   * @returns A promise resolving to the count for declined applications.
   */
  async countRejected(): Promise<number> {
    return await this.applicationRepository.count({
      where: { appStatus: AppStatus.DECLINED },
    });
  }

  /**
   * Returns the number of approved/active applications.
   * @returns A promise resolving to the count for accepted or active applications.
   */
  async countApprovedOrActive(): Promise<number> {
    return await this.applicationRepository.count({
      where: { appStatus: In([AppStatus.ACCEPTED, AppStatus.ACTIVE]) },
    });
  }

  /**
   * Returns an application by id from the repository.
   * @param appId The desired application id to search for.
   * @returns A promise resolving to the application with that id.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if an application with that id does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async findById(appId: number): Promise<Application> {
    const application: Application = await this.applicationRepository.findOne({
      where: { appId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }

    return application;
  }

  /**
   * Validates that the provided discipline is a valid DISCIPLINE_VALUES enum value.
   * @param discipline The discipline value to validate.
   * @throws {BadRequestException} if the discipline is not a valid DISCIPLINE_VALUES enum value.
   */
  private validateDiscipline(discipline: string): void {
    if (
      !Object.values(DISCIPLINE_VALUES).includes(
        discipline as DISCIPLINE_VALUES,
      )
    ) {
      throw new BadRequestException(
        `Invalid discipline: ${discipline}. Valid disciplines are: ${Object.values(
          DISCIPLINE_VALUES,
        ).join(', ')}`,
      );
    }
  }

  /**
   * Returns all applications that have the specified discipline.
   * @param discipline The discipline to filter applications by.
   * @returns A promise resolving to an array of applications with the specified discipline.
   *          Returns an empty array if no applications match the discipline.
   * @throws {BadRequestException} if the discipline is not a valid DISCIPLINE_VALUES enum value.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async findByDiscipline(discipline: string): Promise<Application[]> {
    this.validateDiscipline(discipline);
    return await this.applicationRepository.find({
      where: { discipline: discipline as DISCIPLINE_VALUES },
    });
  }

  /**
   * Creates an application in the repository.
   * @param createApplicationDto The expected data required to create an application (applicant's info).
   * @returns The newly created application.
   * @throws {BadRequestException} if validation fails.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    this.validateApplicationDto(createApplicationDto);
    const application = this.applicationRepository.create(createApplicationDto);
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates the status of the application in the repository.
   * @param appId The id of the application to update.
   * @param updateData Object containing the desired new application status.
   * @returns The updated application object.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if the application does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async update(
    appId: number,
    updateData: Partial<CreateApplicationDto>,
  ): Promise<Application> {
    const application = await this.findById(appId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }
    Object.assign(application, updateData);
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates an application's commitment starting date with validation.
   * @param appId The id of the application to update.
   * @param proposedStartDate The new starting date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if the date is invalid or not before endDate (when present).
   * @throws {NotFoundException} if the application does not exist.
   */
  async updateProposedStartDate(
    appId: number,
    proposedStartDate: Date,
  ): Promise<Application> {
    if (!appId) {
      throw new BadRequestException('Application ID is required');
    }

    if (!proposedStartDate) {
      throw new BadRequestException('Start date is required');
    }

    if (isNaN(proposedStartDate.getTime())) {
      throw new BadRequestException('Start date must be a valid date');
    }

    const application = await this.findById(appId);

    if (application.endDate && proposedStartDate >= application.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    application.proposedStartDate = proposedStartDate;
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates an application's actual commitment starting date with validation.
   * @param appId The id of the application to update.
   * @param actualStartDate The new starting date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if the date is invalid or not before endDate (when present).
   * @throws {NotFoundException} if the application does not exist.
   */
  async updateActualStartDate(
    appId: number,
    actualStartDate: Date,
  ): Promise<Application> {
    if (!appId) {
      throw new BadRequestException('Application ID is required');
    }

    if (!actualStartDate) {
      throw new BadRequestException('Start date is required');
    }

    if (isNaN(actualStartDate.getTime())) {
      throw new BadRequestException('Start date must be a valid date');
    }

    const application = await this.findById(appId);

    if (application.endDate && actualStartDate >= application.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    application.proposedStartDate = actualStartDate;
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates an application's commitment ending date with validation.
   * @param appId The id of the application to update.
   * @param endDate The new ending date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if the date is invalid or not after proposedStartDate (when present).
   * @throws {NotFoundException} if the application does not exist.
   */
  async updateEndDate(appId: number, endDate: Date): Promise<Application> {
    if (!appId) {
      throw new BadRequestException('Application ID is required');
    }

    if (!endDate) {
      throw new BadRequestException('End date is required');
    }

    if (isNaN(endDate.getTime())) {
      throw new BadRequestException('End date must be a valid date');
    }

    const application = await this.findById(appId);

    if (
      application.proposedStartDate &&
      application.proposedStartDate >= endDate
    ) {
      throw new BadRequestException('End date must be after start date');
    }

    application.endDate = endDate;
    return await this.applicationRepository.save(application);
  }

  async delete(appId: number): Promise<void> {
    const application = await this.findById(appId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }
    await this.applicationRepository.remove(application);
  }
}
