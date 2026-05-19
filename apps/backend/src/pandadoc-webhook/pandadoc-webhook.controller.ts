import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { PandadocSignatureGuard } from './pandadoc-signature.guard';

/**
 * Public endpoint that receives PandaDoc webhook events.
 * Authenticated by `x-pandadoc-signature` (see {@link PandadocSignatureGuard}),
 * not by JWT — PandaDoc calls this externally.
 */
@ApiTags('PandaDoc Webhook')
@Controller('pandadoc-webhook')
@UseGuards(PandadocSignatureGuard)
export class PandadocWebhookController {
  private readonly logger = new Logger(PandadocWebhookController.name);

  constructor(private readonly webhookService: PandadocWebhookService) {}

  @Post()
  async handleWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log('[PandaDoc] Incoming webhook request');
    const result = await this.webhookService.processWebhook(body);
    return { status: 'ok', appId: result.appId };
  }
}
