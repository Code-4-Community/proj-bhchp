import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { DisciplinesService } from './disciplines.service';

@Controller('disciplines')
export class DisciplinesController {
  constructor(private disciplinesService: DisciplinesService) {}

  @Get('/all')
  async getFullName(): Promise<string[]> {
    return this.disciplinesService.findAllDisciplines();
  }
}
