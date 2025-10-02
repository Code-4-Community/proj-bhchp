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

  // TODO: fill out with actual methods
}
