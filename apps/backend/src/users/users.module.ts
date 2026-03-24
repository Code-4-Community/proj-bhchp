import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module'; // Add this import
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService,
    AuthService,
    JwtStrategy,
    CurrentUserInterceptor,
    RolesGuard,
  ],
  exports: [UsersService],
})
export class UsersModule {}
