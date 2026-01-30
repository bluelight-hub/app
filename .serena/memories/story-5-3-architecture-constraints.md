# Story 5.3: Architektonische Constraints und Patterns

## Aktueller Status
- **Projekt**: Erinnerungen mit ETB-Integration (Event-Driven Outbox Pattern)
- **Branch**: 109-wecker-erinnerungen
- **Architecture Document**: `/Users/rubeen/dev/personal/bluelight-hub/_bmad-output/planning-artifacts/architecture.md`
- **Task**: Story 5.3 - Atomare ETB-Dokumentation mit Outbox Pattern

## Story 5.3 Anforderungen

### Acceptance Criteria
**AC1**: Domain Event wird atomar mit ETB-Eintrag gespeichert
- Event wird in Outbox-Tabelle PENDING gespeichert
- Outbox-Processor verarbeitet es asynchron
- ETB-Eintrag wird garantiert erstellt

**AC2**: Transaktionsrollback führt zu keinem Event/Eintrag
- Bei Fehler: Keine Outbox-Persistierung
- Keine ETB-Eintrag-Erstellung
- Vollständige Atomarität

### Zielarchitektur (AD-004)
```
ErinnerungErstelltEvent (Domain Event)
    ↓
TransactionalCommandHandler
    ↓
OutboxRepository.save(events, tx)  [innerhalb der TX]
    ↓
OutboxEventPublisher (Polling, 5sec interval)
    ↓
EventDeserializer.deserialize()
    ↓
EventEmitter.publish(DomainEvent)
    ↓
ErinnerungErstelltEventHandler (Fire-and-Forget)
    ↓
AddEintragHandler → ETB-Eintrag
```

## Technischer Stack - MUST FOLLOW

### Backend Layer-Struktur (Hexagonal)
```
domain/               → Business Rules, Events, Repositories (Ports)
application/          → Commands, Queries, Event Handlers (Use Cases)
infrastructure/       → Prisma Repository, Outbox, Scheduler
modules/              → NestJS Controller, Gateway
```

### Bestehende Pattern-Implementierungen

#### 1. Outbox Pattern (EXISTING - MUST USE)
**Location**: `/packages/backend/src/infrastructure/outbox/`

**Komponenten**:
- `OutboxEventPublisher` - Polling Service (CRON EVERY_5_SECONDS)
- `PrismaOutboxRepository` - DB Access with FOR UPDATE SKIP LOCKED
- `EventDeserializer` - JSON → DomainEvent
- `EventSerializer` - DomainEvent → JSON

**Key Implementation Details**:
```typescript
// 1. Transactional Outbox Pattern
await prisma.$transaction(async (tx) => {
  await aggregateRepository.save(aggregate, tx);
  await outboxRepository.save(aggregate.domainEvents, tx);
});

// 2. Pessimistic Locking (Race Condition Prevention)
const events = await outboxRepository.findAndLockPending(
  100,  // batchSize
  tx    // Transaction Context für FOR UPDATE SKIP LOCKED
);

// 3. Error Handling (Deserialization Errors = Non-Retryable)
if (deserializeResult.isFailure) {
  await outboxRepository.markAsPermanentlyFailed(id, tx, error);
  return;
}

// 4. Handler-Fehler = Retryable (bis maxRetries=3)
try {
  await eventPublisher.publish(domainEvent);
  await outboxRepository.markAsPublished(id, tx);
} catch (error) {
  await outboxRepository.markAsFailed(id, error.message, tx);
  if (++retryCount >= maxRetries) {
    await outboxRepository.markAsPermanentlyFailed(id, tx);
  }
}
```

**Config**:
- maxRetries: 3
- batchSize: 100
- Polling Interval: 5 seconds
- Transaction Timeout: 10 seconds

#### 2. Database Schema (Prisma)

