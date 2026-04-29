import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminInfoService } from './admin-info.service';
import { AdminInfoController } from './admin-info.controller';
import { AdminInfo } from './admin-info.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DisciplinesModule } from '../disciplines/disciplines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminInfo]),
    AuthModule,
    UsersModule,
    DisciplinesModule,
  ],
  controllers: [AdminInfoController],
  providers: [AdminInfoService],
  exports: [AdminInfoService],
})
export class AdminInfoModule {}
