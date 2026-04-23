/**
 * Smoke-Test Outbox → WebSocket für das Eigenschutz-Event-Framework (Story 1.7 AC5).
 *
 * Dieser Smoke-Test verifiziert Outbox-Event →
 * `EinsatzEventsGateway.broadcastToEinsatz(room=einsatz:{einsatzId})`
 * end-to-end, verwendet jedoch ein **Test-scoped Dummy-Event**
 * (`eigenschutz.__test_smoke__`), das **nicht** in
 * Produktions-Serializer/-Deserializer/-AdaptersModule/-Index registriert
 * ist. Dies ist die von Story 1.7 AC4/AC5 geforderte Resolution des
 * „0 Events registriert" + „Dummy-Event durch Outbox"-Widerspruchs:
 * produktive Zählung erfolgt auf Quelldateien-Ebene (AC4), Roundtrip-
 * Verifikation auf Test-Ebene via transientem Monkey-Patch (AC5).
 *
 * **Scope-Grenze:** Der Test verifiziert den **Event-Adapter-Pfad ab
 * EventEmitter2** (siehe Dev Note in Story 1.7), nicht den Outbox-
 * Polling-Mechanismus — letzterer setzt einen echten Postgres-Container
 * voraus (vgl. `outbox-race-condition.integration.spec.ts`) und ist nicht
 * CI-Pflicht für die ADR-006-Garantie.
 */
import { EventEmitter2, EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { Injectable, Inject } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { DomainEvent } from '@domain/common/domain-event';
import { EigenschutzDomainEvent } from '@domain/eigenschutz/events/eigenschutz-domain-event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';
import { EventSerializer, type SerializedEvent } from '../event-serializer';
import { EventDeserializer } from '../event-deserializer';

const TEST_EVENT_NAME = 'eigenschutz.__test_smoke__';
const TEST_CHANNEL = 'eigenschutz.dummy';
const TEST_EINSATZ_ID = 'test-einsatz-cuid';
const TEST_USER_ID = 'test-user-cuid';

class TestEigenschutzDummyEvent extends EigenschutzDomainEvent {
  static eventName(): string {
    return TEST_EVENT_NAME;
  }
}

/**
 * Spy-Gateway — ersetzt das echte `EinsatzEventsGateway` im Test-Scope.
 * Nimmt die gleichen Parameter wie die Produktions-Methode (`einsatzId`,
 * `channel`, `payload`), ohne die Socket.IO-Abhängigkeit mitzuziehen.
 */
interface SpyGateway {
  broadcastToEinsatz: jest.Mock<void, [string, string, Record<string, unknown>]>;
}

const SPY_GATEWAY_TOKEN = Symbol('SpyEinsatzEventsGateway');

@Injectable()
class TestEigenschutzDummyAdapter {
  constructor(@Inject(SPY_GATEWAY_TOKEN) private readonly gateway: SpyGateway) {}

  @OnEvent(TEST_EVENT_NAME)
  handle(event: TestEigenschutzDummyEvent): void {
    this.gateway.broadcastToEinsatz(event.einsatzId, TEST_CHANNEL, { eventId: event.eventId });
  }
}

const NOOP_LOGGER: ILogger = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  verbose: () => undefined,
};

