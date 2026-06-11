import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * PandaDoc sends an HMAC-SHA256 hex digest of the raw JSON payload as a
 * `?signature=` query parameter (not a header). The guard recomputes the
 * expected digest from the raw body bytes captured by NestJS (`rawBody: true`
 * in `NestFactory.create`) and performs a timing-safe comparison.
 *
 * If PANDADOC_WEBHOOK_KEY is unset the guard logs a one-time warning and
 * allows the request through so local development still works.
 */
@Injectable()
export class PandadocSignatureGuard implements CanActivate {
  private readonly logger = new Logger(PandadocSignatureGuard.name);
  private readonly webhookKey: string | undefined;
  private warnedAboutMissingKey = false;

  constructor(configService: ConfigService) {
    this.webhookKey = configService.get<string>('PANDADOC_WEBHOOK_KEY');
  }

  private maskHex(value: string | undefined): string {
    if (!value) return 'missing';
    if (value.length <= 8) return '***';
    return `${value.slice(0, 6)}...${value.slice(-6)}`;
  }

  private logIncomingRequestSnapshot(request: Request): void {
    try {
      const snapshot = {
        method: request.method,
        originalUrl: request.originalUrl,
        url: request.url,
        baseUrl: request.baseUrl,
        path: request.path,
        ip: request.ip,
        params: request.params,
        query: request.query,
        headers: request.headers,
        body: request.body,
      };

      this.logger.debug(
        `[PandaDoc] Incoming request snapshot: ${JSON.stringify(snapshot)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[PandaDoc] Failed to serialize incoming request snapshot error=${message}`,
      );
    }
  }

  private computeExpectedSignature(rawBody: Buffer): string {
    return createHmac('sha256', this.webhookKey!).update(rawBody).digest('hex');
  }

  private signaturesMatch(expected: string, provided: string): boolean {
    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    this.logIncomingRequestSnapshot(request);

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

    const provided =
      typeof request.query['signature'] === 'string'
        ? request.query['signature']
        : undefined;

    this.logger.debug(
      `[PandaDoc] Verifying HMAC-SHA256 signature sourceIp=${sourceIp} signaturePresent=${Boolean(
        provided,
      )} signatureLength=${provided?.length ?? 0}`,
    );

    if (!provided) {
      this.logger.warn(
        `[PandaDoc] Missing signature query param sourceIp=${sourceIp} url=${request.originalUrl}`,
      );
      throw new UnauthorizedException('Missing webhook signature');
    }

    const rawBody: Buffer | undefined = (
      request as unknown as { rawBody?: Buffer }
    ).rawBody;

    if (!rawBody) {
      this.logger.error(
        '[PandaDoc] rawBody is unavailable — ensure rawBody:true is set in NestFactory.create()',
      );
      throw new UnauthorizedException('Cannot verify webhook signature');
    }

    const expected = this.computeExpectedSignature(rawBody);

    if (!this.signaturesMatch(expected, provided)) {
      this.logger.warn(
        `[PandaDoc] Signature mismatch sourceIp=${sourceIp} providedMask=${this.maskHex(
          provided,
        )} expectedMask=${this.maskHex(expected)} rawBodyLength=${
          rawBody.length
        }`,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug(
      `[PandaDoc] Signature verified sourceIp=${sourceIp} signatureMask=${this.maskHex(
        provided,
      )} rawBodyLength=${rawBody.length}`,
    );

    return true;
  }
}
