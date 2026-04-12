import { Global, Module } from '@nestjs/common';
import { CognitoService } from './cognito.service';

/**
 * CognitoModule — SCAFFOLD / MOCK ONLY.
 *
 * Registers {@link CognitoService} (currently a pure in-memory mock) as a
 * global provider so any module can inject it without wiring an import edge.
 *
 * The module is intentionally NOT registered in `app.module.ts` yet: the
 * follow-up implementation ticket will (1) add the real AWS SDK wiring and
 * env-var validation, and (2) import this module wherever the create-
 * application flow actually runs (likely `ApplicationsModule`).
 */
@Global()
@Module({
  providers: [CognitoService],
  exports: [CognitoService],
})
export class CognitoModule {}
