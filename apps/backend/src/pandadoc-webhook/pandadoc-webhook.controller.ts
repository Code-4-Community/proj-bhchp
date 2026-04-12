import {
  Controller,
  Post,
  Body,
  Logger,
  UnauthorizedException,
  Headers,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { ApplicationValidationEmailFilter } from '../applications/filters/application-validation-email.filter';
import { ApplicationCreationErrorFilter } from '../applications/filters/application-creation-validation.filter';

/**
 * Public endpoint that receives PandaDoc webhook events.
 * No JWT auth — PandaDoc calls this externally.
 */
@ApiTags('PandaDoc Webhook')
@Controller('pandadoc-webhook')
export class PandadocWebhookController {
  private readonly logger = new Logger(PandadocWebhookController.name);
  private readonly webhookKey: string | undefined;

  constructor(
    private readonly webhookService: PandadocWebhookService,
    configService: ConfigService,
  ) {
    this.webhookKey = configService.get<string>('PANDADOC_WEBHOOK_KEY');
    if (!this.webhookKey) {
      this.logger.warn(
        'PANDADOC_WEBHOOK_KEY is not set — webhook signature verification is disabled',
      );
    }
  }

  @Post()
  @UseFilters(ApplicationCreationErrorFilter, ApplicationValidationEmailFilter)
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-pandadoc-signature') signature?: string,
  ) {
    this.logger.log('[PandaDoc] Incoming webhook request');

    // Verify webhook key if configured
    if (this.webhookKey) {
      if (!signature || signature !== this.webhookKey) {
        this.logger.warn('[PandaDoc] Invalid or missing webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const result = await this.webhookService.processWebhook(body);
    return { status: 'ok', appId: result.appId };
  }
}