**OutboxEvent Table**:
```prisma
model OutboxEvent {
  id                String            @id @default(cuid())
  eventName         String            @db.VarChar(100)  // e.g. "erinnerung.created"
  eventVersion      Int               @default(1)
  aggregateId       String            @db.VarChar(100)  // Erinnerungs-ID
  payload           Json              @db.JsonB         // Serialized Event
  status            OutboxEventStatus @default(PENDING) // PENDING | PUBLISHED | FAILED
  retryCount        Int               @default(0)
  lastFailureReason String?           @db.Text
  createdAt         DateTime          @default(now())
  occurredAt        DateTime          // Original Event Time
  publishedAt       DateTime?

  @@index([status, createdAt], map: "idx_outbox_pending_poll")
  @@index([aggregateId], map: "idx_outbox_aggregate_id")
}

enum OutboxEventStatus {
  PENDING
  PUBLISHED
  FAILED
}
```

**Erinnerung Table Constraints**:
```prisma
model Erinnerung {
  id           String           @id @default(cuid())
  einsatzId    String           @map("einsatz_id")        // FK - CASCADE DELETE
  status       ErinnerungStatus @default(GEPLANT)
  faelligAm    DateTime         @map("faellig_am")
  
  // Story 5.0: ETB-Integration
  etbEntryId   String?          @map("etb_entry_id")     // Bidirektionale Verknüpfung
  
  // Audit
  erstelltVon  String           @map("erstellt_von")
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
}

enum ErinnerungStatus {
  GEPLANT      // Initial
  AUSGELOEST   // Timer fires
  ACKNOWLEDGED // User acknowledged
  SNOOZED      // Temporarily postponed
  ESKALIERT    // Escalated
  ERLEDIGT     // Completed
}
```

#### 3. Domain Events (MUST REGISTER in EventDeserializer)

**Erinnerung Events** (Lines 55-67 of event-deserializer.ts):
```typescript
import { ErinnerungErstelltEvent } from '@domain/events/erinnerung-erstellt.event';
import { ErinnerungAusgeloestEvent } from '@domain/events/erinnerung-ausgeloest.event';
import { ErinnerungAcknowledgedEvent } from '@domain/events/erinnerung-acknowledged.event';
import { ErinnerungSnoozedEvent } from '@domain/events/erinnerung-snoozed.event';
import { ErinnerungEskaliertEvent } from '@domain/events/erinnerung-eskaliert.event';
import { ErinnerungErledigtEvent } from '@domain/events/erinnerung-erledigt.event';
import { ErinnerungAssignedEvent } from '@domain/events/erinnerung-assigned.event';
import { ErinnerungIntensiviertEvent } from '@domain/events/erinnerung-intensiviert.event';
import { ErinnerungRetriggeredEvent } from '@domain/events/erinnerung-retriggered.event';
import { ErinnerungAktualisiertEvent } from '@domain/events/erinnerung-aktualisiert.event';
import { ErinnerungGeloeschtEvent } from '@domain/events/erinnerung-geloescht.event';
```

**KRITISCH**: Jedes Event MUSS in EventDeserializer.deserialize() registriert werden
- Pattern: Case-Statement für eventName → new EventClass(payload)
- Format: Payload = JSON mit allen Event-Eigenschaften
- Location: `/packages/backend/src/infrastructure/outbox/event-deserializer.ts`

#### 4. Event Handlers (Fire-and-Forget Pattern)

**Existing Example**: `erinnerung-erstellt.handler.ts`

