import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Get()
  async getAllApplications(@Request() req): Promise<Application[]> {
    return await this.applicationsService.findAll();
  }

  @Get('/:appId')
  async getApplicationById(
    @Param('appId', ParseIntPipe) appId: number,
    @Request() req,
  ): Promise<Application> {
    return await this.applicationsService.findById(appId);
  }

  @Post()
  async createApplication(
    @Body() createApplicationDto: CreateApplicationDto,
    @Request() req,
  ): Promise<Application> {
    return await this.applicationsService.create(createApplicationDto);
  }
}
