import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { AdminInfoService } from './admin-info.service';
import { AdminInfo } from './admin-info.entity';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { CreateAdminInfoDto } from './dto/create-admin.dto';
import { UpdateAdminInfoEmailDto } from './dto/update-admin-email.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserType } from '../users/types';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DisciplineAdminMap } from './admin-info.service';

/**
 * Controller to expose callable HTTP endpoints to interface
 * extract, and change information about the app's admins.
 */
@Controller('admin-info')
@UseInterceptors(CurrentUserInterceptor)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserType.ADMIN)
export class AdminInfoController {
  constructor(private readonly adminsService: AdminInfoService) {}

  /**
   * Exposes an endpoint that returns one admin per discipline.
   * For disciplines with multiple admins, the oldest admin record is selected.
   * @returns a discipline -> admin name map used by admin landing table rendering.
   */
  @Get('discipline-admin-map')
  async getDisciplineAdminMap(): Promise<DisciplineAdminMap> {
    return await this.adminsService.getOldestDisciplineAdminMap();
  }

  /**
   * Exposes an endpoint to create an admin in the system.
   * @param createAdminInfoDto object containing all of the necessary fields to create an admin.
   * @returns the new admin object.
   * @throws {Error} anything that the repository throws.
   */
  @Post()
  async create(
    @Body() createAdminInfoDto: CreateAdminInfoDto,
  ): Promise<AdminInfo> {
    return await this.adminsService.create(createAdminInfoDto);
  }

  /**
   * Exposes an endpoint to return an admin's information by their email.
   * @param email the email of the desired admin (primary key).
   * @returns the admin with the desired email.
   * @throws {NotFoundException} if an admin with the desired email does not exist.
   * @throws {Error} anything that the repository throws.
   */
  @Get('email/:email')
  async findOne(@Param('email') email: string): Promise<AdminInfo> {
    return await this.adminsService.findOne(email);
  }

  /**
   * Exposes an endpoint to return an admin by email, or null if not found.
   * @param email the email of the desired admin.
   * @returns the admin with the desired email, or null if not found.
   * @throws {Error} anything that the repository throws.
   */
  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string): Promise<AdminInfo | null> {
    return await this.adminsService.findByEmail(email);
  }

  /**
   * Exposes an endpoint to update an admin's email.
   * @param email the email of the admin to update (current primary key).
   * @param updateEmailDto object containing the new email.
   * @returns the updated admin object.
   * @throws {Error} anything that the repository throws.
   */
  @Patch('email/:email')
  async updateEmail(
    @Param('email') email: string,
    @Body() updateEmailDto: UpdateAdminInfoEmailDto,
  ): Promise<AdminInfo> {
    return await this.adminsService.updateEmail(email, updateEmailDto);
  }

  /**
   * Exposes an endpoint to delete an admin by email.
   * @param email the email of the admin to be deleted (primary key).
   * @returns object with a message confirming deletion.
   * @throws {Error} anything that the repository throws.
   */
  @Delete('email/:email')
  async remove(@Param('email') email: string): Promise<{ message: string }> {
    await this.adminsService.remove(email);
    return { message: `AdminInfo with email ${email} has been deleted` };
  }
}
