/**
 * Unit-Tests für den `EigenschutzPsaProfilGeaendertEventAdapter` (Story 3.1).
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzPsaProfilGeaendertEventAdapter } from '../psa-profil-geaendert.adapter';

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

describe('EigenschutzPsaProfilGeaendertEventAdapter', () => {
  function buildEvent(): PsaProfilGeaendertEvent {
    return new PsaProfilGeaendertEvent(
      'einsatz-abc',
      'user-xyz',
      'einheit-1',
      'zuweisung-42',
      'propgroup-1',
      'CBRN_PATIENT',
      'AKTIVIERT',
      'Patient mit Verdacht auf CBRN-Kontamination — Einheit benötigt Vollschutz.',
    );
  }

  it('loggt Event mit PII-Redaction', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzPsaProfilGeaendertEventAdapter(logger, publisher);
    const event = buildEvent();

    await adapter.onPsaProfilGeaendert(event);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzIdHash: redactId('einsatz-abc'),
        einheitIdHash: redactId('einheit-1'),
        userIdHash: redactId('user-xyz'),
        zuweisungId: 'zuweisung-42',
        profil: 'CBRN_PATIENT',
        aktion: 'AKTIVIERT',
        eventName: PsaProfilGeaendertEvent.eventName(),
      }),
    );
  });

  it('broadcastet ohne Begründung und mit redacted userId (Bandbreiten-Hygiene + DSGVO)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzPsaProfilGeaendertEventAdapter(logger, publisher);
    const event = buildEvent();

    await adapter.onPsaProfilGeaendert(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe('einsatz-abc');
    expect(channel).toBe('eigenschutz:psa-profil-geaendert');
    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzId: 'einsatz-abc',
        einheitId: 'einheit-1',
        zuweisungId: 'zuweisung-42',
        propagationGroupId: 'propgroup-1',
        profil: 'CBRN_PATIENT',
        aktion: 'AKTIVIERT',
        userIdHash: redactId('user-xyz'),
      }),
    );
    expect(payload).not.toHaveProperty('begruendung');
    expect(payload).not.toHaveProperty('userId');
  });

  it('Broadcast-Fehler wird geloggt und nicht durchgereicht', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('socket disconnected')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzPsaProfilGeaendertEventAdapter(logger, publisher);

    await expect(adapter.onPsaProfilGeaendert(buildEvent())).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Broadcast fehlgeschlagen'), expect.any(Object));
  });

  // P-28: AC7-Konsistenz — `eventId` ist im Broadcast-Payload, sodass
  // Empfänger-Hooks (Story 2.7-Pattern: LRU-Cache pro Channel) Doppel-
  // Lieferungen idempotent verwerfen können.
  it('inkludiert eventId im Broadcast-Payload für Empfänger-seitige Idempotenz', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzPsaProfilGeaendertEventAdapter(logger, publisher);
    const event = buildEvent();

    await adapter.onPsaProfilGeaendert(event);
    await adapter.onPsaProfilGeaendert(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(2);
    const [, , firstPayload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    const [, , secondPayload] = (publisher.broadcast as jest.Mock).mock.calls[1];
    expect(firstPayload).toHaveProperty('eventId', event.eventId);
    expect(secondPayload).toHaveProperty('eventId', event.eventId);
    expect(firstPayload.eventId).toBe(secondPayload.eventId);
  });
});
