import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  ParseIntPipe,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineRequestDto } from './dto/create-discipline.request.dto';
import { Discipline } from './disciplines.entity';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/types';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Controller to expose callable HTTP endpoints to interface,
 * extract, and change information about the app's disciplines.
 */
@Controller('disciplines')
@UseInterceptors(CurrentUserInterceptor)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DisciplinesController {
  constructor(private disciplinesService: DisciplinesService) {}

  /**
   * Exposes an endpoint to return a list of all disciplines
   * @returns a list of all disciplines
   */
  @Get()
  @Roles(UserType.ADMIN)
  async getAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<Discipline[]> {
    if (includeInactive === 'true') {
      return this.disciplinesService.findAllIncludingInactive();
    }

    return this.disciplinesService.findAll();
  }

  /**
   * Exposes an endpoint to return a discipline by id
   * @param id the id of the discipline to return
   * @returns the discipline with the corresponding id
   */
  @Get(':id')
  @Roles(UserType.ADMIN)
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<Discipline> {
    return this.disciplinesService.findOne(id);
  }

  /**
   * Exposes an endpoint to create a new discipline
   * @param createDto object containing necessary info to create an new discipline, like the name
   * @returns the new discipline
   */
  @Post()
  @Roles(UserType.ADMIN)
  async create(
    @Body() createDto: CreateDisciplineRequestDto,
  ): Promise<Discipline> {
    return this.disciplinesService.create(createDto);
  }

  /**
   * Deletes a discipline by id
   * @param id the id of the discipline to delete
   * @returns the deleted discipline
   * @throws {NotFoundException} if a discipline of the specified id doesn't exist in the repository.
   * @throws {Error} if the repository throws an error.
   */
  @Delete(':id')
  @Roles(UserType.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Discipline> {
    return this.disciplinesService.remove(id);
  }
}
