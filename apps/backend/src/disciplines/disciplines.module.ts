import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { AuthService } from '../auth/auth.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline]), UsersModule],
  controllers: [DisciplinesController],
  providers: [
    DisciplinesService,
    AuthService,
    JwtStrategy,
    CurrentUserInterceptor,
  ],
})
export class DiscplinesModule {}
