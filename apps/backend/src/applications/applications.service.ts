import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  async findAll(): Promise<Application[]> {
    return await this.applicationRepository.find();
  }

  async findById(appId: number): Promise<Application> {
    const application: Application = await this.applicationRepository.findOne({
      where: { appId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }

    return application;
  }

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    const application = this.applicationRepository.create(createApplicationDto);
    return await this.applicationRepository.save(application);
  }
}
