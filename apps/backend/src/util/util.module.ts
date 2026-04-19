import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { amazonSESClientFactory } from './email/amazon-ses-client.factory';
import { AmazonSESWrapper } from './email/amazon-ses.wrapper';
import { EmailService } from './email/email.service';
import { EmailController } from './email/email.controller';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => UsersModule)],
  providers: [EmailService, amazonSESClientFactory, AmazonSESWrapper],
  exports: [EmailService, AmazonSESWrapper],
  controllers: [EmailController],
})
export class UtilModule {}
