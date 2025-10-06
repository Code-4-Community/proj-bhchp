import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline } from './disciplines.entity';

@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private disciplinesRepository: Repository<Discipline>,
  ) {}

  async findAllDisciplines(): Promise<string[]> {
    const disciplines = await this.disciplinesRepository.find();
    console.log(disciplines);
    return disciplines.map((discipline) => discipline.name);
  }
}
