import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  AdminsService,
  CreateAdminDto,
  UpdateAdminEmailDto,
} from './admins.service';
import { Admin } from './admin.entity';
import { Site } from './types';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';

@Controller('admins')
@UseInterceptors(CurrentUserInterceptor) // Apply authentication to all routes
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  async create(@Body() createAdminDto: CreateAdminDto): Promise<Admin> {
    return await this.adminsService.create(createAdminDto);
  }

  @Get()
  async findAll(@Query('site') site?: Site): Promise<Admin[]> {
    if (site) {
      return await this.adminsService.findBySite(site);
    }
    return await this.adminsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Admin> {
    return await this.adminsService.findOne(id);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string): Promise<Admin | null> {
    return await this.adminsService.findByEmail(email);
  }

  @Patch(':id/email')
  async updateEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmailDto: UpdateAdminEmailDto,
  ): Promise<Admin> {
    return await this.adminsService.updateEmail(id, updateEmailDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.adminsService.remove(id);
    return { message: `Admin with ID ${id} has been deleted` };
  }
}
