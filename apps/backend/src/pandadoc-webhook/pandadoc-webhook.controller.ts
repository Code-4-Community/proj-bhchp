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
  async handleWebhook(@Body() body: unknown) {
    const startedAt = Date.now();
    const payloadLength = Array.isArray(body) ? body.length : 1;
    this.logger.log(
      `[PandaDoc] Incoming webhook request envelopeLength=${payloadLength}`,
    );

    try {
      const result = await this.webhookService.processWebhook(body);
      this.logger.log(
        `[PandaDoc] Webhook request completed appId=${
          result.appId
        } durationMs=${Date.now() - startedAt}`,
      );
      return { status: 'ok', appId: result.appId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startedAt;
      if (error instanceof Error) {
        this.logger.error(
          `[PandaDoc] Webhook request failed durationMs=${durationMs} error=${message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `[PandaDoc] Webhook request failed durationMs=${durationMs} error=${message}`,
        );
      }
      throw error;
    }
  }
}
