import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline])],
  controllers: [DisciplinesController],
  providers: [DisciplinesService, JwtStrategy, CurrentUserInterceptor],
})
export class ReviewsModule {}
