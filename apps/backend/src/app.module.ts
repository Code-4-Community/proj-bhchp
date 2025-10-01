import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import AppDataSource from './data-source';
import { AdminsModule } from './users/admins.module';

@Module({
  imports: [TypeOrmModule.forRoot(AppDataSource.options), AdminsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
