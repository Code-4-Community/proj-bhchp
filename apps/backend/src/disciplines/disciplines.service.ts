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

  async getActiveDisciplineKeys(): Promise<string[]> {
    const rows = await this.disciplinesRepository.find({
      where: { isActive: true },
      select: { key: true },
      order: { key: 'ASC' },
    });

    return rows.map((row) => row.key);
  }

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

  async ensureActiveDisciplineKeys(keys: string[]): Promise<void> {
    if (!keys.length) {
      throw new BadRequestException('At least one discipline is required');
    }

    const uniqueKeys = [...new Set(keys)];
    for (const key of uniqueKeys) {
      await this.ensureActiveDisciplineKey(key);
    }
  }

  async create(createDto: CreateDisciplineRequestDto): Promise<Discipline> {
    const discipline = this.disciplinesRepository.create({
      key: createDto.key.trim().toLowerCase(),
      label: createDto.label.trim(),
      isActive: createDto.isActive ?? true,
    });
    return this.disciplinesRepository.save(discipline);
  }

  /**
   * Deletes a discipline by email
   * @param email the email of the discipline to delete
   * @returns the deleted discipline
   * @throws {NotFoundException} if a discipline of the specified email doesn't exist in the repository.
   * @throws {Error} if the repository throws an error.
   */
  async remove(id: number): Promise<Discipline> {
    const discipline = await this.findOne(id);
    return this.disciplinesRepository.remove(discipline);
  }
}
