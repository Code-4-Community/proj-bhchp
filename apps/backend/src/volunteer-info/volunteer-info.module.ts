import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteerInfoController } from './volunteer-info.controller';
import { VolunteerInfoService } from './volunteer-info.service';
import { VolunteerInfo } from './volunteer-info.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([VolunteerInfo]), AuthModule, UsersModule],
  controllers: [VolunteerInfoController],
  providers: [VolunteerInfoService, RolesGuard],
})
export class VolunteerInfoModule {}
