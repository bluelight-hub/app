/**
 * Unit-Tests für den `EigenschutzLueckeGemeldetEventAdapter` (Story 3.6 AC7).
 *
 * Pattern: 1:1 zu `psa-quittung-abgegeben.adapter.spec.ts`. Wichtige
 * Abweichungen:
 * - Channel ist `eigenschutz:luecke-gemeldet`.
 * - Klartext der `meldung` darf **NICHT** im WS-Frame landen — nur
 *   `meldungLength` als Live-Indikator (PII-Diät).
 */
import type { ILogger } from '@domain/ports/i-logger.port';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzLueckeGemeldetEventAdapter } from '../luecke-gemeldet.adapter';

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

describe('EigenschutzLueckeGemeldetEventAdapter (Story 3.6)', () => {
  const GEMELDET_AM = new Date('2026-04-27T09:11:42.123Z');
  const MELDUNG = 'Schutzanzug Größe L fehlt — nachgeordert 14:28';

  it('broadcastet Channel `eigenschutz:luecke-gemeldet` mit userIdHash + meldungLength (KEIN Klartext)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzLueckeGemeldetEventAdapter(logger, publisher);
    const event = new LueckeGemeldetEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'propgroup-1', MELDUNG, GEMELDET_AM);

    await adapter.onLueckeGemeldet(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe('einsatz-abc');
    expect(channel).toBe('eigenschutz:luecke-gemeldet');
    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzId: 'einsatz-abc',
        einheitId: 'einheit-1',
        propagationGroupId: 'propgroup-1',
        userIdHash: redactId('user-xyz'),
        meldungLength: MELDUNG.length,
        gemeldetAm: GEMELDET_AM.toISOString(),
      }),
    );
    // PII-Diät: Klartext darf NICHT im Broadcast-Payload landen.
    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('meldung');
  });

  it('loggt Event mit PII-Redaction (einsatzId/einheitId/userId hashed) und meldungLength statt Klartext', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzLueckeGemeldetEventAdapter(logger, publisher);
    const event = new LueckeGemeldetEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'propgroup-1', MELDUNG, GEMELDET_AM);

    await adapter.onLueckeGemeldet(event);

    expect(logger.log).toHaveBeenCalledWith(
      'Received LueckeGemeldetEvent',
      expect.objectContaining({
        einsatzIdHash: redactId('einsatz-abc'),
        einheitIdHash: redactId('einheit-1'),
        userIdHash: redactId('user-xyz'),
        meldungLength: MELDUNG.length,
      }),
    );
    const logCall = (logger.log as jest.Mock).mock.calls[0][1];
    expect(logCall).not.toHaveProperty('einsatzId');
    expect(logCall).not.toHaveProperty('userId');
    expect(logCall).not.toHaveProperty('meldung');
  });

  it('Broadcast-Fehler werden geloggt, aber NICHT durchgereicht (Outbox ist Wahrheit)', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('ws-down')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzLueckeGemeldetEventAdapter(logger, publisher);
    const event = new LueckeGemeldetEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'propgroup-1', MELDUNG, GEMELDET_AM);

    await expect(adapter.onLueckeGemeldet(event)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('LueckeGemeldet-Broadcast fehlgeschlagen'), expect.objectContaining({ error: 'ws-down' }));
  });
});
