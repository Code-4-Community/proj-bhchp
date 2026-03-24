import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateInfoController } from './candidate-info.controller';
import { CandidateInfoService } from './candidate-info.service';
import { CandidateInfo } from './candidate-info.entity';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateInfo]), UsersModule, AuthModule],
  controllers: [CandidateInfoController],
  providers: [CandidateInfoService, CurrentUserInterceptor, RolesGuard],
  exports: [CandidateInfoService],
})
export class CandidateInfoModule {}
