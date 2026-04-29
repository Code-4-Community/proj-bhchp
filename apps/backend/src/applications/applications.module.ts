import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { AuthModule } from '../auth/auth.module';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { UsersModule } from '../users/users.module';
import { ApplicationValidationEmailFilter } from './filters/application-validation-email.filter';
import { ApplicationCreationErrorFilter } from './filters/application-creation-validation.filter';
import { UtilModule } from '../util/util.module';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { CandidateInfo } from '../candidate-info/candidate-info.entity';
import { EmailService } from '../util/email/email.service';
import { DisciplinesModule } from '../disciplines/disciplines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    TypeOrmModule.forFeature([CandidateInfo]),
    AuthModule,
    UsersModule,
    UtilModule,
    DisciplinesModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    CandidateInfoService,
    EmailService,
    CurrentUserInterceptor,
    ApplicationValidationEmailFilter,
    ApplicationCreationErrorFilter,
  ],
})
export class ApplicationsModule {}
