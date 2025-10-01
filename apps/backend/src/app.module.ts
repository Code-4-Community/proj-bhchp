import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AWSS3Module } from './aws-s3/aws-s3.module';
import AppDataSource from './data-source';

@Module({
  imports: [TypeOrmModule.forRoot(AppDataSource.options), AWSS3Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