**Requirements**:
```typescript
@Injectable()
export class ErinnerungErstelltEventHandler implements IEventHandler<ErinnerungErstelltEvent> {
  // 1. MUST inject dependencies with DI tokens
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  // 2. Fire-and-Forget Pattern (do NOT propagate errors)
  async handle(event: ErinnerungErstelltEvent): Promise<void> {
    try {
      // Log, validate, execute
      const result = await this.addEintragHandler.execute(command);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`);
        return; // ← CRITICAL: Return instead of throw
      }
      this.logger.log('ETB entry created successfully');
    } catch (error) {
      this.logger.error(`Unexpected error: ${error}`);
      // ← CRITICAL: Do NOT re-throw
    }
  }
}
```

**Regeln**:
- ❌ NIEMALS `throw` - Exception propagiert zum Outbox Publisher
- ✅ IMMER loggen bei Fehlern
- ✅ IMMER `return` bei Fehler
- ✅ Fire-and-Forget erlaubt Duplikate (ETB hat eigene Idempotenz)

#### 5. ETB Integration Template

**ETB Category Enum Extension**:
```typescript
// Story 5.1: Neue Kategorie für Erinnerungen
enum EtbKategorie {
  // ... existing
  ERINNERUNG,  // ← NEW
}
```

**ETB Entry Mapping (Story 5.2)**:
| Event | ETB Type | Text Template |
|-------|----------|--------------|
| ErinnerungErstelltEvent | ERINNERUNG | "Erinnerung '{titel}' erstellt, fällig um {faelligAm}" |
| ErinnerungAusgeloestEvent | ERINNERUNG | "Erinnerung '{titel}' ausgelöst" |
| ErinnerungAcknowledgedEvent | ERINNERUNG | "Erinnerung '{titel}' bestätigt von {person}" |
| ErinnerungSnoozedEvent | ERINNERUNG | "Erinnerung '{titel}' verschoben um {dauer}" |
| ErinnerungEskaliertEvent | ERINNERUNG | "Erinnerung '{titel}' eskaliert an {person}" |
| ErinnerungErledigtEvent | ERINNERUNG | "Erinnerung '{titel}' erledigt: {notiz}" |

**Metadata für Bidirektionale Verknüpfung**:
```typescript
{
  eventType: 'ErinnerungErstellt',
  erinnerungId: event.erinnerungId.toString(),
  faelligAm: event.faelligAm.toISOString(),
  // ... additional context
}
```

## Code Patterns MUST FOLLOW

### Pattern 1: Transactional Command Handler
```typescript
@Injectable()
export class CreateErinnerungHandler
  extends TransactionalCommandHandler<CreateErinnerungCommand, ErinnerungId> {
  async execute(command: CreateErinnerungCommand, tx?: TransactionContext) {
    // 1. Create/Load Aggregate
    const erinnerung = Erinnerung.create(command);
    
    // 2. Apply Business Logic (emits Domain Events)
    erinnerung.auslösen();
    
    // 3. Save Aggregate + Events ATOMICALLY
    await this.repository.save(erinnerung, tx);
    await this.outboxRepository.save(erinnerung.domainEvents, tx);
    
    // 4. Clear Events (prevent re-publishing)
    erinnerung.clearDomainEvents();
    
    return Result.ok(erinnerung.id);
  }
}
```

### Pattern 2: Result Pattern (Error Handling)
```typescript
// ✅ IMMER Result verwenden für Business Errors
const result = Result.fail('Cannot acknowledge already-completed reminder');
if (result.isFailure) {
  this.logger.error(result.error);
  return result;
}

// ✅ Value-Zugriff nur nach isFailure-Check
if (!result.isFailure) {
  const value = result.value; // TypeScript weiß dass es safe ist
}
```

### Pattern 3: DI Import Rule (AC1)
```typescript
// ✅ IMMER "import" für Injectable Classes (Runtime DI)
import { AddEintragHandler } from '../add-eintrag.handler';

// ❌ NIEMALS "import type" für Injectable Classes
import type { AddEintragHandler } from '../add-eintrag.handler';  // BREAKS DI!
```

### Pattern 4: API Decorators (AC7 - OpenAPI)
```typescript
@Controller('erinnerungen')
export class ErinnerungController {
  @Post()
  @ApiWrappedCreatedResponse(ErinnerungDto, {
    description: 'Erinnerung erfolgreich erstellt'
  })
  async create(@Body() dto: CreateErinnerungDto) {
    // ...
  }
}
```

## Testing Requirements

### Test Locations
- **Domain**: `domain/erinnerung/__tests__/`
- **Handlers**: `application/erinnerung/commands/__tests__/`
- **Controllers**: `modules/erinnerung/controllers/__tests__/`
- **Outbox**: `/infrastructure/outbox/__tests__/`

### Outbox Tests (EXISTING EXAMPLES)
```typescript
// Race Condition Test
'should prevent duplicate event processing with FOR UPDATE SKIP LOCKED'

// Retry Test
'should retry failed events up to maxRetries'

// Deserialization Test
'should mark corrupt events as FAILED without retries'

