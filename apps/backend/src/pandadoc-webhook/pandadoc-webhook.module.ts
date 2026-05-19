import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PandadocWebhookController } from './pandadoc-webhook.controller';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { PandadocSignatureGuard } from './pandadoc-signature.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PandadocWebhookController],
  providers: [PandadocWebhookService, PandadocSignatureGuard],
})
export class PandadocWebhookModule {}
