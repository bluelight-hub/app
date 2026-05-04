/**
 * Unit-Tests für den `EigenschutzKonfliktErkanntEventAdapter` (Story 3.9 AC6).
 *
 * Pattern: 1:1 zu `luecke-gemeldet.adapter.spec.ts`. Wichtige PII-
 * Abweichung: `localPayload` darf **nicht** im WS-Frame erscheinen — der
 * volle Verlierer-State lebt nur in `sync_conflicts`-Row + Outbox-Event.
 */
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzKonfliktErkanntEventAdapter } from '../konflikt-erkannt.adapter';

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

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const ENTITY_ID = 'clw3h8x9y0000qwertyui00080';
const REPORTER_ID = 'clw3h8x9y0000qwertyui00099';

function buildEvent(overrides: Partial<{ einheitId: string | null; localPayload: Record<string, unknown> }> = {}): KonfliktErkanntEvent {
  return new KonfliktErkanntEvent(
    EINSATZ_ID,
    REPORTER_ID,
    overrides.einheitId !== undefined ? overrides.einheitId : EINHEIT_ID,
    'PSA_PROFIL_ZUWEISUNG',
    ENTITY_ID,
    'profil',
    overrides.localPayload ?? { toggles: [{ profil: 'CBRN_PATIENT', aktivieren: true }], begruendung: 'CBRN sensitiv' },
    6,
    5,
  );
}

describe('EigenschutzKonfliktErkanntEventAdapter (Story 3.9)', () => {
  it('Subscriber-Identität: @OnEvent-Reflection liefert genau 1 Eintrag mit `eigenschutz.konflikt_erkannt`', () => {
    const adapter = new EigenschutzKonfliktErkanntEventAdapter(createMockLogger(), createMockPublisher());
    const proto = Object.getPrototypeOf(adapter);
    const methodNames = Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor' && typeof proto[name] === 'function');

    const listenersByMethod = methodNames
      .map((name) => {
        const meta = Reflect.getMetadata('EVENT_LISTENER_METADATA', proto[name]);
        if (!meta) return null;
        const list = Array.isArray(meta) ? meta : [meta];
        return list.map((m: { event: string }) => ({ method: name, event: m.event }));
      })
      .filter((x): x is Array<{ method: string; event: string }> => x !== null)
      .flat();

    expect(listenersByMethod).toHaveLength(1);
    expect(listenersByMethod[0]).toEqual({
      method: 'onKonfliktErkannt',
      event: KonfliktErkanntEvent.eventName(),
    });
    expect(typeof OnEvent).toBe('function');
  });

  it('broadcastet Channel `eigenschutz:konflikt-erkannt` mit allen Pflichtfeldern (KEIN localPayload!)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzKonfliktErkanntEventAdapter(logger, publisher);
    const event = buildEvent();

    await adapter.onKonfliktErkannt(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe(EINSATZ_ID);
    expect(channel).toBe('eigenschutz:konflikt-erkannt');
    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: ENTITY_ID,
        fieldPath: 'profil',
        serverVersion: 6,
        localExpectedVersion: 5,
        reportedByUserId: REPORTER_ID,
      }),
    );
    // PII-Vertrag: Verlierer-Payload + sensitive UI-Drafts NICHT im Frame.
    expect(payload).not.toHaveProperty('localPayload');
    expect(payload).not.toHaveProperty('userId');
  });

  it('einheitId === null wird als null gepublished (Phase-2-Forward-Compat)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzKonfliktErkanntEventAdapter(logger, publisher);

    await adapter.onKonfliktErkannt(buildEvent({ einheitId: null }));

    const payload = (publisher.broadcast as jest.Mock).mock.calls[0][2];
    expect(payload.einheitId).toBeNull();
  });

  it('Logger nutzt PII-Redaction (einsatzId/einheitId/entityId/reportedByUserId hashed)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzKonfliktErkanntEventAdapter(logger, publisher);

    await adapter.onKonfliktErkannt(buildEvent());

    expect(logger.log).toHaveBeenCalledWith(
      'Received KonfliktErkanntEvent',
      expect.objectContaining({
        einsatzIdHash: redactId(EINSATZ_ID),
        einheitIdHash: redactId(EINHEIT_ID),
        entityIdHash: redactId(ENTITY_ID),
        reportedByUserIdHash: redactId(REPORTER_ID),
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        fieldPath: 'profil',
      }),
    );
    const logCall = (logger.log as jest.Mock).mock.calls[0][1];
    expect(logCall).not.toHaveProperty('einsatzId');
    expect(logCall).not.toHaveProperty('einheitId');
    expect(logCall).not.toHaveProperty('entityId');
    expect(logCall).not.toHaveProperty('reportedByUserId');
    expect(logCall).not.toHaveProperty('localPayload');
  });

  it('Broadcast-Fehler werden geloggt, aber NICHT durchgereicht (Outbox ist Wahrheit)', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('ws-down')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzKonfliktErkanntEventAdapter(logger, publisher);

    await expect(adapter.onKonfliktErkannt(buildEvent())).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('KonfliktErkannt-Broadcast fehlgeschlagen'), expect.objectContaining({ error: 'ws-down' }));
  });
});
