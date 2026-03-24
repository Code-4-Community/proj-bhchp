import { Module } from '@nestjs/common';
import { amazonSESClientFactory } from './email/amazon-ses-client.factory';
import { AmazonSESWrapper } from './email/amazon-ses.wrapper';
import { EmailService } from './email/email.service';
import { EmailController } from './email/email.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [
    EmailService,
    amazonSESClientFactory,
    AmazonSESWrapper,
    RolesGuard,
  ],
  exports: [EmailService],
  controllers: [EmailController],
})
export class UtilModule {}
