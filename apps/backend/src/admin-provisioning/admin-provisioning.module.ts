import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { AdminDisciplineMap } from '../admin-info/admin-discipline-map.entity';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { AdminProvisioningController } from './admin-provisioning.controller';
import { AdminProvisioningService } from './admin-provisioning.service';
import { cognitoIdentityProviderFactory } from './cognito.provider';
import { DisciplinesModule } from '../disciplines/disciplines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AdminInfo, AdminDisciplineMap]),
    AuthModule,
    UsersModule,
    DisciplinesModule,
  ],
  controllers: [AdminProvisioningController],
  providers: [AdminProvisioningService, cognitoIdentityProviderFactory],
  exports: [AdminProvisioningService],
})
export class AdminProvisioningModule {}
