/**
 * Unit-Tests für den `EigenschutzKonfliktAufgeloestEventAdapter` (Story 3.10 AC6).
 *
 * Pattern: 1:1 zu `konflikt-erkannt.adapter.spec.ts`. PII-Vertrag identisch:
 * `localPayload` ist nicht Teil des Events und folglich auch nicht des Frames.
 */
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KonfliktAufgeloestEvent, type SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { z } from 'zod';
import { EigenschutzKonfliktAufgeloestEventAdapter } from '../konflikt-aufgeloest.adapter';

/**
 * Backend-Mirror des Shared-Schemas (Backend ist aktuell CJS,
 * `@bluelight-hub/shared` ESM — siehe `application/eigenschutz/schemas/
 * sicherheitsregel.zod.ts` für dasselbe Mirror-Pattern).
 */
const KonfliktAufgeloestWsPayloadSchema = z
  .object({
    eventId: z.string(),
    einsatzId: z.string(),
    einheitId: z.string().nullable(),
    syncConflictId: z.string(),
    entityType: z.enum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM']),
    entityId: z.string(),
    fieldPath: z.string().max(200),
    resolution: z.enum(['SERVER_WINS', 'LOCAL_WINS', 'MERGED']),
    resolvedAt: z.string().datetime(),
    resolvedByUserId: z.string(),
  })
  .strict();

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
const SYNC_CONFLICT_ID = 'clw3h8x9y0000qwertyui00090';
const RESOLVER_ID = 'clw3h8x9y0000qwertyui00099';
const RESOLVED_AT = new Date('2026-05-04T12:30:45.123Z');

function buildEvent(overrides: Partial<{ einheitId: string | null; resolution: SyncConflictResolution }> = {}): KonfliktAufgeloestEvent {
  return new KonfliktAufgeloestEvent(
    EINSATZ_ID,
    RESOLVER_ID,
    overrides.einheitId !== undefined ? overrides.einheitId : EINHEIT_ID,
    SYNC_CONFLICT_ID,
    'PSA_PROFIL_ZUWEISUNG',
    ENTITY_ID,
    'profil',
    overrides.resolution ?? 'SERVER_WINS',
    RESOLVED_AT,
  );
}

describe('EigenschutzKonfliktAufgeloestEventAdapter (Story 3.10)', () => {
  it('Subscriber-Identität: @OnEvent-Reflection liefert genau 1 Eintrag mit `eigenschutz.konflikt_aufgeloest`', () => {
    const adapter = new EigenschutzKonfliktAufgeloestEventAdapter(createMockLogger(), createMockPublisher());
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
      method: 'onKonfliktAufgeloest',
      event: KonfliktAufgeloestEvent.eventName(),
    });
    expect(typeof OnEvent).toBe('function');
  });

  it('broadcastet Channel `eigenschutz:konflikt-aufgeloest` mit allen Pflichtfeldern und matcht das Shared-Schema', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzKonfliktAufgeloestEventAdapter(logger, publisher);
    const event = buildEvent({ resolution: 'LOCAL_WINS' });

    await adapter.onKonfliktAufgeloest(event);

    expect(publisher.broadcast).toHaveBeenCalledTimes(1);
    const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
    expect(einsatzId).toBe(EINSATZ_ID);
    expect(channel).toBe('eigenschutz:konflikt-aufgeloest');

    const parseResult = KonfliktAufgeloestWsPayloadSchema.safeParse(payload);
    expect(parseResult.success).toBe(true);

    expect(payload).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        syncConflictId: SYNC_CONFLICT_ID,
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: ENTITY_ID,
        fieldPath: 'profil',
        resolution: 'LOCAL_WINS',
        resolvedAt: RESOLVED_AT.toISOString(),
        resolvedByUserId: RESOLVER_ID,
      }),
    );
    expect(payload).not.toHaveProperty('localPayload');
    expect(payload).not.toHaveProperty('userId');
  });

  it('einheitId === null wird als null gepublished (Phase-2-Forward-Compat)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzKonfliktAufgeloestEventAdapter(logger, publisher);

    await adapter.onKonfliktAufgeloest(buildEvent({ einheitId: null }));

    const payload = (publisher.broadcast as jest.Mock).mock.calls[0][2];
    expect(payload.einheitId).toBeNull();
  });

  it('Logger nutzt PII-Redaction (einsatzId/einheitId/entityId/resolvedByUserId/syncConflictId hashed)', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzKonfliktAufgeloestEventAdapter(logger, publisher);

    await adapter.onKonfliktAufgeloest(buildEvent());

    expect(logger.log).toHaveBeenCalledWith(
      'Received KonfliktAufgeloestEvent',
      expect.objectContaining({
        einsatzIdHash: redactId(EINSATZ_ID),
        einheitIdHash: redactId(EINHEIT_ID),
        entityIdHash: redactId(ENTITY_ID),
        resolvedByUserIdHash: redactId(RESOLVER_ID),
        syncConflictIdHash: redactId(SYNC_CONFLICT_ID),
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        fieldPath: 'profil',
        resolution: 'SERVER_WINS',
      }),
    );
    const logCall = (logger.log as jest.Mock).mock.calls[0][1];
    expect(logCall).not.toHaveProperty('einsatzId');
    expect(logCall).not.toHaveProperty('einheitId');
    expect(logCall).not.toHaveProperty('entityId');
    expect(logCall).not.toHaveProperty('resolvedByUserId');
    expect(logCall).not.toHaveProperty('syncConflictId');
  });

  it('Broadcast-Fehler werden geloggt, aber NICHT durchgereicht (Outbox ist Wahrheit)', async () => {
    const logger = createMockLogger();
    const publisher: IEinsatzEventPublisher = {
      broadcast: jest.fn().mockRejectedValue(new Error('ws-down')),
      broadcastByEtb: jest.fn(),
    };
    const adapter = new EigenschutzKonfliktAufgeloestEventAdapter(logger, publisher);

    await expect(adapter.onKonfliktAufgeloest(buildEvent())).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('KonfliktAufgeloest-Broadcast fehlgeschlagen'), expect.objectContaining({ error: 'ws-down' }));
  });
});
