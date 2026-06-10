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

  private getBodyStringField(
    body: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = body[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  @Post()
  async handleWebhook(@Body() body: Record<string, unknown>) {
    const startedAt = Date.now();
    const payloadKeys = Object.keys(body ?? {});
    const eventType = this.getBodyStringField(body, 'event') ?? 'unknown';
    const documentId =
      this.getBodyStringField(body, 'document_id') ??
      this.getBodyStringField(body, 'id') ??
      'unknown';

    this.logger.log(
      `[PandaDoc] Incoming webhook request event=${eventType} documentId=${documentId} payloadFieldCount=${payloadKeys.length}`,
    );
    this.logger.debug(
      `[PandaDoc] Payload key sample: ${
        payloadKeys.slice(0, 20).join(', ') || 'none'
      }`,
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
          `[PandaDoc] Webhook request failed event=${eventType} documentId=${documentId} durationMs=${durationMs} error=${message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `[PandaDoc] Webhook request failed event=${eventType} documentId=${documentId} durationMs=${durationMs} error=${message}`,
        );
      }
      throw error;
    }
  }
}
