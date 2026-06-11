import { createHmac } from 'crypto';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PandadocSignatureGuard } from './pandadoc-signature.guard';

const KEY = 'sandbox-key-abc123';
const BODY = Buffer.from(JSON.stringify([{ event: 'document_completed' }]));

function hmac(key: string, body: Buffer): string {
  return createHmac('sha256', key).update(body).digest('hex');
}

function makeContext(opts: {
  querySignature?: string;
  rawBody?: Buffer;
  headers?: Record<string, string | string[]>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        originalUrl: '/api/pandadoc-webhook',
        url: '/api/pandadoc-webhook',
        baseUrl: '',
        path: '/api/pandadoc-webhook',
        ip: '127.0.0.1',
        params: {},
        query:
          opts.querySignature !== undefined
            ? { signature: opts.querySignature }
            : {},
        headers: opts.headers ?? { 'content-type': 'application/json' },
        body: {},
        rawBody: opts.rawBody ?? Buffer.alloc(0),
        socket: { remoteAddress: '127.0.0.1' },
      }),
    }),
  } as unknown as ExecutionContext;
}

function buildGuard(key: string | undefined): PandadocSignatureGuard {
  const configService = {
    get: jest.fn().mockReturnValue(key),
  } as unknown as ConfigService;
  return new PandadocSignatureGuard(configService);
}

describe('PandadocSignatureGuard', () => {
  describe('when PANDADOC_WEBHOOK_KEY is set', () => {
    it('allows the request when HMAC-SHA256 signature matches', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({
        querySignature: hmac(KEY, BODY),
        rawBody: BODY,
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('rejects with UnauthorizedException when signature query param is absent', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({ rawBody: BODY });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('rejects with UnauthorizedException when signature is wrong', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({
        querySignature: 'deadbeef',
        rawBody: BODY,
      });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('rejects when signature computed from a different body', () => {
      const guard = buildGuard(KEY);
      const otherBody = Buffer.from(JSON.stringify([{ event: 'other' }]));
      const context = makeContext({
        querySignature: hmac(KEY, otherBody),
        rawBody: BODY,
      });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('when PANDADOC_WEBHOOK_KEY is unset', () => {
    it('allows the request and skips signature check', () => {
      const guard = buildGuard(undefined);
      const context = makeContext({});
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
