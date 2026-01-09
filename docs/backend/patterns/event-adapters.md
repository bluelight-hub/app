# Integration Event Adapter Pattern

Dieses Dokument beschreibt das **Integration Event Adapter Pattern** in der Bluelight Hub Backend-Architektur. Es erklärt, wie Domain Events (reine Business Events) über die **Infrastructure Layer** transformiert und publiziert werden, um **Bounded Contexts** zu entkoppeln.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Domain Events vs. Integration Events](#domain-events-vs-integration-events)
3. [Bounded Context Isolation](#bounded-context-isolation)
4. [Adapter Pattern Struktur](#adapter-pattern-struktur)
5. [Praktische Beispiele](#praktische-beispiele)
6. [Outbox Integration](#outbox-integration)
7. [Best Practices](#best-practices)
8. [Fehlerbehandlung](#fehlerbehandlung)
9. [Testing](#testing)

---

## Überblick

Das Bluelight Hub Backend nutzt das **Adapter Pattern** zur Transformation von **Domain Events** zu **Integration Events**. Dies hat folgende Ziele:

- **Framework-Agnostik**: Application Layer bleibt unabhängig von NestJS
- **Bounded Context Isolation**: Events zwischen Contexts transformieren und entkoppeln
- **Testbarkeit**: Application Handler ohne Framework-Dependencies testen
- **Austauschbarkeit**: Event-Infrastruktur leicht austauschbar (EventEmitter2 → Message Queue)

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│ DOMAIN LAYER                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Domain Event (Framework-agnostic)                        │ │
│ │ z.B. EinsatzCreatedEvent (Business Fact)               │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────────▲────────────────────────────────────┘
                         │ Published by IEventPublisher
┌────────────────────────┴────────────────────────────────────┐
│ APPLICATION LAYER                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Application Handler (Framework-agnostic)                │ │
│ │ z.B. EtbAutoCreationHandler implements IEventHandler   │ │
│ │ • Fire-and-Forget Pattern                              │ │
│ │ • Fehler werden geloggt, nicht propagiert              │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────────▲────────────────────────────────────┘
                         │ Delegiert von Adapter via IEventHandler.handle()
┌────────────────────────┴────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (Event Adapters)                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Event Adapter (NestJS-specific)                         │ │
│ │ • @OnEvent Decorator (NestJS EventEmitter2)            │ │
│ │ • Delegiert an Application Handler                      │ │
│ │ z.B. EtbEventAdapter                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Event Publisher (EventEmitter2 Adapter)                │ │
│ │ Implements IEventPublisher Port                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Outbox Pattern (Event Persistence)                      │ │
│ │ • Speichert Events atomar mit Aggregates               │ │
│ │ • OutboxEventPublisher pollt und publiziert            │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Domain Events vs. Integration Events

### Domain Events (Intra-Bounded Context)

**Definition**: Domain Events repräsentieren **historische Fakten** innerhalb eines Bounded Context. Sie sind Teil des Domain Models und enthalten **nur geschäftsrelevante Daten**.

**Charakteristiken**:
- Framework-agnostic (keine NestJS Dependencies)
- Typischerweise mit Value Objects (z.B. `EinsatzId`, `UserId`)
- Private nur für den Bounded Context (z.B. Einsatz, ETB, Lagekarte)
- Teil des Domain Ubiquitous Language

**Beispiel - EinsatzCreatedEvent** (Domain Event):

```typescript
// src/domain/events/einsatz-created.event.ts
export class EinsatzCreatedEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: EinsatzId,          // Value Object
    public readonly createdBy: UserId,              // Value Object
    public readonly alarmstichwort: string,
    public readonly nummer: string,
  ) {
    super(einsatzId.toString());
  }

  static eventName(): string {
    return EVENT_NAMES.EINSATZ.CREATED; // 'einsatz.created'
  }
}
```

**Speicherung**: Via Transactional Outbox Pattern in DB
**Publikation**: Via OutboxEventPublisher (Polling Worker)

---

### Integration Events (Inter-Bounded Context)

**Definition**: Integration Events repräsentieren **Ereignisse zwischen Bounded Contexts**. Sie sind transformierte Domain Events für externe Konsumenten.

**Charakteristiken**:
- Können primitive Typen enthalten (keine Value Objects)
- Schema-versioniert für Backwards Compatibility
- Für externe Systems oder asynchrone Handler
- Definiert im Infrastructure Layer

**Beispiel - SendInviteEmailEvent** (Integration Event - hypotetisch):

```typescript
// src/infrastructure/events/integration-events/send-invite-email.event.ts
export interface SendInviteEmailEvent {
  eventId: string;
  eventName: 'invite.email.send';
  eventVersion: 1;
  inviteCodeId: string;           // Primitive, nicht Value Object
  email: string;
  expiresAt: string;              // ISO8601 statt Date
  label: string | null;
}
```

**Transformation**: In einem Event Adapter via `IEventTransformer<TDomain, TIntegration>`
**Publikation**: An externe Message Queue, REST-Webhook, etc.

---

## Bounded Context Isolation

Die Event Adapter Architektur isoliert Bounded Contexts durch explizite Transformationen:

### Beispiel: Einsatz → ETB Bounded Context

```
Einsatz Context (Domain)
        ↓
EinsatzCreatedEvent (Domain Event)
        ↓
OutboxEventPublisher (Persistence + Polling)
        ↓
EventEmitter2.emitAsync('einsatz.created', event)
        ↓
Infrastructure Layer: EtbEventAdapter
        ↓
Application Layer: EtbAutoCreationHandler (implements IEventHandler)
        ↓
ETB Context (Domain)
```

### Warum Transformation?

| Aspekt | Domain Event | Integration Event |
|--------|-------------|-------------------|
| **Ownership** | Einsatz Context | ETB Context (Consumer) |
| **Schema** | Kann sich ändern ohne Impact | Versioniert für Stability |
| **Typen** | Value Objects (Type-safe) | Primitives (Serializable) |
| **Entkopplung** | Tight via Events | Loose via Adapter |

### Praktische Isolierung in der Codebase

```
src/
├── domain/events/
│   ├── einsatz-created.event.ts        # Einsatz Context Event
│   └── event-names.ts                   # Zentrale Event Name Constants
│
├── application/etb/event-handlers/
│   └── etb-auto-creation.handler.ts     # ETB Context Handler (Framework-agnostic)
│
└── infrastructure/events/
    ├── adapters/
    │   └── etb-event.adapter.ts         # Adapter: Bridge zwischen Contexts
    ├── event-emitter-publisher.ts       # IEventPublisher Implementation
    └── outbox/
        └── outbox-event-publisher.ts    # Polling Worker
```

**Key Insight**: Der ETB Context deklariert keine Abhängigkeit vom Einsatz Context. Stattdessen empfängt er Events über den Infrastructure Layer Adapter, was echte Entkopplung ermöglicht.

---

## Adapter Pattern Struktur

### Die drei Säulen des Patterns

#### 1. Infrastructure Event Adapter (@OnEvent Decorator)

Befindet sich im **Infrastructure Layer** und nutzt NestJS-spezifische Features:

**Verantwortung**:
- Empfängt Domain Events via `@OnEvent` Decorator
- Delegiert an Application Layer Handler via IEventHandler Interface
- Loggt Event-Empfang und Fehler

**Dateistruktur**: `/infrastructure/events/adapters/<context>-event.adapter.ts`

```typescript
// src/infrastructure/events/adapters/etb-event.adapter.ts

/**
 * NestJS Event Adapter für ETB Auto-Creation.
 *
 * Empfängt EinsatzCreatedEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class EtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ETB_AUTO_CREATION)
    private readonly handler: IEventHandler<EinsatzCreatedEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt EinsatzCreatedEvent und delegiert an Application Handler.
   *
   * Event Flow:
   * 1. OutboxEventPublisher emittiert 'einsatz.created' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler führt Business Logic aus (Fire-and-Forget)
   */
  @OnEvent(EinsatzCreatedEvent.eventName())
  async onEinsatzCreated(event: EinsatzCreatedEvent): Promise<void> {
    this.logger.log(`Received EinsatzCreatedEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId.value,
      occurredAt: event.occurredAt,
    });
    await this.handler.handle(event);
  }
}
```

**Key Points**:
- `@OnEvent(EventName)` ist der einzige Framework-Einstiegspunkt
- `EVENT_HANDLER.ETB_AUTO_CREATION` Token injiziert Application Handler
- Keine Business Logic im Adapter → nur Delegation

#### 2. Application Event Handler (IEventHandler Interface)

Befindet sich im **Application Layer** und ist **komplett framework-agnostic**:

**Verantwortung**:
- Implementiert IEventHandler Port
- Führt Business Logic aus (Fire-and-Forget Pattern)
- Fehler werden geloggt, nicht propagiert

**Dateistruktur**: `/application/<context>/event-handlers/<trigger>-handler.ts`

```typescript
// src/application/etb/event-handlers/etb-auto-creation.handler.ts

/**
 * Automatische ETB-Erstellung bei Einsatz-Erstellung.
 *
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 */
@Injectable()
export class EtbAutoCreationHandler implements IEventHandler<EinsatzCreatedEvent> {
  constructor(
    private readonly createEtbHandler: CreateEtbHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Fire-and-Forget Pattern:
   * - Fehler werden geloggt aber NICHT propagiert
   * - Einsatz-Erstellung wird NICHT blockiert bei ETB-Fehlern
   * - Idempotent: Duplicate Events werden graceful behandelt
   */
  async handle(event: EinsatzCreatedEvent): Promise<void> {
    const einsatzIdValue = event.einsatzId.value;

    this.logger.log(`Auto-creating ETB for Einsatz`, {
      einsatzId: einsatzIdValue,
      occurredAt: event.occurredAt,
    });

    try {
      const commandResult = CreateEtbCommand.create(einsatzIdValue);

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create CreateEtbCommand`, {
          einsatzId: einsatzIdValue,
          error: commandResult.error,
        });
        return; // Fire-and-Forget: Nicht propagieren
      }

      const result = await this.createEtbHandler.execute(commandResult.value!);

      if (result.isFailure) {
        const errorMessage = result.error ?? '';
        const isAlreadyExists = errorMessage.toLowerCase().includes('already exists');

        if (isAlreadyExists) {
          // Idempotenz: ETB existiert bereits - das ist OK bei at-least-once delivery
          this.logger.warn(`ETB already exists for Einsatz ${einsatzIdValue}`, {
            einsatzId: einsatzIdValue,
          });
        } else {
          this.logger.error(`Failed to create ETB`, {
            einsatzId: einsatzIdValue,
            error: errorMessage,
          });
        }
        return;
      }

      this.logger.log(`ETB created successfully`, {
        einsatzId: einsatzIdValue,
        etbId: result.value!.value,
      });
    } catch (error) {
      // Unerwarteter Fehler mit Stack Trace
      this.logger.error(`Unexpected error during ETB auto-creation`, {
        einsatzId: einsatzIdValue,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
```

**Key Points**:
- `@Injectable()` ist die einzige NestJS Annotation (nötig für DI)
- Kein `@OnEvent`, `@Controller`, oder andere Framework Decorators
- Fire-and-Forget Pattern: Fehler werden geloggt, nicht propagiert
- Idempotent: Duplicate Events werden graceful behandelt (at-least-once delivery)

#### 3. Infrastructure Publisher (IEventPublisher Port)

Befindet sich im **Infrastructure Layer** und implementiert den IEventPublisher Port:

**Verantwortung**:
- Publiziert Domain Events via NestJS EventEmitter2
- Nutzt `emitAsync()` für async Handler-Support
- Fire-and-Forget Fehlerbehandlung

**Dateistruktur**: `/infrastructure/events/event-emitter-publisher.ts`

```typescript
// src/infrastructure/events/event-emitter-publisher.ts

/**
 * EventEmitter2 Adapter für IEventPublisher Port.
 *
 * Diese Klasse implementiert den IEventPublisher Port und delegiert
 * das Event Publishing an NestJS EventEmitter2.
 */
@Injectable()
export class EventEmitterPublisher implements IEventPublisher {
  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Publiziert ein einzelnes Domain Event via EventEmitter2.
   *
   * Der Event Name wird via statische eventName() Methode ermittelt,
   * was type-safe Event Routing ermöglicht.
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventName = (event.constructor as typeof DomainEvent).eventName();
    try {
      await this.eventEmitter.emitAsync(eventName, event);
      this.logger.debug(`Event '${eventName}' published`, {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      // Fire-and-Forget: Log aber nicht propagieren
      this.logger.warn(`Event handler error for '${eventName}'`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
```

**Key Points**:
- Implementiert Domain Port `IEventPublisher` (nicht Framework-spezifisch)
- `emitAsync()` erlaubt async Handler
- Static `eventName()` Methode ermöglicht type-safe Routing

---

## Praktische Beispiele

### Beispiel 1: InviteCode Created Event

Komplette Flow vom Domain Event über Outbox bis zur Handler-Execution:

#### Domain Event Definition

```typescript
// src/domain/events/invite-code-created.event.ts

/**
 * Domain Event: Neuer InviteCode wurde erstellt.
 * Repräsentiert historische Tatsache (Past Tense).
 */
export class InviteCodeCreatedEvent extends DomainEvent {
  constructor(
    public readonly inviteCodeId: InviteCodeId,
    public readonly codeMasked: string,              // Maskiert für Security
    public readonly expiresAt: Date,
    public readonly maxUses: number,
    public readonly createdById: string,
    public readonly label: string | null = null,
  ) {
    super(inviteCodeId.toString());
  }

  static eventName(): string {
    return EVENT_NAMES.INVITE_CODE.CREATED;  // 'invite_code.created'
  }
}
```

#### Aggregate erzeugt Event

```typescript
// src/domain/aggregates/invite-code.aggregate.ts

export class InviteCodeAggregate extends AggregateRoot {
  static create(
    code: string,
    expiresAt: Date,
    maxUses: number,
    createdById: string,
    label?: string | null,
  ): Result<InviteCodeAggregate> {
    // Validierung...

    const inviteCodeId = new InviteCodeId(CUID());
    const codeMasked = `${code.substring(0, 4)}****`;

    const aggregate = new InviteCodeAggregate(
      inviteCodeId,
      code,
      codeMasked,
      expiresAt,
      maxUses,
      createdById,
      label ?? null,
      new Map(),
      new Map(),
      0,
    );

    // Event erzeugen und zu Aggregate hinzufügen
    aggregate.addDomainEvent(
      new InviteCodeCreatedEvent(
        inviteCodeId,
        codeMasked,
        expiresAt,
        maxUses,
        createdById,
        label ?? null,
      )
    );

    return Result.ok(aggregate);
  }
}
```

#### Transactional Handler speichert atomar

```typescript
// src/application/admin/commands/create-invite-code.handler.ts

@Injectable()
export class CreateInviteCodeHandler extends TransactionalCommandHandler<
  CreateInviteCodeCommand,
  InviteCodeId
> {
  protected async executeInTransaction(
    command: CreateInviteCodeCommand,
    tx: TransactionContext,
  ): Promise<{ result: InviteCodeId; events: DomainEvent[] }> {
    // Aggregate erstellen (mit Event)
    const aggregateResult = InviteCodeAggregate.create(
      command.code,
      command.expiresAt,
      command.maxUses,
      command.createdById,
      command.label,
    );

    if (aggregateResult.isFailure) {
      return { result: undefined as any, events: [] };
    }

    const aggregate = aggregateResult.value;

    // ATOMAR: Aggregate + Events in gleicher Transaction speichern
    await this.repository.save(aggregate, tx);

    // Events extrahieren und von Aggregate löschen
    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate.id, events };
  }
}
```

Die `TransactionalCommandHandler` Base Class kümmert sich um:
1. Transaction ausführen
2. Aggregate speichern
3. Events in Outbox persistieren (atomar!)
4. Events zurückgeben

#### Outbox Publisher pollt und publiziert

```typescript
// src/infrastructure/outbox/outbox-event-publisher.service.ts

@Injectable()
export class OutboxEventPublisher implements OnModuleInit, OnModuleDestroy {
  /**
   * Cron Job: Pollt alle 5 Sekunden nach PENDING Events
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async publishPendingEvents(): Promise<void> {
    if (this.isRunning) {
      this.consecutiveSkips++;
      return;  // Skip if already running
    }

    this.isRunning = true;

    try {
      await this.processPendingEvents();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verarbeitet PENDING Events mit Pessimistic Locking (FOR UPDATE SKIP LOCKED)
   */
  private async processPendingEvents(): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // 1. Lade und LOCKE PENDING Events
        const events = await this.outboxRepository.findAndLockPending(
          this.config.batchSize,
          tx as TransactionContext,
        );

        if (events.length === 0) {
          this.consecutiveEmptyPolls++;
          return;
        }

        this.logger.log(`Processing ${events.length} pending events (locked)`);

        // 2. Für jedes Event: Deserialize + Publish + Mark as PUBLISHED
        for (const event of events) {
          await this.processEvent(event, tx as TransactionContext);
        }
      },
      { timeout: 10000, maxWait: 5000 },
    );
  }

  /**
   * Verarbeitet ein einzelnes Event innerhalb einer Transaction
   */
  private async processEvent(outboxEvent: OutboxEventDto, tx: TransactionContext): Promise<void> {
    try {
      // 1. Deserialize JSON → DomainEvent
      const deserializeResult = this.eventDeserializer.deserialize(
        outboxEvent.payload as SerializedEvent,
      );

      if (deserializeResult.isFailure) {
        this.logger.error(`Deserialization failed for event ${outboxEvent.id}`);
        await this.outboxRepository.markAsPermanentlyFailed(
          outboxEvent.id,
          tx,
          deserializeResult.error,
        );
        return;
      }

      // 2. Publish via EventEmitter2 (triggers Infrastructure Adapters)
      const domainEvent = deserializeResult.value;
      await this.eventPublisher.publish(domainEvent);

      // 3. Mark as PUBLISHED (innerhalb TX → Lock bleibt gehalten)
      await this.outboxRepository.markAsPublished(outboxEvent.id, tx);
      this.logger.log(`Event ${outboxEvent.id} published successfully`);
    } catch (error) {
      // Fehlerbehandlung mit Retry-Logik
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.outboxRepository.markAsFailed(outboxEvent.id, errorMessage, tx);

      if (outboxEvent.retryCount + 1 >= this.config.maxRetries) {
        await this.outboxRepository.markAsPermanentlyFailed(outboxEvent.id, tx);
        await this.notifyFailure(outboxEvent, errorMessage);
      }
    }
  }
}
```

#### Infrastructure Adapter empfängt

```typescript
// src/infrastructure/events/adapters/etb-event.adapter.ts

@Injectable()
export class EtbEventAdapter {
  @OnEvent(EinsatzCreatedEvent.eventName())
  async onEinsatzCreated(event: EinsatzCreatedEvent): Promise<void> {
    this.logger.log(`Received EinsatzCreatedEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId.value,
    });
    // Delegiert an Application Handler
    await this.handler.handle(event);
  }
}
```

#### Application Handler verarbeitet

```typescript
// src/application/etb/event-handlers/etb-auto-creation.handler.ts

async handle(event: EinsatzCreatedEvent): Promise<void> {
  const einsatzIdValue = event.einsatzId.value;
  this.logger.log(`Auto-creating ETB for Einsatz`, {
    einsatzId: einsatzIdValue,
  });

  try {
    const commandResult = CreateEtbCommand.create(einsatzIdValue);
    if (commandResult.isFailure) {
      this.logger.error(`Failed to create CreateEtbCommand`, {
        error: commandResult.error,
      });
      return;
    }

    const result = await this.createEtbHandler.execute(commandResult.value!);
    if (result.isFailure) {
      this.logger.error(`Failed to create ETB`, { error: result.error });
      return;
    }

    this.logger.log(`ETB created successfully`, {
      etbId: result.value!.value,
    });
  } catch (error) {
    this.logger.error(`Unexpected error during ETB auto-creation`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

### Gesamter Flow

```
1. CreateInviteCodeHandler.executeInTransaction()
   ↓ (atomar in DB Transaction)
2. InviteCodeAggregate.create() erzeugt InviteCodeCreatedEvent
   ↓
3. aggregate.addDomainEvent(event)
   ↓
4. repository.save(aggregate, tx) speichert:
   - InviteCode Aggregate → invitecodes table
   - InviteCodeCreatedEvent → outbox table (PENDING Status)
   ↓
5. TransactionContext COMMIT → Beide Tabellen committed atomar
   ↓
6. OutboxEventPublisher.publishPendingEvents() pollt alle 5 Sekunden
   ↓
7. findAndLockPending() lädt Events mit FOR UPDATE SKIP LOCKED
   ↓
8. EventDeserializer.deserialize(json) → InviteCodeCreatedEvent
   ↓
9. EventEmitterPublisher.publish(event) publiziert via EventEmitter2
   ↓
10. @OnEvent(EventName) triggert Infrastructure Adapter
    ↓
11. Adapter delegiert zu IEventHandler.handle()
    ↓
12. Application Handler führt Business Logic aus (Fire-and-Forget)
    ↓
13. markAsPublished(id) in DB → PUBLISHED Status
```

---

## Outbox Integration

Das Transactional Outbox Pattern ist zentral für Event Reliability:

### Warum Outbox?

**Problem ohne Outbox**:
```
1. Aggregate in DB speichern ✓
2. Event publizieren
   - Netzwerkfehler → Event verloren!
   - App crasht → Event verloren!
```

**Lösung mit Outbox**:
```
1. Aggregate in DB speichern (TX)
2. Event in Outbox speichern (gleiche TX)
   - Entweder beide succeed oder beide fail (ACID)
3. Polling Worker holt Events und publiziert asynchron
   - Retries bei Fehler
   - Bei App-Crash: Events werden bei Restart erneut verarbeitet
```

### Outbox Datenbank Schema

```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY,
  aggregate_id VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_version INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING, PUBLISHED, FAILED
  retry_count INT NOT NULL DEFAULT 0,
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX idx_outbox_status ON outbox(status);
CREATE INDEX idx_outbox_aggregate ON outbox(aggregate_id);
```

### Event Status Lifecycle

```
PENDING → PUBLISHED ✓
  ↓ (Fehler)
  → FAILED (retry_count < maxRetries)
    → PENDING (bei Retry)
  ↓ (Fehler nach maxRetries)
  → PERMANENTLY_FAILED (mit Alert)
```

### Serialisierung

Events werden als JSON in Outbox gespeichert:

```typescript
// src/infrastructure/outbox/event-serializer.ts

interface SerializedEvent {
  eventId: string;
  eventName: string;                    // z.B. 'invite_code.created'
  eventVersion: number;                 // Für Schema Evolution
  occurredAt: string;                   // ISO8601
  aggregateId?: string;
  payload: Record<string, unknown>;     // Event-spezifische Daten
}
```

**Beispiel für InviteCodeCreatedEvent**:

```json
{
  "eventId": "evt_abc123",
  "eventName": "invite_code.created",
  "eventVersion": 1,
  "occurredAt": "2025-01-08T10:30:00Z",
  "aggregateId": "invcode_xyz789",
  "payload": {
    "inviteCodeId": "invcode_xyz789",
    "codeMasked": "ABC1****",
    "expiresAt": "2025-02-08T10:30:00Z",
    "maxUses": 10,
    "createdById": "user_123",
    "label": "Admin Invite"
  }
}
```

### Race Condition Prevention

Der Outbox Publisher nutzt **PostgreSQL FOR UPDATE SKIP LOCKED** für sichere Parallelisierung:

```typescript
// Pseudo-SQL in findAndLockPending()
SELECT * FROM outbox
WHERE status = 'PENDING'
FOR UPDATE SKIP LOCKED
LIMIT 100;
```

**Wie es funktioniert**:
- Scheduler Instance A sperrt Events 1-50 mit FOR UPDATE
- Scheduler Instance B skipped diese (SKIP LOCKED) und verarbeitet Events 51-100
- Keine Duplikate, auch bei horizontaler Skalierung!
- Lock wird bei Transaction COMMIT automatisch freigegeben

---

## Best Practices

### 1. Event Naming Convention

**Domain Event Namen** (Dot-Notation):
```typescript
// event-names.ts
EVENT_NAMES.INVITE_CODE.CREATED   // 'invite_code.created'
EVENT_NAMES.EINSATZ.UPDATED       // 'einsatz.updated'
EVENT_NAMES.LAGEKARTE.POI_ADDED   // 'lagekarte.poi_added'
```

**Warum Constants statt Magic Strings?**
- Type Safety: IDE Auto-Completion
- Refactoring: Sicheres Umbenennen
- Typo-Vermeidung: Verhindert 'einsatz.craeted'
- Single Source of Truth: Event-Namen an einem Ort

```typescript
// ✅ RICHTIG
@OnEvent(EVENT_NAMES.EINSATZ.CREATED)
async handleEinsatzCreated(event: EinsatzCreatedEvent) { ... }

// ❌ FALSCH
@OnEvent('einsatz.created')  // Magic String!
async handleEinsatzCreated(event: EinsatzCreatedEvent) { ... }
```

### 2. Fire-and-Forget Pattern

Event Handler sollten **NIEMALS** Fehler propagieren:

```typescript
// ✅ RICHTIG: Fehler geloggt, nicht propagiert
async handle(event: EinsatzCreatedEvent): Promise<void> {
  try {
    const result = await this.createEtbHandler.execute(command);
    if (result.isFailure) {
      this.logger.error(`Failed to create ETB`, { error: result.error });
      return;  // Fire-and-Forget: NICHT throw!
    }
  } catch (error) {
    this.logger.error(`Unexpected error`, { error });
    // Fire-and-Forget: NICHT re-thrown!
  }
}

// ❌ FALSCH: Fehler propagiert → blockiert Event Publisher
async handle(event: EinsatzCreatedEvent): Promise<void> {
  const result = await this.createEtbHandler.execute(command);
  if (result.isFailure) {
    throw new Error(result.error);  // Blockiert Outbox Publisher!
  }
}
```

**Warum Fire-and-Forget?**
- Event-Handler sind **asynchrone Side Effects**, nicht kritisch
- Falls ETB-Erstellung fehlschlägt, sollte Einsatz-Erstellung nicht blockiert werden
- Fehler werden geloggt und können manuel nachbearbeitet werden
- Bei at-least-once Delivery: Duplicate Events sind OK (Idempotenz)

### 3. Idempotenz und at-least-once Delivery

Das Outbox Pattern mit Retries garantiert **at-least-once Delivery**, nicht exactly-once:

```typescript
// Outbox Publisher kann gleichen Event mehrfach publizieren:
// 1. Event publiziert
// 2. App crasht BEVOR markAsPublished() ausgeführt wird
// 3. Nach Restart: Event wird nochmal publiziert
// → Handler muss idempotent sein!

// ✅ RICHTIG: Idempotent (Duplicate Events handled gracefully)
async handle(event: EinsatzCreatedEvent): Promise<void> {
  const einsatzId = event.einsatzId.value;

  // 1. Versuche ETB zu erstellen
  const result = await this.createEtbHandler.execute(command);

  // 2. Falls bereits existiert → OK (at-least-once Delivery)
  if (result.isFailure) {
    const errorMessage = result.error ?? '';
    if (errorMessage.toLowerCase().includes('already exists')) {
      this.logger.warn(`ETB already exists (duplicate event), skipping`);
      return;  // Idempotent!
    }
    // Echter Fehler → loggen
    this.logger.error(`Failed to create ETB`, { error });
    return;
  }
}

// ❌ FALSCH: Nicht idempotent (Duplicate Events cause errors)
async handle(event: EinsatzCreatedEvent): Promise<void> {
  // Einfach ETB erstellen ohne Duplicate-Check
  const result = await this.createEtbHandler.execute(command);
  // Falls Event zweimal kommt → Unique Constraint Violation!
}
```

### 4. DI Token Pattern

Verwende **Symbol Tokens** für Event Handler, nicht direkte Klassen:

```typescript
// ✅ RICHTIG: Symbol Token für maximale Entkopplung
// di-tokens.ts
export const EVENT_HANDLER = {
  ETB_AUTO_CREATION: Symbol('IEventHandler<EinsatzCreatedEvent>'),
};

// Module Registration
{
  provide: EVENT_HANDLER.ETB_AUTO_CREATION,
  useClass: EtbAutoCreationHandler,
}

// In Adapter
@Inject(EVENT_HANDLER.ETB_AUTO_CREATION)
private readonly handler: IEventHandler<EinsatzCreatedEvent>

// ❌ FALSCH: Direkte Klasse → weniger Entkopplung
{
  provide: EtbAutoCreationHandler,
  useClass: EtbAutoCreationHandler,
}

@Inject(EtbAutoCreationHandler)
private readonly handler: EtbAutoCreationHandler
```

**Warum Symbol Tokens?**
- Interface-basiert, nicht Implementation-basiert
- Austauschbare Implementierungen (Mocking in Tests)
- Reduziert Circular Dependencies

### 5. Framework-Agnostik

Application Handler sollten **NIEMALS** NestJS Imports haben:

```typescript
// ✅ RICHTIG: Nur @Injectable (für DI)
import { Injectable, Inject } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';

@Injectable()
export class EtbAutoCreationHandler implements IEventHandler<EinsatzCreatedEvent> {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}
}

// ❌ FALSCH: Framework-spezifische Imports
import { Injectable, Controller, Get, Post } from '@nestjs/common';  // Zu viel!
import { Response } from 'express';  // Nicht im Application Layer!
import { HttpException } from '@nestjs/common';  // Domain Exceptions verwenden!

@Injectable()
export class EtbAutoCreationHandler {
  @Get('/etb')  // ❌ Controller Decorator im Handler!
  async handleRequest(@Res() res: Response) {  // ❌ Express Typen!
    throw new HttpException(...);  // ❌ HTTP Exception!
  }
}
```

---

## Fehlerbehandlung

### Event Handler Fehlerbehandlung (Fire-and-Forget)

```typescript
async handle(event: EinsatzCreatedEvent): Promise<void> {
  try {
    // Business Logic
    const commandResult = CreateEtbCommand.create(einsatzId);
    if (commandResult.isFailure) {
      this.logger.error(`Command creation failed`, {
        error: commandResult.error,
      });
      return;  // Fire-and-Forget
    }

    const result = await this.createEtbHandler.execute(commandResult.value!);
    if (result.isFailure) {
      this.logger.error(`Execution failed`, { error: result.error });
      return;  // Fire-and-Forget
    }

    this.logger.log(`Success`);
  } catch (error) {
    // Unerwartete Fehler mit Stack Trace
    this.logger.error(`Unexpected error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Fire-and-Forget: NICHT re-thrown!
  }
}
```

### Outbox Event Publisher Fehlerbehandlung

```typescript
private async processEvent(
  outboxEvent: OutboxEventDto,
  tx: TransactionContext,
): Promise<void> {
  const { id, eventName, retryCount } = outboxEvent;

  try {
    // 1. Deserialize
    const deserializeResult = this.eventDeserializer.deserialize(
      outboxEvent.payload as SerializedEvent,
    );

    if (deserializeResult.isFailure) {
      // Non-retryable: Corrupt data
      this.logger.error(`Deserialization failed`, { eventName });
      await this.outboxRepository.markAsPermanentlyFailed(
        id,
        tx,
        deserializeResult.error,
      );
      await this.notifyFailure(outboxEvent, deserializeResult.error);
      return;
    }

    // 2. Publish
    const domainEvent = deserializeResult.value;
    await this.eventPublisher.publish(domainEvent);

    // 3. Mark as Published
    await this.outboxRepository.markAsPublished(id, tx);
    this.logger.log(`Event published successfully`, { eventName });
  } catch (error) {
    // Retryable: Handler error
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Event failed`, { eventName, error: errorMessage, retryCount });

    await this.outboxRepository.markAsFailed(id, errorMessage, tx);

    const newRetryCount = retryCount + 1;
    if (newRetryCount >= this.config.maxRetries) {
      this.logger.error(
        `Event exceeded max retries (${this.config.maxRetries})`,
        { eventName },
      );
      await this.outboxRepository.markAsPermanentlyFailed(id, tx);
      await this.notifyFailure(outboxEvent, errorMessage);
    }
  }
}
```

### Fehlerklassifizierung

| Fehlertyp | Handling | Retry? | Alert? |
|-----------|----------|--------|--------|
| **Deserialization Error** | Non-retryable, Mark PERMANENTLY_FAILED | ✗ | ✓ |
| **Handler Timeout** | Retryable, Increment retryCount | ✓ | Nach MAX_RETRIES |
| **Database Connection Error** | Retryable, Let Exception propagate | ✓ | Nach MAX_RETRIES |
| **Business Logic Error** | Fire-and-Forget in Handler, Log | ✗ | ✗ (nur Logs) |

---

## Testing

### Unit Test: Application Event Handler

```typescript
// src/application/etb/event-handlers/__tests__/etb-auto-creation.handler.spec.ts

describe('EtbAutoCreationHandler', () => {
  let handler: EtbAutoCreationHandler;
  let createEtbHandler: jest.Mocked<CreateEtbHandler>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    createEtbHandler = {
      execute: jest.fn(),
    } as any;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    handler = new EtbAutoCreationHandler(createEtbHandler, logger);
  });

  it('should create ETB on EinsatzCreatedEvent', async () => {
    // Given (Arrange)
    const einsatzId = new EinsatzId('einsatz-123');
    const event = new EinsatzCreatedEvent(
      einsatzId,
      new UserId('user-456'),
      'Wohnungsbrand',
      'E-2025-001',
    );

    const etbId = new EtbId('etb-789');
    createEtbHandler.execute.mockResolvedValue(Result.ok(etbId));

    // When (Act)
    await handler.handle(event);

    // Then (Assert)
    expect(createEtbHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        einsatzId: 'einsatz-123',
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Auto-creating'),
      expect.any(Object),
    );
  });

  it('should handle idempotent duplicate events gracefully', async () => {
    // Given (Arrange)
    const einsatzId = new EinsatzId('einsatz-123');
    const event = new EinsatzCreatedEvent(
      einsatzId,
      new UserId('user-456'),
      'Wohnungsbrand',
      'E-2025-001',
    );

    const alreadyExistsError = 'ETB already exists for Einsatz einsatz-123';
    createEtbHandler.execute.mockResolvedValue(Result.fail(alreadyExistsError));

    // When (Act)
    await handler.handle(event);

    // Then (Assert) - Should log warning, not error
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('already exists'),
      expect.any(Object),
    );
    // Should NOT throw
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not propagate handler errors (Fire-and-Forget)', async () => {
    // Given (Arrange)
    const einsatzId = new EinsatzId('einsatz-123');
    const event = new EinsatzCreatedEvent(
      einsatzId,
      new UserId('user-456'),
      'Wohnungsbrand',
      'E-2025-001',
    );

    createEtbHandler.execute.mockRejectedValue(new Error('Database error'));

    // When (Act) - Should NOT throw
    await expect(handler.handle(event)).resolves.toBeUndefined();

    // Then (Assert) - Error should be logged, not propagated
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected error'),
      expect.any(Object),
    );
  });
});
```

### Integration Test: Event Flow (Outbox Pattern)

```typescript
// src/infrastructure/outbox/__tests__/event-roundtrip.spec.ts

describe('Event Roundtrip (Outbox Pattern)', () => {
  let outboxPublisher: OutboxEventPublisher;
  let prisma: PrismaService;
  let einsatzRepository: PrismaEinsatzRepository;
  let etbAutoCreationHandler: EtbAutoCreationHandler;

  beforeEach(async () => {
    // Setup: Create test module with all layers
    const module = await Test.createTestingModule({
      imports: [
        // Domain
        // Application
        EtbApplicationModule,
        // Infrastructure
        OutboxModule,
        // Adapters
        EventAdaptersModule,
      ],
    }).compile();

    outboxPublisher = module.get(OutboxEventPublisher);
    prisma = module.get(PrismaService);
    einsatzRepository = module.get(PrismaEinsatzRepository);
    etbAutoCreationHandler = module.get(EtbAutoCreationHandler);
  });

  it('should persist event in outbox and publish on polling', async () => {
    // Given (Arrange): Create Einsatz (which publishes EinsatzCreatedEvent)
    const createCommand = CreateEinsatzCommand.create({
      alarmstichwort: 'Wohnungsbrand',
      nummer: 'E-2025-001',
      createdBy: 'user-123',
    });

    // When (Act): Execute handler
    const einsatzHandler = module.get(CreateEinsatzHandler);
    const result = await einsatzHandler.execute(createCommand.value!);

    // Then (Assert): Check Outbox table
    const outboxEvents = await prisma.outbox.findMany({
      where: {
        eventName: EVENT_NAMES.EINSATZ.CREATED,
      },
    });

    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].status).toBe('PENDING');
    expect(outboxEvents[0].eventName).toBe('einsatz.created');

    // When (Act): Trigger Outbox Publisher
    await outboxPublisher.triggerManually();

    // Then (Assert): Event should be published
    const publishedEvents = await prisma.outbox.findMany({
      where: {
        eventName: EVENT_NAMES.EINSATZ.CREATED,
        status: 'PUBLISHED',
      },
    });

    expect(publishedEvents).toHaveLength(1);

    // Verify Handler was called (ETB created)
    const etb = await prisma.etb.findFirst({
      where: { einsatzId: result.value.value },
    });
    expect(etb).toBeDefined();
  });

  it('should retry failed events up to maxRetries', async () => {
    // Given: Create event that will fail
    const event = new EinsatzCreatedEvent(
      new EinsatzId('einsatz-123'),
      new UserId('user-456'),
      'Test',
      'E-2025-001',
    );

    // Mock handler to fail
    jest.spyOn(etbAutoCreationHandler, 'handle').mockRejectedValue(
      new Error('Transient error'),
    );

    // When: Publish event (will fail)
    await outboxPublisher.triggerManually();

    // Then: Check retry_count incremented
    const outboxEvent = await prisma.outbox.findFirst({
      where: { eventName: EVENT_NAMES.EINSATZ.CREATED },
    });

    expect(outboxEvent?.retryCount).toBeGreaterThan(0);
    expect(outboxEvent?.status).toBe('FAILED');

    // When: Trigger again
    await outboxPublisher.triggerManually();

    // Then: Should increment again until maxRetries
    const retryEvent = await prisma.outbox.findFirst({
      where: { eventName: EVENT_NAMES.EINSATZ.CREATED },
    });

    expect(retryEvent?.retryCount).toBeGreaterThan(outboxEvent!.retryCount);
  });
});
```

---

## Zusammenfassung

Das Integration Event Adapter Pattern in Bluelight Hub bietet:

1. **Entkopplung von Bounded Contexts**: Events sind die einzige Kommunikation
2. **Framework-Agnostizität**: Application Layer unabhängig von NestJS
3. **Reliability**: Transactional Outbox Pattern garantiert Event Persistence
4. **Testbarkeit**: Application Handler ohne Framework TestingModule testbar
5. **Austauschbarkeit**: Event-Infrastruktur leicht austauschbar

**Key Architectural Layers**:
- **Domain**: Domain Events (Business Facts)
- **Application**: Event Handler (Business Logic, Fire-and-Forget)
- **Infrastructure**: Event Adapters (Framework Integration)
- **Infrastructure**: Event Publisher + Outbox (Event Delivery)

**Kritische Best Practices**:
- ✅ Fire-and-Forget: Fehler geloggt, nicht propagiert
- ✅ Idempotenz: at-least-once Delivery handeln
- ✅ DI Tokens: Symbol Tokens für maximale Entkopplung
- ✅ EVENT_NAMES Constants: Type-safe Event Routing
- ✅ Transactional Outbox: Events atomar mit Aggregates speichern