describe('Eigenschutz Smoke-Test — Outbox → WebSocket (Story 1.7 AC5)', () => {
  let moduleRef: TestingModule;
  let eventEmitter: EventEmitter2;
  let serializer: EventSerializer;
  let deserializer: EventDeserializer;
  let spyGateway: SpyGateway;
  let deserializerRegistry: Map<string, (payload: Record<string, unknown>, aggregateId?: string) => Result<DomainEvent>>;

  beforeEach(async () => {
    spyGateway = { broadcastToEinsatz: jest.fn() };

    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [TestEigenschutzDummyAdapter, EventSerializer, EventDeserializer, { provide: SPY_GATEWAY_TOKEN, useValue: spyGateway }, { provide: LOGGER, useValue: NOOP_LOGGER }],
    }).compile();

    await moduleRef.init();

    eventEmitter = moduleRef.get(EventEmitter2);
    serializer = moduleRef.get(EventSerializer);
    deserializer = moduleRef.get(EventDeserializer);

    // Test-scoped Serializer-Override: Der Produktions-Switch kennt das
    // Dummy-Event nicht (würde `throw new Error('Unknown event type...')`).
    // Wir monkey-patchen `serialize` nur für diese Testdatei — `afterEach`
    // räumt via `jest.restoreAllMocks()` auf.
    jest.spyOn(EventSerializer.prototype, 'serialize').mockImplementation(function overrideSerialize(this: EventSerializer, event: DomainEvent): SerializedEvent {
      if ((event.constructor as typeof DomainEvent).eventName() !== TEST_EVENT_NAME) {
        // Delegate an das Original, falls ein anderes (reales) Event durchkommt
        // — defensives Guarding gegen Test-Leak-Events.
        throw new Error('Serializer-Override ist nur für das Dummy-Event aktiv.');
      }
      const dummy = event as TestEigenschutzDummyEvent;
      return {
        eventId: dummy.eventId,
        eventName: TEST_EVENT_NAME,
        eventVersion: 1,
        occurredAt: dummy.occurredAt.toISOString(),
        aggregateId: dummy.aggregateId,
        payload: { einsatzId: dummy.einsatzId, userId: dummy.userId },
      };
    });

    // Test-scoped Deserializer-Override: Registry-Map um einen Dummy-Entry
    // ergänzen. Das `afterEach` nimmt den Eintrag wieder heraus.
    deserializerRegistry = (deserializer as unknown as { eventRegistry: typeof deserializerRegistry }).eventRegistry;
    deserializerRegistry.set(TEST_EVENT_NAME, (payload, aggregateId) => {
      const einsatzId = payload.einsatzId as string;
      const userId = payload.userId as string;
      return Result.ok(new TestEigenschutzDummyEvent(einsatzId, userId, undefined, aggregateId));
    });
  });

  afterEach(async () => {
    // Cleanup in try/finally — damit ein Throw in einem Schritt nachfolgende
    // Schritte nicht überspringt und kein Test-Leak in spätere Specs verursacht.
    try {
      deserializerRegistry.delete(TEST_EVENT_NAME);
    } finally {
      try {
        jest.restoreAllMocks();
      } finally {
        await moduleRef.close();
      }
    }
  });

  describe('EventEmitter-Pfad — Adapter → Gateway-Broadcast', () => {
    it('broadcastet das Dummy-Event genau 1× an den Einsatz-Scope mit eventId-Payload', async () => {
      const event = new TestEigenschutzDummyEvent(TEST_EINSATZ_ID, TEST_USER_ID);

      eventEmitter.emit(TEST_EVENT_NAME, event);

      // EventEmitter2 triggert @OnEvent-Handler synchron im Default-Mode —
      // ein Microtask-Tick reicht aus, falls NestJS intern einen Promise-
      // Boundary einzieht.
      await Promise.resolve();

      expect(spyGateway.broadcastToEinsatz).toHaveBeenCalledTimes(1);
      expect(spyGateway.broadcastToEinsatz).toHaveBeenCalledWith(TEST_EINSATZ_ID, TEST_CHANNEL, { eventId: event.eventId });
    });

    it('reicht eine CUID2-formatierte eventId an den Broadcast-Payload durch', async () => {
      const event = new TestEigenschutzDummyEvent(TEST_EINSATZ_ID, TEST_USER_ID);

      eventEmitter.emit(TEST_EVENT_NAME, event);
      await Promise.resolve();

      const [, , payload] = spyGateway.broadcastToEinsatz.mock.calls[0];
      expect(payload.eventId).toMatch(/^[a-z0-9]{24}$/);
    });
  });

  describe('Serializer/Deserializer-Roundtrip — Test-scoped Monkey-Patch', () => {
    it('serialisiert das Dummy-Event zum erwarteten Payload-Shape', () => {
      const event = new TestEigenschutzDummyEvent(TEST_EINSATZ_ID, TEST_USER_ID);
      const serialized = serializer.serialize(event);

      expect(serialized.eventName).toBe(TEST_EVENT_NAME);
      expect(serialized.payload).toEqual({ einsatzId: TEST_EINSATZ_ID, userId: TEST_USER_ID });
      expect(serialized.eventId).toBe(event.eventId);
    });

    it('deserialisiert den transient registrierten Dummy-Entry zurück zu einem TestEigenschutzDummyEvent', () => {
      const result = deserializer.deserialize({
        eventId: 'synthetic-event-id',
        eventName: TEST_EVENT_NAME,
        eventVersion: 1,
        occurredAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        aggregateId: undefined,
        payload: { einsatzId: TEST_EINSATZ_ID, userId: TEST_USER_ID },
      });

      expect(result.isSuccess).toBe(true);
      const deserialized = result.value as TestEigenschutzDummyEvent;
      expect(deserialized).toBeInstanceOf(TestEigenschutzDummyEvent);
      expect(deserialized.einsatzId).toBe(TEST_EINSATZ_ID);
      expect(deserialized.userId).toBe(TEST_USER_ID);
    });
  });

  describe('Scope-Grenze — der Test-Eintrag leakt nicht in die Produktions-Registry', () => {
    it('getSupportedEventTypes() enthält den Test-Namen während des Tests, aber das afterEach räumt ihn wieder heraus', () => {
      const beforeCleanup = deserializer.getSupportedEventTypes();
      expect(beforeCleanup).toContain(TEST_EVENT_NAME);

      deserializerRegistry.delete(TEST_EVENT_NAME);

      const afterCleanup = deserializer.getSupportedEventTypes();
      expect(afterCleanup).not.toContain(TEST_EVENT_NAME);

      // Re-setup, damit das afterEach nichts findet und nicht doppelt löscht.
      deserializerRegistry.set(TEST_EVENT_NAME, () => Result.fail('sentinel'));
    });
  });
});
