import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AWSS3Module } from './util/aws-s3/aws-s3.module';
import AppDataSource from './data-source';
import { UtilModule } from './util/util.module';
import { ApplicationsModule } from './applications/applications.module';
import { LearnerInfoModule } from './learner-info/learner-info.module';
import { Application } from './applications/application.entity';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { AdminInfoModule } from './admin-info/admin-info.module';
import { CandidateInfoModule } from './candidate-info/candidate-info.module';
import { AdminProvisioningModule } from './admin-provisioning/admin-provisioning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      migrations: [], // Don't load migrations when server starts - only load them when running migration commands (i had to add this to get the server to run without errors)
    }),
    UtilModule,
    AdminInfoModule,
    UsersModule,
    AWSS3Module,
    TypeOrmModule.forFeature([Application]),
    DisciplinesModule,
    CandidateInfoModule,
    AdminProvisioningModule,
    LearnerInfoModule,
    ApplicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