// Atomic Transaction Test
'should rollback both aggregate and outbox on error'
```

## Critical Rules for Story 5.3

### MUST DO
1. ✅ Use TransactionalCommandHandler base class
2. ✅ Call `outboxRepository.save(domainEvents, tx)` WITHIN transaction
3. ✅ Clear domain events after save: `aggregate.clearDomainEvents()`
4. ✅ Register all Domain Events in EventDeserializer.deserialize()
5. ✅ Implement Event Handlers as Fire-and-Forget
6. ✅ Log ALL errors with proper context
7. ✅ Test atomic rollback scenarios
8. ✅ Use Result Pattern for all business errors
9. ✅ Use proper DI Tokens and imports
10. ✅ Add comprehensive test coverage

### MUST NOT DO
1. ❌ Directly create ETB entries in Command Handlers
2. ❌ Throw exceptions from Event Handlers
3. ❌ Use "import type" for Injectable Classes
4. ❌ Create Domain Events without emitting them
5. ❌ Mix Fire-and-Forget with synchronous event handling
6. ❌ Forget to register Events in EventDeserializer
7. ❌ Save Events outside of transaction
8. ❌ Create Events without proper timestamps
9. ❌ Log sensitive data (passwords, tokens)
10. ❌ Forget to update error messages with actionRequired context

## Development Workflow for Story 5.3

1. **Domain Layer**
   - Update ErinnerungEntity to emit Domain Events on state changes
   - Events: Created, Updated, Deleted, Triggered, Acknowledged, etc.
   - Use Result Pattern for state transitions

2. **Application Layer**
   - Extend/Create Command Handlers (CreateErinnerung, UpdateErinnerung, etc.)
   - Each must inherit from TransactionalCommandHandler
   - Save aggregate + events atomically

3. **Infrastructure Layer**
   - OUTBOX PATTERN ALREADY EXISTS - USE IT
   - Register Events in EventDeserializer
   - Create Event Handlers for ETB Integration

4. **Modules Layer**
   - Create/Update Controllers with @ApiWrappedResponse decorators
   - Wire up DI in module

5. **Testing**
   - Test transactional rollback
   - Test event publishing
   - Test ETB entry creation
   - Integration tests with E2E

## Key Files Reference

**Infrastructure**:
- `/packages/backend/src/infrastructure/outbox/outbox-event-publisher.service.ts` (Polling)
- `/packages/backend/src/infrastructure/outbox/prisma-outbox.repository.ts` (DB)
- `/packages/backend/src/infrastructure/outbox/event-deserializer.ts` (Must update!)
- `/packages/backend/src/infrastructure/outbox/event-serializer.ts` (JSON mapping)

**Domain Ports**:
- `/packages/backend/src/domain/repositories/i-outbox.repository.ts` (Interface)
- `/packages/backend/src/domain/ports/i-event-handler.port.ts` (Handler interface)

**Pattern Examples**:
- `/packages/backend/src/application/common/handlers/` (TransactionalCommandHandler)
- `/packages/backend/src/application/etb/event-handlers/` (Fire-and-Forget handlers)
- `/packages/backend/src/domain/common/result.ts` (Result pattern)

**Tests**:
- `/packages/backend/src/infrastructure/outbox/__tests__/outbox-race-condition.integration.spec.ts`
- `/packages/backend/src/infrastructure/einsatz/__tests__/outbox-integration.e2e.spec.ts`

## Architecture Validation Checklist for Story 5.3

- [ ] All Erinnerung Domain Events registered in EventDeserializer
- [ ] Command Handlers use TransactionalCommandHandler + Outbox
- [ ] Event Handlers implement Fire-and-Forget pattern
- [ ] ETB category enum extended with ERINNERUNG
- [ ] ETB Event Templates defined for all 6 events
- [ ] Metadata includes erinnerungId + eventType
- [ ] Tests verify atomic transactions + rollback
- [ ] Tests verify event retry logic
- [ ] DI imports use "import" not "import type"
- [ ] All errors logged with actionRequired context

## Zusätzliche Ressourcen

- **Architecture Document**: `/Users/rubeen/dev/personal/bluelight-hub/_bmad-output/planning-artifacts/architecture.md`
- **Implementation Report**: `/Users/rubeen/dev/personal/bluelight-hub/_bmad-output/planning-artifacts/implementation-readiness-report-2026-01-18-v2.md`
- **Story 5.3 Details**: `/Users/rubeen/dev/personal/bluelight-hub/_bmad-output/planning-artifacts/epics/epic-5-etb-integration.md#story-53-atomare-etb-dokumentation-mit-outbox-pattern`
