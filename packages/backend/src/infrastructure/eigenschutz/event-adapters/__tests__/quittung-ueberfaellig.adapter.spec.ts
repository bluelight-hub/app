/**
 * Unit-Tests für den `EigenschutzQuittungUeberfaelligEventAdapter` (Story 3.7 AC5).
 *
 * Pattern: 1:1 zu `luecke-gemeldet.adapter.spec.ts`. Wichtige Abweichungen:
 * - Channel ist `eigenschutz:quittung-ueberfaellig`.
 * - **KEIN** `userId`/`userIdHash` im Frame (Auslöser ist `SYSTEM`).
 * - Nur IDs + Numerik (kein PII-Klartext).
 */
import type { ILogger } from '@domain/ports/i-logger.port';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzQuittungUeberfaelligEventAdapter } from '../quittung-ueberfaellig.adapter';

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

describe('EigenschutzQuittungUeberfaelligEventAdapter (Story 3.7)', () => {
  it('broadcastet Channel `eigenschutz:quittung-ueberfaellig` mit IDs + Numerik (KEIN userId)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzQuittungUeberfaelligEventAdapter(logger, publisher);
    const event = new QuittungUeberfaelligEvent('einsatz-abc', 'einheit-1', 'propgroup-1', 'orig-evt-1', 6, 'zuw-1');

    await adapter.onQuittungUeberfaellig(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe('einsatz-abc');
    expect(channel).toBe('eigenschutz:quittung-ueberfaellig');
    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzId: 'einsatz-abc',
        einheitId: 'einheit-1',
        propagationGroupId: 'propgroup-1',
        originalEventId: 'orig-evt-1',
        ueberfaelligSeitMin: 6,
        zuweisungId: 'zuw-1',
      }),
    );
    expect(payload.occurredAt).toBeDefined();

    // PII-Diät: KEIN userId/userIdHash im Frame (Auslöser ist SYSTEM).
    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('userIdHash');
  });

  it('akzeptiert zuweisungId === null und übergibt null im Payload', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzQuittungUeberfaelligEventAdapter(logger, publisher);
    const event = new QuittungUeberfaelligEvent('einsatz-abc', 'einheit-1', 'propgroup-1', 'orig-evt-1', 5, null);

    await adapter.onQuittungUeberfaellig(event);

    const payload = (publisher.broadcast as jest.Mock).mock.calls[0][2];
    expect(payload.zuweisungId).toBeNull();
  });

  it('loggt Event mit PII-Redaction (einsatzId/einheitId hashed); KEIN userId-Feld', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzQuittungUeberfaelligEventAdapter(logger, publisher);
    const event = new QuittungUeberfaelligEvent('einsatz-abc', 'einheit-1', 'propgroup-1', 'orig-evt-1', 7, null);

    await adapter.onQuittungUeberfaellig(event);

    expect(logger.log).toHaveBeenCalledWith(
      'Received QuittungUeberfaelligEvent',
      expect.objectContaining({
        einsatzIdHash: redactId('einsatz-abc'),
        einheitIdHash: redactId('einheit-1'),
        propagationGroupId: 'propgroup-1',
        ueberfaelligSeitMin: 7,
      }),
    );
    const logCall = (logger.log as jest.Mock).mock.calls[0][1];
    expect(logCall).not.toHaveProperty('einsatzId');
    expect(logCall).not.toHaveProperty('userId');
    expect(logCall).not.toHaveProperty('userIdHash');
  });

  it('Broadcast-Fehler werden geloggt, aber NICHT durchgereicht (Outbox ist Wahrheit)', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('ws-down')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzQuittungUeberfaelligEventAdapter(logger, publisher);
    const event = new QuittungUeberfaelligEvent('einsatz-abc', 'einheit-1', 'propgroup-1', 'orig-evt-1', 5, null);

    await expect(adapter.onQuittungUeberfaellig(event)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('QuittungUeberfaellig-Broadcast fehlgeschlagen'), expect.objectContaining({ error: 'ws-down' }));
  });
});
