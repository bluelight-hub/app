/**
 * Unit-Tests für den `EigenschutzQuittungAbgegebenEventAdapter` (Story 3.4 AC5).
 *
 * Pattern: 1:1 zu `sicherheitsregel-quittiert.adapter.spec.ts`. Wichtige
 * Abweichung: Der PSA-Adapter sendet `userId` ausschließlich als
 * `userIdHash` (PII-Diät, Architektur §B5) — der Sender lädt Klartext über
 * REST-Refetch nach.
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzQuittungAbgegebenEventAdapter } from '../psa-quittung-abgegeben.adapter';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const createMockPublisher = (): IEinsatzEventPublisher => ({
  broadcast: jest.fn().mockResolvedValue(undefined),
  broadcastByEtb: jest.fn().mockResolvedValue(undefined),
});

describe('EigenschutzQuittungAbgegebenEventAdapter (Story 3.4)', () => {
  const QUITTIERT_AM = new Date('2026-04-27T08:42:13.000Z');

  it('broadcastet Channel `eigenschutz:psa-quittung-abgegeben` mit userIdHash statt Klartext-userId', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzQuittungAbgegebenEventAdapter(logger, publisher);
    const event = new QuittungAbgegebenEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'propgroup-1', QUITTIERT_AM);

    await adapter.onQuittungAbgegeben(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe('einsatz-abc');
    expect(channel).toBe('eigenschutz:psa-quittung-abgegeben');
    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzId: 'einsatz-abc',
        einheitId: 'einheit-1',
        propagationGroupId: 'propgroup-1',
        userIdHash: redactId('user-xyz'),
        quittiertAm: QUITTIERT_AM.toISOString(),
      }),
    );
    // PII-Diät: Klartext-userId darf NICHT im Broadcast-Payload landen.
    expect(payload).not.toHaveProperty('userId');
  });

  it('loggt Event mit PII-Redaction (einsatzId/einheitId/userId hashed)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzQuittungAbgegebenEventAdapter(logger, publisher);
    const event = new QuittungAbgegebenEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'propgroup-1', QUITTIERT_AM);

    await adapter.onQuittungAbgegeben(event);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzIdHash: redactId('einsatz-abc'),
        einheitIdHash: redactId('einheit-1'),
        userIdHash: redactId('user-xyz'),
        propagationGroupId: 'propgroup-1',
        quittiertAm: QUITTIERT_AM.toISOString(),
        eventName: QuittungAbgegebenEvent.eventName(),
      }),
    );
  });

  it('Broadcast-Fehler wird geloggt und NICHT durchgereicht (Resilienz — Outbox bleibt Wahrheit)', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('socket disconnected')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzQuittungAbgegebenEventAdapter(logger, publisher);
    const event = new QuittungAbgegebenEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'propgroup-1', QUITTIERT_AM);

    await expect(adapter.onQuittungAbgegeben(event)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Broadcast fehlgeschlagen'), expect.any(Object));
  });
});
