import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { AdminProvisioningController } from './admin-provisioning.controller';
import { AdminProvisioningService } from './admin-provisioning.service';
import { cognitoIdentityProviderFactory } from './cognito.provider';
import { DisciplinesModule } from '../disciplines/disciplines.module';
import { UtilModule } from '../util/util.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AdminInfo]),
    AuthModule,
    UsersModule,
    DisciplinesModule,
    UtilModule,
  ],
  controllers: [AdminProvisioningController],
  providers: [AdminProvisioningService, cognitoIdentityProviderFactory],
  exports: [AdminProvisioningService],
})
export class AdminProvisioningModule {}
