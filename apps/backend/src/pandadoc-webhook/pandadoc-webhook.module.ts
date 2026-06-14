import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AWSS3Module } from '../util/aws-s3/aws-s3.module';
import { PandadocWebhookController } from './pandadoc-webhook.controller';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { PandadocSignatureGuard } from './pandadoc-signature.guard';

@Module({
  imports: [ConfigModule, AWSS3Module],
  controllers: [PandadocWebhookController],
  providers: [PandadocWebhookService, PandadocSignatureGuard],
})
export class PandadocWebhookModule {}
