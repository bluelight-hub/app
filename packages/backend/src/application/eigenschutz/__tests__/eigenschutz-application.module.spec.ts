/**
 * Boot-Smoke-Test für `EigenschutzApplicationModule` (Story 3.8 AC5).
 *
 * Verifiziert, dass `EmitCriticalPushOnPsaProfilGeaendertHandler` mit allen
 * DI-Dependencies (`LOGGER`, `PUSH_RECIPIENT_LOOKUP`, `PUSH_NOTIFICATION_SERVICE`)
 * resolvet — ohne echtes `PushNotificationsModule` (das würde VAPID-Env-Vars
 * verlangen, vgl. Story 3.8 Dev Notes Detail-Falle #6).
 *
 * Wir importieren NICHT das echte Modul, sondern ein schmales Test-Modul,
 * das den Handler-Provider isoliert mit gemockten Tokens auflöst — exakt
 * der Pattern aus AC5.
 */
import { Test } from '@nestjs/testing';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER, PUSH_NOTIFICATION_SERVICE, PUSH_RECIPIENT_LOOKUP } from '@infrastructure/di-tokens';
import { EmitCriticalPushOnPsaProfilGeaendertHandler } from '../event-handlers/emit-critical-push-on-psa-profil-geaendert.handler';

const NOOP_LOGGER: ILogger = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
};

describe('EigenschutzApplicationModule — EmitCriticalPushOnPsaProfilGeaendertHandler-DI (Story 3.8 AC5)', () => {
  it('resolvet den Handler mit allen drei Tokens (LOGGER, PUSH_RECIPIENT_LOOKUP, PUSH_NOTIFICATION_SERVICE)', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmitCriticalPushOnPsaProfilGeaendertHandler,
        { provide: LOGGER, useValue: NOOP_LOGGER },
        { provide: PUSH_RECIPIENT_LOOKUP, useValue: { listRecipientsForEinheit: jest.fn() } },
        { provide: PUSH_NOTIFICATION_SERVICE, useValue: { send: jest.fn() } },
      ],
    }).compile();

    const handler = moduleRef.get(EmitCriticalPushOnPsaProfilGeaendertHandler);
    expect(handler).toBeInstanceOf(EmitCriticalPushOnPsaProfilGeaendertHandler);

    await moduleRef.close();
  });
});
