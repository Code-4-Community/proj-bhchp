import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline } from './disciplines.entity';
import { CreateDisciplineRequestDto } from './dto/create-discipline.request.dto';

/**
 * Service to interface with the disciplines repository.
 */
@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private disciplinesRepository: Repository<Discipline>,
  ) {}

  /**
   * Returns a list of all disciplines in the repository
   * @returns a list of all disciplines in the repository
   */
  async findAll(): Promise<Discipline[]> {
    return this.disciplinesRepository.find({
      where: { isActive: true },
      order: { label: 'ASC' },
    });
  }

  /**
   * Returns all disciplines, including inactive rows.
   * @returns a list of all disciplines sorted by label.
   */
  async findAllIncludingInactive(): Promise<Discipline[]> {
    return this.disciplinesRepository.find({
      order: { label: 'ASC' },
    });
  }

  /**
   * Returns a discipline from the repository with the respective email
   * @param email the email corresponding to the desired discipline
   * @returns a discipline from the repository with the respective email
   */
  async findOne(id: number): Promise<Discipline> {
    const discipline = await this.disciplinesRepository.findOneBy({ id });
    if (!discipline) {
      throw new NotFoundException(`Discipline with id ${id} not found`);
    }
    return discipline;
  }

  /**
   * Returns active discipline keys from the catalog.
   * @returns a sorted list of active discipline keys.
   */
  async getActiveDisciplineKeys(): Promise<string[]> {
    const rows = await this.disciplinesRepository.find({
      where: { isActive: true },
      select: { key: true },
      order: { key: 'ASC' },
    });

    return rows.map((row) => row.key);
  }

  /**
   * Validates that a discipline key exists and is active.
   * @param key the discipline key to validate.
   * @throws {BadRequestException} if the key is invalid or inactive.
   * @throws {Error} anything that the repository throws.
   */
  async ensureActiveDisciplineKey(key: string): Promise<void> {
    const isValid = await this.disciplinesRepository.exists({
      where: { key, isActive: true },
    });

    if (!isValid) {
      const validDisciplines = await this.getActiveDisciplineKeys();
      throw new BadRequestException(
        `Invalid discipline: ${key}. Valid disciplines are: ${validDisciplines.join(
          ', ',
        )}`,
      );
    }
  }

  /**
   * Validates that all provided discipline keys exist and are active.
   * @param keys the discipline keys to validate.
   * @throws {BadRequestException} if the list is empty or any key is invalid/inactive.
   * @throws {Error} anything that the repository throws.
   */
  async ensureActiveDisciplineKeys(keys: string[]): Promise<void> {
    if (!keys.length) {
      throw new BadRequestException('At least one discipline is required');
    }

    const uniqueKeys = [...new Set(keys)];
    for (const key of uniqueKeys) {
      await this.ensureActiveDisciplineKey(key);
    }
  }

  /**
   * Creates a discipline record in the repository.
   * @param createDto object containing key, label, and optional active flag.
   * @returns the newly created discipline.
   * @throws {Error} anything that the repository throws.
   */
  async create(createDto: CreateDisciplineRequestDto): Promise<Discipline> {
    const discipline = this.disciplinesRepository.create({
      key: createDto.key.trim().toLowerCase(),
      label: createDto.label.trim(),
      isActive: createDto.isActive ?? true,
    });
    return this.disciplinesRepository.save(discipline);
  }

  /**
   * Deletes a discipline by id
   * @param email the id of the discipline to delete
   * @returns the deleted discipline
   * @throws {NotFoundException} if a discipline of the specified id doesn't exist in the repository.
   * @throws {Error} if the repository throws an error.
   */
  async remove(id: number): Promise<Discipline> {
    const discipline = await this.findOne(id);
    return this.disciplinesRepository.remove(discipline);
  }
}
