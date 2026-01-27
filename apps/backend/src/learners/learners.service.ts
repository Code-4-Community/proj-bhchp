import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Learner } from './learner.entity';

/**
 * Service to interface with the learner repository.
 */
@Injectable()
export class LearnersService {
  constructor(
    @InjectRepository(Learner)
    private readonly repo: Repository<Learner>,
  ) {}

  /**
   * Creates a learner in the repository.
   * @param appId The corresponding application id of the learner to create.
   * @param name The name of the learner to create (generally in the format 'First Last').
   * @param startDate The expected starting date of the learner's commitment.
   * @param endDate The expected ending date of the learner's commitment.
   * @returns The created learner.
   * @throws {BadRequestException} if any of the fields are invalid.
   * @throws {Error} If the repository throws an error.
   */
  async create(
    appId: number,
    firstName: string,
    lastName: string,
    startDate: Date,
    endDate: Date,
  ) {
    if (!appId || appId <= 0) {
      throw new BadRequestException('Valid app ID is required');
    }

    if (!firstName || firstName.trim().length === 0) {
      throw new BadRequestException('Learner first name is required');
    }

    if (!lastName || lastName.trim().length === 0) {
      throw new BadRequestException('Learner last name is required');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const learner: Learner = this.repo.create({
      appId,
      firstName,
      lastName,
      startDate,
      endDate,
    });

    return await this.repo.save(learner);
  }

  /**
   * Returns a specific learner by id.
   * @param id The id of the desired learner to return.
   * @returns The learner with the desired id.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Learner with ID <id> not found'
   *                             if the learner with the specified appId does not exist.
   */
  async findOne(id: number) {
    if (!id) {
      throw new BadRequestException('Learner ID is required');
    }

    const learner = await this.repo.findOneBy({ id });
    if (!learner) {
      throw new NotFoundException(`Learner with ID ${id} not found`);
    }

    return learner;
  }

  /**
   * Returns all learners in the repository.
   * @returns All learners in the repository.
   * @throws {Error} If the repository throws an error.
   */
  findAll() {
    return this.repo.find();
  }

  /**
   * Updates a learner's commitment starting date.
   * @param id The id of the learner to update.
   * @param startDate The new starting date for the learner's commitment.
   * @returns The updated learner object.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Learner with ID <id> not found'
   *                             if the learner with the specified appId does not exist.
   */
  async updateStartDate(id: number, startDate: Date) {
    if (!id) {
      throw new BadRequestException('Learner ID is required');
    }

    if (!startDate) {
      throw new BadRequestException('Start date is required');
    }

    const learner = await this.repo.findOneBy({ id });
    if (!learner) {
      throw new NotFoundException(`Learner with ID ${id} not found`);
    }

    if (learner.endDate && startDate >= learner.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    learner.startDate = startDate;
    return this.repo.save(learner);
  }

  /**
   * Updates a learner's commitment ending date.
   * @param id The id of the learner to update.
   * @param endDate The new ending date for the learner's commitment.
   * @returns The updated learner object.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Learner with ID <id> not found'
   *                             if the learner with the specified appId does not exist.
   */
  async updateEndDate(id: number, endDate: Date) {
    if (!id) {
      throw new BadRequestException('Learner ID is required');
    }

    if (!endDate) {
      throw new BadRequestException('End date is required');
    }

    const learner = await this.repo.findOneBy({ id });
    if (!learner) {
      throw new NotFoundException(`Learner with ID ${id} not found`);
    }

    if (learner.startDate && learner.startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    learner.endDate = endDate;
    return this.repo.save(learner);
  }

  async findByAppId(appId: number) {
    if (!appId || appId <= 0) {
      throw new BadRequestException('Valid app ID is required');
    }

    const learners = await this.repo.find({ where: { appId } });

    // If we want to error out instead of returning an empty array:
    // if (learners.length === 0) {
    //   throw new NotFoundException(`No learners found for app ID ${appId}`);
    // }

    return learners;
  }
}
