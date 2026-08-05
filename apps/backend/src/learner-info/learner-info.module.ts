import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearnerInfoController } from './learner-info.controller';
import { LearnerInfoService } from './learner-info.service';
import { LearnerInfo } from './learner-info.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LearnerInfo]),
    AuthModule,
    UsersModule,
    ApplicationsModule,
  ],
  controllers: [LearnerInfoController],
  providers: [LearnerInfoService, CurrentUserInterceptor],
  exports: [LearnerInfoService],
})
export class LearnerInfoModule {}
