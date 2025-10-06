import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscplinesModule } from './disciplines/disciplines.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import AppDataSource from './data-source';
import { Discipline } from './disciplines/disciplines.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    DiscplinesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
