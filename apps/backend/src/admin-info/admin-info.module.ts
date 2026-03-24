import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminInfoService } from './admin-info.service';
import { AdminInfoController } from './admin-info.controller';
import { AdminInfo } from './admin-info.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [AuthModule, UsersModule, TypeOrmModule.forFeature([AdminInfo])],
  controllers: [AdminInfoController],
  providers: [AdminInfoService, RolesGuard],
  exports: [AdminInfoService],
})
export class AdminInfoModule {}
