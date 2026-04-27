/**
 * Unit-Tests für den `EigenschutzSicherheitsregelQuittiertEventAdapter`
 * (Story 2.7 AC6).
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzSicherheitsregelQuittiertEventAdapter } from '../sicherheitsregel-quittiert.adapter';

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

describe('EigenschutzSicherheitsregelQuittiertEventAdapter', () => {
  const QUITTIERT_AM = new Date('2026-04-27T08:42:13.000Z');

  it('loggt Event mit PII-Redaction (einsatzId/einheitId/userId hashed)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelQuittiertEventAdapter(logger, publisher);
    const event = new SicherheitsregelQuittiertEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'regel-1', 'propgroup-1', QUITTIERT_AM);

    await adapter.onSicherheitsregelQuittiert(event);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzIdHash: redactId('einsatz-abc'),
        einheitIdHash: redactId('einheit-1'),
        userIdHash: redactId('user-xyz'),
        sicherheitsregelId: 'regel-1',
        propagationGroupId: 'propgroup-1',
        quittiertAm: QUITTIERT_AM.toISOString(),
        eventName: SicherheitsregelQuittiertEvent.eventName(),
      }),
    );
  });

  it('broadcastet Event mit Channel sicherheitsregel:quittiert und korrektem Payload', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelQuittiertEventAdapter(logger, publisher);
    const event = new SicherheitsregelQuittiertEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'regel-1', 'propgroup-1', QUITTIERT_AM);

    await adapter.onSicherheitsregelQuittiert(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe('einsatz-abc');
    expect(channel).toBe('sicherheitsregel:quittiert');
    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        regelId: 'regel-1',
        einsatzId: 'einsatz-abc',
        einheitId: 'einheit-1',
        propagationGroupId: 'propgroup-1',
        userId: 'user-xyz',
        quittiertAm: QUITTIERT_AM.toISOString(),
      }),
    );
  });

  it('reicht propagationGroupId === null als null durch (Outbox-Retention-Fallback)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelQuittiertEventAdapter(logger, publisher);
    const event = new SicherheitsregelQuittiertEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'regel-1', null, QUITTIERT_AM);

    await adapter.onSicherheitsregelQuittiert(event);

    const [, , payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(payload.propagationGroupId).toBeNull();
  });

  it('Broadcast-Fehler wird geloggt und NICHT durchgereicht (Resilienz)', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('socket disconnected')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzSicherheitsregelQuittiertEventAdapter(logger, publisher);
    const event = new SicherheitsregelQuittiertEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'regel-1', 'p', QUITTIERT_AM);

    await expect(adapter.onSicherheitsregelQuittiert(event)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Broadcast fehlgeschlagen'), expect.any(Object));
  });
});
