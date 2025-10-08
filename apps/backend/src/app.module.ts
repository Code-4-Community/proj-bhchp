import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import AppDataSource from './data-source';
import { ApplicationsController } from './applications/applications.controller';
import { ApplicationsService } from './applications/applications.service';
import { Application } from './applications/application.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    TypeOrmModule.forFeature([Application]),
  ],
  controllers: [AppController, ApplicationsController],
  providers: [AppService, ApplicationsService],
})
export class AppModule {}
