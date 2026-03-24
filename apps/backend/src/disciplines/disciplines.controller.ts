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
} from '@nestjs/common';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineRequestDto } from './dto/create-discipline.request.dto';
import { Discipline } from './disciplines.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/types';

/**
 * Controller to expose callable HTTP endpoints to interface,
 * extract, and change information about the app's disciplines.
 */
@Controller('disciplines')
@UseInterceptors(CurrentUserInterceptor)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserType.ADMIN, UserType.STANDARD)
export class DisciplinesController {
  constructor(private disciplinesService: DisciplinesService) {}

  /**
   * Exposes an endpoint to return a list of all disciplines
   * @returns a list of all disciplines
   */
  @Get()
  async getAll(): Promise<Discipline[]> {
    return this.disciplinesService.findAll();
  }

  /**
   * Exposes an endpoint to return a discipline by email
   * @param email the email of the discipline to return
   * @returns the discipline with the corresponding email
   */
  @Get(':email')
  async getOne(@Param('email') email: string): Promise<Discipline> {
    return this.disciplinesService.findOne(Number(email));
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
   * Deletes a discipline by email
   * @param email the email of the discipline to delete
   * @returns the deleted discipline
   * @throws {NotFoundException} if a discipline of the specified email doesn't exist in the repository.
   * @throws {Error} if the repository throws an error.
   */
  @Delete(':email')
  @Roles(UserType.ADMIN)
  async remove(
    @Param('email', ParseIntPipe) email: number,
  ): Promise<Discipline> {
    return this.disciplinesService.remove(email);
  }

  /**
   * Adds an admin email to a discipline
   * @param email the discipline id
   * @param adminemail the admin email to add
   * @returns the updated discipline
   * @throws {NotFoundException} if a discipline of the specified email doesn't exist in the repository.
   * @throws {Error} if the repository throws an error.
   */
  @Post(':email/admins/:adminEmail')
  @Roles(UserType.ADMIN)
  async addAdmin(
    @Param('email', ParseIntPipe) email: number,
    @Param('adminEmail') adminEmail: string,
  ): Promise<Discipline> {
    return this.disciplinesService.addAdmin(email, adminEmail);
  }

  /**
   * Removes an admin email from a discipline
   * @param email the discipline id
   * @param adminemail the admin email to remove
   * @returns the updated discipline
   * @throws {NotFoundException} if a discipline of the specified email doesn't exist in the repository.
   * @throws {Error} if the repository throws an error.
   */
  @Delete(':email/admins/:adminEmail')
  @Roles(UserType.ADMIN)
  async removeAdmin(
    @Param('email', ParseIntPipe) email: number,
    @Param('admiEemail') adminEmail: string,
  ): Promise<Discipline> {
    return this.disciplinesService.removeAdmin(email, adminEmail);
  }
}
