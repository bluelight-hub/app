/**
 * Unit-Tests für `EmitCriticalPushOnPsaProfilGeaendertHandler`
 * (Story 3.8 AC3, AC6, AC8, AC10).
 */
import 'reflect-metadata';
import { OnEvent } from '@nestjs/event-emitter';
import { PsaProfil } from '@/generated/prisma/enums';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IPushNotificationService } from '@domain/push-notifications/i-push-notification.service';
import type { IPushRecipientLookupPort } from '@domain/eigenschutz/repositories/i-push-recipient-lookup.port';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EmitCriticalPushOnPsaProfilGeaendertHandler } from '../emit-critical-push-on-psa-profil-geaendert.handler';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

// Hochkardinale Fixture-IDs, damit `not.toContain(EINSATZ_ID)`-Asserts nicht
// false-positive triggern, wenn ein Hash zufällig die Substring-Form 'einsatz-1'
// enthält (Story 3.8 P16).
const EINSATZ_ID = 'einsatz-cuid-deadbeef-3-8';
const EINHEIT_ID = 'einheit-cuid-cafef00d-3-8';

function makeEvent() {
  return new PsaProfilGeaendertEvent(EINSATZ_ID, 'user-secret', EINHEIT_ID, 'zuw-1', 'group-1', PsaProfil.CBRN_PATIENT, 'AKTIVIERT', 'CBRN-Lage');
}

