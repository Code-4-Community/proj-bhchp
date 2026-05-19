import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PandadocSignatureGuard } from './pandadoc-signature.guard';

function makeContext(
  headers: Record<string, string | string[]>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
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
    const KEY = 'sandbox-key-abc123';

    it('allows the request when signature matches', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({ 'x-pandadoc-signature': KEY });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('rejects with UnauthorizedException when signature is missing', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({});
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('rejects with UnauthorizedException when signature is wrong', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({ 'x-pandadoc-signature': 'WRONG' });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('handles array-valued header by checking the first entry', () => {
      const guard = buildGuard(KEY);
      const context = makeContext({ 'x-pandadoc-signature': [KEY, 'extra'] });
      expect(guard.canActivate(context)).toBe(true);
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
