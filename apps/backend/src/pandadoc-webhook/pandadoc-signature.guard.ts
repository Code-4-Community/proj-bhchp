import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const SIGNATURE_HEADER = 'x-pandadoc-signature';

/**
 * Verifies the `x-pandadoc-signature` header against the configured
 * `PANDADOC_WEBHOOK_KEY`. If the env var is unset, the guard logs a warning
 * once and allows requests through (useful for local dev). Otherwise the
 * header must match exactly or the request is rejected with 401.
 *
 * Implemented as a guard so `UnauthorizedException` is handled by Nest's
 * default 401 response rather than being intercepted by route-scoped
 * `@Catch(Error)` exception filters.
 */
@Injectable()
export class PandadocSignatureGuard implements CanActivate {
  private readonly logger = new Logger(PandadocSignatureGuard.name);
  private readonly webhookKey: string | undefined;
  private warnedAboutMissingKey = false;

  constructor(configService: ConfigService) {
    this.webhookKey = configService.get<string>('PANDADOC_WEBHOOK_KEY');
  }

  private maskSignature(signature: string | undefined): string {
    if (!signature) return 'missing';
    if (signature.length <= 8) return '***';
    return `${signature.slice(0, 4)}...${signature.slice(-4)}`;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers[SIGNATURE_HEADER];
    const provided = Array.isArray(signature) ? signature[0] : signature;
    const sourceIp = request.ip ?? request.socket?.remoteAddress ?? 'unknown';

    if (!this.webhookKey) {
      if (!this.warnedAboutMissingKey) {
        this.logger.warn(
          'PANDADOC_WEBHOOK_KEY is not set — webhook signature verification is disabled',
        );
        this.warnedAboutMissingKey = true;
      }
      this.logger.debug(
        `[PandaDoc] Signature verification bypassed sourceIp=${sourceIp} reason=missing-config`,
      );
      return true;
    }

    this.logger.debug(
      `[PandaDoc] Verifying signature sourceIp=${sourceIp} headerPresent=${Boolean(
        provided,
      )}`,
    );

    if (!provided || provided !== this.webhookKey) {
      this.logger.warn(
        `[PandaDoc] Invalid or missing webhook signature sourceIp=${sourceIp} providedLength=${
          provided?.length ?? 0
        } providedMask=${this.maskSignature(provided)} expectedLength=${
          this.webhookKey.length
        }`,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug(
      `[PandaDoc] Signature verified sourceIp=${sourceIp} signatureMask=${this.maskSignature(
        provided,
      )}`,
    );

    return true;
  }
}