describe('EmitCriticalPushOnPsaProfilGeaendertHandler (Story 3.8)', () => {
  it('Happy-Path: Fan-Out an alle Empfänger mit identischem PushPayload', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.ok(['user-A', 'user-B'])),
    };
    const send = jest.fn().mockResolvedValue(undefined);
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);
    const event = makeEvent();
    await handler.onPsaProfilGeaendert(event);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, 'user-A', expect.objectContaining({ eventId: event.eventId }));
    expect(send).toHaveBeenNthCalledWith(2, 'user-B', expect.objectContaining({ eventId: event.eventId }));

    // Beide Aufrufe nutzen denselben Payload-Object-Inhalt
    const [, payloadA] = (send as jest.Mock).mock.calls[0];
    const [, payloadB] = (send as jest.Mock).mock.calls[1];
    expect(payloadA).toEqual(payloadB);

    expect(logger.log).toHaveBeenCalledWith(
      'Push-Fanout für PsaProfilGeaendertEvent gestartet',
      expect.objectContaining({
        eventId: event.eventId,
        recipientCount: 2,
        aktion: 'AKTIVIERT',
        profil: PsaProfil.CBRN_PATIENT,
        propagationGroupId: 'group-1',
      }),
    );
  });

  it('Lookup-Failure: kein Push, error-Log mit redactId, kein Throw', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.fail<string[]>('InfrastructureError:PushRecipientLookup:db-down')),
    };
    const send = jest.fn();
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);
    const event = makeEvent();

    await expect(handler.onPsaProfilGeaendert(event)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);

    const [, ctx] = (logger.error as jest.Mock).mock.calls[0];
    expect(ctx.einsatzIdHash).toBe(redactId(EINSATZ_ID));
    expect(ctx.einheitIdHash).toBe(redactId(EINHEIT_ID));
    expect(ctx.error).toBe('InfrastructureError:PushRecipientLookup:db-down');
  });

  it('Empty-Recipients: kein Push, debug-Log einmal', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.ok([])),
    };
    const send = jest.fn();
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);
    await handler.onPsaProfilGeaendert(makeEvent());

    expect(send).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('Single-Push-Reject: Fan-Out läuft durch, Aggregat-warn mit failed:1', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.ok(['user-A', 'user-B', 'user-C'])),
    };
    const send = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('endpoint timeout')).mockResolvedValueOnce(undefined);
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);
    const event = makeEvent();

    await expect(handler.onPsaProfilGeaendert(event)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('Teilweise fehlgeschlagene Push-Zustellung', {
      eventId: event.eventId,
      recipientCount: 3,
      failed: 1,
    });
  });

  it('@OnEvent-Reflection: GENAU EIN @OnEvent in der gesamten Handler-Klasse (AC8 P13)', () => {
    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(
      createMockLogger(),
      { listRecipientsForEinheit: jest.fn() } as IPushRecipientLookupPort,
      { send: jest.fn() } as IPushNotificationService,
    );

    // Iteriere ALLE Methoden des Prototypen (nicht nur `onPsaProfilGeaendert`),
    // damit ein versehentlich zugefügter zweiter `@OnEvent`-Subscribe (z. B.
    // `onQuittungUeberfaellig`) den Test failt — vgl. AC8/Q2: Push für
    // `QuittungUeberfaellig` ist explizit defer auf Story 3.8.1.
    const proto = Object.getPrototypeOf(handler);
    const methodNames = Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor' && typeof proto[name] === 'function');

    const listenersByMethod = methodNames
      .map((name) => {
        const meta = Reflect.getMetadata('EVENT_LISTENER_METADATA', proto[name]);
        if (!meta) return null;
        const list = Array.isArray(meta) ? meta : [meta];
        return list.map((m) => ({ method: name, event: m.event }));
      })
      .filter((x): x is Array<{ method: string; event: string }> => x !== null)
      .flat();

    expect(listenersByMethod).toHaveLength(1);
    expect(listenersByMethod[0]).toEqual({
      method: 'onPsaProfilGeaendert',
      event: PsaProfilGeaendertEvent.eventName(),
    });

    // Sanity: der Decorator-Reference selbst — sicherstellt, dass der Import
    // tatsächlich genutzt wurde (ohne wäre der Test unsichtbar broken).
    expect(typeof OnEvent).toBe('function');
  });

  it('Lookup-Sync-Throw: kein Throw nach außen, error-Log mit redactId, kein Push (P1)', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockRejectedValue(new Error('connection reset')),
    };
    const send = jest.fn();
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);

    await expect(handler.onPsaProfilGeaendert(makeEvent())).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Push-Recipient-Lookup geworfen — kein Fan-Out', expect.objectContaining({ error: 'connection reset' }));
  });

  it('Mapper-Sync-Throw: kein Throw nach außen, error-Log, kein Push (P1)', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.ok(['user-A'])),
    };
    const send = jest.fn();
    const push: IPushNotificationService = { send };

    // Manipuliere das Event so, dass der Mapper wirft. PsaProfilGeaendertEvent
    // selbst ist robust — wir patchen die getter-Properties via Object.defineProperty,
    // damit `event.profil` synchron einen Throw produziert.
    const event = makeEvent();
    Object.defineProperty(event, 'profil', {
      get() {
        throw new Error('synthetic mapper failure');
      },
    });

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);

    await expect(handler.onPsaProfilGeaendert(event)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Push-Payload-Mapping fehlgeschlagen — kein Fan-Out', expect.objectContaining({ error: 'synthetic mapper failure' }));
  });

  it('Result.fail mit non-string-error wird zu String coerced (P10)', async () => {
    const logger = createMockLogger();
    const nonStringError = { code: 'WEIRD', detail: 'object-error' } as never;
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.fail<string[]>(nonStringError)),
    };
    const send = jest.fn();
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);
    await handler.onPsaProfilGeaendert(makeEvent());

    expect(send).not.toHaveBeenCalled();
    const [, ctx] = (logger.error as jest.Mock).mock.calls[0];
    expect(typeof ctx.error).toBe('string');
    expect(ctx.error).toBe('[object Object]');
  });

  it('PII-Hygiene: keine User-ID, keine Klar-einsatzId/einheitId in irgendeinem Log', async () => {
    const logger = createMockLogger();
    const recipients: IPushRecipientLookupPort = {
      listRecipientsForEinheit: jest.fn().mockResolvedValue(Result.ok(['user-A'])),
    };
    const send = jest.fn().mockRejectedValue(new Error('boom'));
    const push: IPushNotificationService = { send };

    const handler = new EmitCriticalPushOnPsaProfilGeaendertHandler(logger, recipients, push);
    await handler.onPsaProfilGeaendert(makeEvent());

    const allCalls = [...(logger.log as jest.Mock).mock.calls, ...(logger.warn as jest.Mock).mock.calls, ...(logger.error as jest.Mock).mock.calls, ...(logger.debug as jest.Mock).mock.calls];
    const serialized = JSON.stringify(allCalls);

    expect(serialized).not.toContain('user-secret');
    expect(serialized).not.toContain('user-A');
    expect(serialized).not.toContain(EINSATZ_ID);
    expect(serialized).not.toContain(EINHEIT_ID);
  });
});
