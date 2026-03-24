import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearnerInfoController } from './learner-info.controller';
import { LearnerInfoService } from './learner-info.service';
import { LearnerInfo } from './learner-info.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([LearnerInfo]), AuthModule, UsersModule],
  controllers: [LearnerInfoController],
  providers: [LearnerInfoService, RolesGuard],
})
export class LearnerInfoModule {}
