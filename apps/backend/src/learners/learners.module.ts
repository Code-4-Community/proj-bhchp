import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearnersController } from './learners.controller';
import { LearnersService } from './learners.service';
import { Learner } from './learner.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Learner])],
  controllers: [LearnersController],
  providers: [
    LearnersService,
    AuthService,
    JwtStrategy,
    CurrentUserInterceptor,
  ],
  exports: [LearnersService],
})
export class LearnersModule {}
