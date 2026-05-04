/**
 * Integration-Test für `EmitCriticalPushOnPsaProfilGeaendertHandler`
 * (Story 3.8 AC6 — Push parallel zum WS, kein Critical-Path-Block).
 *
 * Verifiziert mit echtem `EventEmitter2` aus `@nestjs/event-emitter`, dass
 * Push-Handler und WS-Handler beide auf dasselbe Event hören und sich
 * gegenseitig nicht blockieren.
 */
import { EventEmitter2, EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { Inject, Injectable } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PsaProfil } from '@/generated/prisma/enums';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IPushNotificationService } from '@domain/push-notifications/i-push-notification.service';
import type { IPushRecipientLookupPort } from '@domain/eigenschutz/repositories/i-push-recipient-lookup.port';
import { LOGGER, PUSH_NOTIFICATION_SERVICE, PUSH_RECIPIENT_LOOKUP } from '@infrastructure/di-tokens';
import { EmitCriticalPushOnPsaProfilGeaendertHandler } from '../emit-critical-push-on-psa-profil-geaendert.handler';

const NOOP_LOGGER: ILogger = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
};

const WS_SPY_TOKEN = Symbol('SpyWsBroadcast');
type WsBroadcastSpy = jest.Mock<void, [PsaProfilGeaendertEvent]>;

@Injectable()
class TestWsBroadcastAdapter {
  constructor(@Inject(WS_SPY_TOKEN) private readonly spy: WsBroadcastSpy) {}

  @OnEvent('eigenschutz.psa_profil_geaendert')
  handle(event: PsaProfilGeaendertEvent): void {
    this.spy(event);
  }
}

function makeEvent() {
  return new PsaProfilGeaendertEvent('einsatz-1', 'user-1', 'einheit-1', 'zuw-1', 'group-1', PsaProfil.CBRN_PATIENT, 'AKTIVIERT', 'CBRN-Lage');
}

describe('emit-critical-push.integration (Story 3.8 AC6)', () => {
  let moduleRef: TestingModule;
  let emitter: EventEmitter2;
  let wsSpy: WsBroadcastSpy;
  let pushSend: jest.Mock<Promise<void>, [string, unknown]>;

  beforeEach(async () => {
    wsSpy = jest.fn();
    pushSend = jest.fn().mockResolvedValue(undefined);

    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.ok(['user-A'])),
    };
    const push: IPushNotificationService = { send: pushSend };

    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TestWsBroadcastAdapter,
        EmitCriticalPushOnPsaProfilGeaendertHandler,
        { provide: WS_SPY_TOKEN, useValue: wsSpy },
        { provide: LOGGER, useValue: NOOP_LOGGER },
        { provide: PUSH_RECIPIENT_LOOKUP, useValue: recipients },
        { provide: PUSH_NOTIFICATION_SERVICE, useValue: push },
      ],
    }).compile();

    await moduleRef.init();
    emitter = moduleRef.get(EventEmitter2);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('WS-Adapter wird aufgerufen, BEVOR Push-Send aufgelöst wird (Push blockiert WS nicht)', async () => {
    // Push-Send mit künstlicher Latenz, damit der WS-Spy sicher VOR der
    // Resolution des Push-Promise greifbar ist.
    pushSend.mockImplementationOnce(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

    const event = makeEvent();
    emitter.emit('eigenschutz.psa_profil_geaendert', event);

    // Eine Microtask-Boundary für synchrone WS-Spy-Verifikation reicht;
    // der Push-Handler hängt 100 ms im Timeout fest.
    await Promise.resolve();

    expect(wsSpy).toHaveBeenCalledTimes(1);
    expect(wsSpy).toHaveBeenCalledWith(event);

    // Push-Send wurde gestartet, ist aber noch nicht resolved
    expect(pushSend).toHaveBeenCalledTimes(1);

    // Räume das offene Timeout-Promise auf, damit Jest sauber abschließt
    await new Promise((r) => setTimeout(r, 110));
  });

  it('Push-Send-Reject blockiert den WS-Broadcast nicht (Promise.allSettled schluckt)', async () => {
    // Verfolge die Push-Promise selbst, statt mit setImmediate-Polling zu raten
    // (P15: setImmediate-Polling ist scheduler-flaky unter CI-Last).
    let pushSettled!: () => void;
    const pushDone = new Promise<void>((resolve) => {
      pushSettled = resolve;
    });
    pushSend.mockImplementationOnce(async () => {
      // Signalisiere bevor wir werfen, damit der Test deterministisch synct.
      queueMicrotask(() => pushSettled());
      throw new Error('endpoint timeout');
    });

    const event = makeEvent();

    // Scoped unhandledRejection-Listener — kein globaler Test-Bleed
    // (P15: globaler `process.on` leakt zwischen Jest-Workern).
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      emitter.emit('eigenschutz.psa_profil_geaendert', event);
      // Warte deterministisch, bis pushSend gestartet hat.
      await pushDone;
      // Drei Microtask-Boundaries geben Promise.allSettled die Chance, sich
      // abzuschließen, ohne mit Timer-Scheduling zu spielen.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(wsSpy).toHaveBeenCalledTimes(1);
      expect(pushSend).toHaveBeenCalledTimes(1);
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
