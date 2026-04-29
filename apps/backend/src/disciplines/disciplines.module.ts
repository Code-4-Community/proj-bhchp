import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline]), AuthModule, UsersModule],
  controllers: [DisciplinesController],
  providers: [DisciplinesService, CurrentUserInterceptor],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}
