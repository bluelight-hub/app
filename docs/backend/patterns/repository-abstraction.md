# Repository-Abstraction Pattern

Eine detaillierte Anleitung zum Repository-Abstraction Pattern in der Hexagonal Architecture des BlueLight Hub Backends.

**Sprache:** Deutsch mit englischen Code-Beispielen
**Zielgruppe:** Backend-Entwickler, Architecture-Reviewer

---

## 1. Pattern Overview

### Warum Repository-Abstraction in Hexagonal Architecture?

Das Repository-Abstraction Pattern ist ein zentraler Baustein der Hexagonal Architecture (Ports & Adapters Pattern):

```
Domain Layer (Business Rules)
    ↑
    │ implements
    │
    └─── IEinsatzRepository (Port Interface)
         └─ Definition: "Ich brauche einen Way, Einsätze zu persistieren"
         └ Framework-agnostisch (KEINE Prisma Types im Domain Layer)

Infrastructure Layer (Technical Implementation)
    │
    └─── PrismaEinsatzRepository (Adapter Implementation)
         └─ Umsetzung: "Ich nutze Prisma ORM um Einsätze zu speichern"
         └ Framework-spezifisch (Prisma Client API)
```

### Warum ist diese Abstraktion kritisch?

| Problem | Lösung durch Repository-Abstraction |
|---------|--------------------------------------|
| **Testability** | Mock-Repository ohne echte DB für Unit Tests |
| **Austauschbarkeit** | Framework-Wechsel (Prisma → TypeORM) betrifft nur Infrastructure Layer |
| **Domain Isolation** | Domain Layer bleibt unabhängig vom Persistence Framework |
| **Clean Architecture** | Abhängigkeiten fließen nach innen (Modules → Infrastructure → Application → Domain) |
| **CQRS + Events** | Repository ermöglicht atomare Persistierung von Aggregates + Domain Events |

### Die Architektur-Layer

```
┌─────────────────────────────────────────┐
│ MODULES (REST Controller Layer)         │
│ - NestJS @Controller, @Post, etc.       │
│ - HTTP Request Handling                 │
└──────────────────┬──────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────┐
│ APPLICATION (Use Cases Layer)           │
│ - Command/Query Handlers                │
│ - Business Orchestration                │
│ - Uses IRepository Interfaces (DI)      │
└──────────────────┬──────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────┐
│ INFRASTRUCTURE (Technical Layer)        │
│ - PrismaRepository Implementations      │
│ - Database Access, ORM Setup            │
│ - Event Publishing Adapters             │
└──────────────────┬──────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────┐
│ DOMAIN (Business Rules Layer)           │
│ - Aggregates, Entities, Value Objects   │
│ - Repository PORT Interfaces (Abstract) │
│ - NO Framework Dependencies             │
└─────────────────────────────────────────┘
```

**Kritische Regel:** Domain Layer importiert NIEMALS Infrastructure oder Modules.

---

## 2. Interface Definition (Domain Layer)

Repository Port Interfaces werden im Domain Layer definiert. Sie stellen eine **Abstrakation** dar, nicht eine konkrete Implementierung.

### Grundstruktur eines Repository Interface

```typescript
// packages/backend/src/domain/repositories/i-invite-code.repository.ts
import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { InviteCode } from '../aggregates/invite-code.aggregate';
import type { InviteCodeId } from '../value-objects/invite-code-id';

/**
 * Repository Port Interface für InviteCode Aggregates (Hexagonal Architecture).
 *
 * Definiert die Persistenz-Schnittstelle für InviteCode Aggregates ohne
 * technische Details der Implementierung. Die konkrete Umsetzung erfolgt in der
 * Infrastructure Layer (PrismaInviteCodeRepository).
 *
 * **Warum Port Interface:**
 * - Dependency Inversion Principle: Domain Layer hängt von Abstraktion ab
 * - Testability: Mock-Repository für Unit Tests ohne echte Datenbankverbindung
 * - Framework-Agnostic: Keine Prisma-Typen in Domain Layer Signaturen
 */
export interface IInviteCodeRepository {
  /**
   * Findet einen InviteCode anhand seiner Type-Safe ID.
   *
   * @param id - InviteCodeId Value Object
   * @param tx - Optional Transaction Context für Atomizität
   * @returns Result<InviteCode | null> - Success mit InviteCode oder null
   */
  findById(id: InviteCodeId, tx?: TransactionContext): Promise<Result<InviteCode | null>>;

  /**
   * Persistiert ein InviteCode Aggregate (Create oder Update).
   *
   * @param inviteCode - InviteCode Aggregate
   * @param tx - Optional Transaction Context für Atomizität
   * @returns Result<void> - Success oder Failure bei Persistenz-Fehler
   */
  save(inviteCode: InviteCode, tx?: TransactionContext): Promise<Result<void>>;
}
```

### Wichtige Design-Entscheidungen

#### 1. Result<T> Pattern statt Exceptions

```typescript
// ✅ RICHTIG: Result Pattern für erwartete Fehler
async findById(id: InviteCodeId): Promise<Result<InviteCode | null>> {
  // Caller kann isFailure prüfen
  // Caller hat Type-Safe Fehler-Informationen
  // Kein Exception-Overhead
}

// ❌ FALSCH: Exceptions werfen
async findById(id: InviteCodeId): Promise<InviteCode> {
  throw new Error('Code nicht gefunden'); // Unbewartbar
}
```

**Warum Result statt throw?**
- Erwartete Fehler (Code existiert nicht) sind NORMAL, nicht exceptional
- Exceptions sind für UNERWARTETE Fehler (DB Connection Failed, Netzwerk)
- Result ermöglicht korrekte Type-Safety auf Handler-Ebene

#### 2. TransactionContext statt Prisma.TransactionClient

```typescript
// ✅ RICHTIG: Opaque TransactionContext Type
async save(aggregate: Einsatz, tx?: TransactionContext): Promise<Result<void>>;

// ❌ FALSCH: Prisma Types im Domain Layer
async save(aggregate: Einsatz, tx?: Prisma.TransactionClient): Promise<void>;
```

**Warum TransactionContext?**
- Domain Layer bleibt **framework-agnostisch**
- Infrastructure Layer castet `tx as PrismaClient` intern
- Framework-Wechsel (Prisma → TypeORM) betrifft nur Infrastructure
- Domain Logic benötigt nicht zu wissen, WIE Transactions funktionieren

#### 3. Type-Safe IDs statt Strings

```typescript
// ✅ RICHTIG: Type-Safe Value Objects
async findById(id: InviteCodeId): Promise<Result<InviteCode | null>>;

// ❌ FALSCH: String IDs (verwechselbar, keine Type-Safety)
async findById(id: string): Promise<Result<InviteCode | null>>;
```

Value Objects erzwingen korrekten ID-Typ zur Compile-Zeit:
```typescript
const userId = UserId.create('user-123').value!;
const inviteCodeId = InviteCodeId.create('invite-456').value!;

// Diese Zeile wird TypeScript-Fehler werfen - ID-Typ stimmt nicht!
const code = await inviteCodeRepository.findById(userId); // ❌ Type Error
```

#### 4. Null statt Exception für "Not Found"

```typescript
// ✅ RICHTIG: Null für "nicht gefunden" ist normaler Fall
async findById(id: InviteCodeId): Promise<Result<InviteCode | null>> {
  if (!exists) return Result.ok(null);
}

// ❌ FALSCH: Exception werfen
async findById(id: InviteCodeId): Promise<InviteCode> {
  if (!exists) throw new NotFoundException(); // Unnötiger Overhead
}
```

### Pagination & Filterung

Repositories sollten effiziente **Abfrage-Optionen** für Listen-Queries unterstützen:

```typescript
/**
 * Filter-Optionen für die InviteCode-Abfrage.
 */
export interface InviteCodeFilters {
  status?: InviteCodeStatus; // Filter nach berechnetem Status
  createdById?: string;       // Filter nach Ersteller-ID
}

/**
 * Sortier-Optionen für die InviteCode-Abfrage.
 */
export interface InviteCodeSortOptions {
  field: 'createdAt' | 'expiresAt' | 'useCount';
  direction: 'asc' | 'desc';
}

/**
 * Pagination-Optionen für die InviteCode-Abfrage.
 */
export interface InviteCodePaginationOptions {
  page: number;      // 1-basiert
  pageSize: number;  // Einträge pro Seite
}

/**
 * Paginiertes Ergebnis für InviteCode-Abfragen.
 */
export interface InviteCodePaginatedResult<T> {
  items: T[];           // Einträge für aktuelle Seite
  total: number;        // Gesamtanzahl (über alle Seiten)
  page: number;         // Aktuelle Seitennummer
  pageSize: number;     // Einträge pro Seite
  totalPages: number;   // Berechnet: ceil(total / pageSize)
}

// Repository Method
export interface IInviteCodeRepository {
  /**
   * Findet alle InviteCodes mit Pagination, Filterung und Sortierung.
   *
   * **Warum paginiert statt findAll():**
   * - Performance: Verhindert Memory Overflow bei vielen Einträgen
   * - UX: Frontend kann Pagination implementieren
   * - Serverseitige Filterung: Reduziert Datentransfer
   */
  findAll(
    filters?: InviteCodeFilters,
    sort?: InviteCodeSortOptions,
    pagination?: InviteCodePaginationOptions,
    tx?: TransactionContext,
  ): Promise<Result<InviteCodePaginatedResult<InviteCode>>>;
}
```

### Barrel Export Konvention

Alle Repository Interfaces werden über ein zentrales Index-File exportiert:

```typescript
// packages/backend/src/domain/repositories/index.ts

/**
 * Domain Layer Repository Interfaces Barrel Export.
 *
 * Diese Datei exportiert alle Repository Port Interfaces aus dem Domain Layer.
 * Repository Interfaces definieren die Abstraction zwischen Domain Layer und
 * Infrastructure Layer (Hexagonal Architecture / Ports & Adapters Pattern).
 */

export { IEinsatzRepository } from './ieinsatz.repository';
export { IEtbRepository } from './i-etb.repository';
export { ILagekarteRepository } from './i-lagekarte.repository';
export { IUserRepository } from './i-user.repository';
export { IOutboxRepository } from './i-outbox.repository';
export {
  IInviteCodeRepository,
  type InviteCodeFilters,
  type InviteCodeSortOptions,
  type InviteCodePaginationOptions,
  type InviteCodePaginatedResult,
} from './i-invite-code.repository';
```

**Vorteile des Barrel Export:**
- ✅ Zentrale Import-Stelle für alle Repository Interfaces
- ✅ Verhindert Deep Imports (`@domain/repositories/i-einsatz.repository`)
- ✅ Erleichtert Refactoring (File Moves brechen keine Imports)
- ✅ Bessere IDE Auto-Complete Unterstützung

---

## 3. Implementation (Infrastructure Layer)

Die konkrete Implementierung erfolgt im Infrastructure Layer mit **Prisma ORM**.

### Grundstruktur einer Repository Implementation

```typescript
// packages/backend/src/infrastructure/repositories/prisma-invite-code.repository.ts

import { Injectable } from '@nestjs/common';
import type { IInviteCodeRepository } from '@domain/repositories';
import type { InviteCode } from '@domain/aggregates';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { PrismaClient } from '@prisma/client';

/**
 * Prisma Implementation des IInviteCodeRepository (Hexagonal Architecture).
 *
 * Diese Klasse implementiert das Domain Repository Port Interface
 * mit Prisma ORM als Persistence Technology. Sie ist Teil der
 * Infrastructure Layer und damit austauschbar (z.B. durch TypeORM,
 * MongoDB, In-Memory Implementation für Tests).
 */
@Injectable()
export class PrismaInviteCodeRepository implements IInviteCodeRepository {
  /**
   * Constructor mit PrismaService Dependency Injection.
   *
   * PrismaService wird von NestJS gemanaged und stellt den
   * Prisma Client zur Verfügung. Singleton-Pattern im App-Lifecycle.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Speichert das InviteCode-Aggregat (Upsert: Create oder Update).
   *
   * Diese Methode implementiert das Upsert-Pattern für Aggregate Persistence.
   * Sie erstellt einen neuen Code wenn dieser noch nicht existiert, oder
   * aktualisiert einen existierenden Code.
   *
   * **Warum Upsert statt separates save/update:**
   * - Einfachheit: Keine Existenz-Prüfung vor save()
   * - Idempotenz: save() kann mehrfach aufgerufen werden
   * - Atomarity: Single DB Call garantiert keine Race Conditions
   */
  async save(
    inviteCode: InviteCode,
    tx?: TransactionContext,
  ): Promise<Result<void>> {
    try {
      // Transaction Client: externe tx oder interne Prisma Client
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      // Aggregate → Prisma Data Mapping
      const data = PrismaInviteCodeMapper.toPersistence(inviteCode);

      // UPSERT: CREATE oder UPDATE (abhängig ob Code existiert)
      await client.inviteCode.upsert({
        where: { id: inviteCode.id.value },
        create: {
          ...data,
        },
        update: {
          ...data,
        },
      });

      // NOTE: Domain Events werden NICHT hier persistiert!
      // TransactionalCommandHandler extrahiert Events via getDomainEvents()
      // und speichert sie in Outbox. Repository darf clearDomainEvents()
      // NICHT aufrufen, sonst sind Events verloren.

      return Result.ok(undefined);
    } catch (error) {
      // Prisma Errors werden NICHT gecatched
      // Sie propagieren als Promise.reject() zur Application Layer
      // Application Layer muss Errors behandeln (Result Pattern)
      return Result.fail<void>(
        error instanceof Error ? error.message : 'Save failed',
      );
    }
  }

  /**
   * Lädt einen InviteCode anhand seiner ID.
   *
   * Gibt null zurück wenn kein Code mit dieser ID existiert.
   */
  async findById(
    id: InviteCodeId,
    tx?: TransactionContext,
  ): Promise<Result<InviteCode | null>> {
    try {
      // Transaction Client: externe tx oder interne Prisma Client
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      // Code laden
      const data = await client.inviteCode.findUnique({
        where: { id: id.value },
      });

      // NULL Handling: Code nicht gefunden
      if (!data) {
        return Result.ok(null);
      }

      // Prisma → Domain Mapping (Aggregate Reconstruction)
      const aggregate = PrismaInviteCodeMapper.toAggregate(data);
      return Result.ok(aggregate);
    } catch (error) {
      return Result.fail<InviteCode | null>(
        error instanceof Error ? error.message : 'Find failed',
      );
    }
  }

  /**
   * Prüft ob ein Code bereits existiert.
   *
   * **Uniqueness Constraint Enforcement:**
   * - Code MUSS unique sein
   * - Prüfung erfolgt VOR save() um DB Constraint Violation zu vermeiden
   */
  async existsByCode(
    code: InviteCodeValue,
    tx?: TransactionContext,
  ): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      const count = await client.inviteCode.count({
        where: { code: code.value },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail<boolean>(
        error instanceof Error ? error.message : 'Existence check failed',
      );
    }
  }
}
```

### Wichtige Implementation-Patterns

#### 1. TransactionContext Casting

```typescript
// ✅ RICHTIG: TransactionContext zur PrismaClient casten
async save(aggregate: InviteCode, tx?: TransactionContext): Promise<Result<void>> {
  // Cast zu PrismaClient (nur im Infrastructure Layer)
  const client = (tx as PrismaClient | undefined) ?? this.prisma;

  // Nutze client für alle DB-Operationen
  await client.inviteCode.upsert({ ... });
}

// ❌ FALSCH: TransactionContext direkt nutzen
async save(aggregate: InviteCode, tx?: TransactionContext): Promise<Result<void>> {
  // TransactionContext ist Opaque Type - nicht direkt nutzbar!
  await tx.inviteCode.upsert({ ... }); // Type Error!
}
```

#### 2. Fallback zu interne Prisma Client

```typescript
// ✅ RICHTIG: Fallback wenn keine externe Transaction
const client = (tx as PrismaClient | undefined) ?? this.prisma;
//              ^                                 ^^ Fallback zu this.prisma

// Pattern für:
// - save(aggregate) → Nutze this.prisma
// - save(aggregate, tx) → Nutze externe tx
```

#### 3. Aggregate Mapper (Domain ↔ Persistence)

Repository Implementierungen nutzen **Mapper** um zwischen Domain und Persistence zu konvertieren:

```typescript
/**
 * Mapper: InviteCode Aggregate ↔ Prisma Persistence
 */
export class PrismaInviteCodeMapper {
  /**
   * Konvertiert Domain Aggregate zu Prisma Persistence Data.
   *
   * Extrahiert alle Daten aus Domain Aggregate und prepares sie für DB-Speicherung.
   */
  static toPersistence(aggregate: InviteCode): CreateInviteCodeInput {
    return {
      id: aggregate.id.value,
      code: aggregate.code.value,
      createdById: aggregate.createdById,
      expiresAt: aggregate.expiresAt,
      maxUses: aggregate.maxUses,
      useCount: aggregate.useCount,
      isRevoked: aggregate.isRevoked,
      revokedAt: aggregate.revokedAt ?? null,
      revokedById: aggregate.revokedById ?? null,
      label: aggregate.label ?? null,
      createdAt: aggregate.createdAt,
    };
  }

  /**
   * Konvertiert Prisma Persistence Data zu Domain Aggregate.
   *
   * Rekonstruiert das Domain Aggregate aus DB-Daten.
   * Nutzt Private Constructor + setProperties() für Sicherheit.
   */
  static toAggregate(data: InviteCodeRecord): InviteCode {
    return InviteCode.create({
      id: InviteCodeId.create(data.id).value!,
      code: InviteCodeValue.fromString(data.code).value!,
      createdById: data.createdById,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses,
      useCount: data.useCount,
      isRevoked: data.isRevoked,
      revokedAt: data.revokedAt,
      revokedById: data.revokedById,
      label: data.label,
      createdAt: data.createdAt,
    }).value!;
  }
}
```

#### 4. Error Handling Pattern

```typescript
// ✅ RICHTIG: Try-Catch mit Result.fail()
async save(aggregate: InviteCode, tx?: TransactionContext): Promise<Result<void>> {
  try {
    // DB Operation
    await client.inviteCode.save({ ... });
    return Result.ok(undefined);
  } catch (error) {
    // Fehler mapppen zu Result.fail()
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Result.fail<void>(message);
  }
}

// ❌ FALSCH: Exception werfen
async save(aggregate: InviteCode, tx?: TransactionContext): Promise<void> {
  // Exception statt Result Pattern
  const result = await prisma.inviteCode.save({ ... }); // Keine Result Handling!
}
```

---

## 4. Transaction-Context Pattern

Das **TransactionContext Pattern** ermöglicht atomare Multi-Aggregate Operations über mehrere Repositories hinweg.

### Warum Transactions notwendig sind

Szenario: **Ein Einsatz wird erstellt und die Lagekarte automatisch erstellt (Event Handler)**

```typescript
// OHNE Transaction (❌ NICHT SICHER):
// 1. Einsatz wird in DB gespeichert ✓
// 2. EinsatzCreatedEvent wird emittiert
// 3. Event Handler versucht Lagekarte zu erstellen
// 4. DB Connection bricht ab! ❌ Lagekarte wird nie erstellt
// Ergebnis: Einsatz existiert, aber Lagekarte fehlt → Inkonsistenz

// MIT Transaction (✅ SICHER):
// 1. Start Transaction
// 2. Einsatz speichern in TX
// 3. Lagekarte speichern in TX
// 4. Commit Transaction
// Ergebnis: Beide existieren oder beide sind weg (Atomizität)
```

### TransactionContext Definition

```typescript
// packages/backend/src/domain/common/transaction.ts

/**
 * Opaque Type für Transaction Context.
 *
 * Diese Type ist ABSICHTLICH nicht näher spezifiziert.
 * Sie verhindert, dass Domain Layer Prisma-Types benötigt.
 *
 * Wie es funktioniert:
 * - Domain Layer: sieht nur "TransactionContext" (Abstraktion)
 * - Application Layer: erhält tx aus Prisma (konkret)
 * - Repository Layer: castet tx zu Prisma.TransactionClient (Implementation)
 */
export type TransactionContext = unknown;
```

**Warum "unknown" statt Prisma.TransactionClient?**
- Domain Layer importiert Prisma NICHT
- Infrastructure Layer castet intern zu konkretem Type
- Framework-Wechsel betrifft nur Repository Layer, nicht Domain/Application

### TransactionalCommandHandler Pattern

Der **TransactionalCommandHandler** orchestriert Transactions auf Handler-Ebene:

```typescript
// packages/backend/src/application/common/handlers/transactional-command.handler.ts

/**
 * Abstract Base Class für transaktionale Command Handler im Transactional Outbox Pattern.
 *
 * Orchestriert Aggregate-Persistierung und Domain-Event-Speicherung in einer
 * einzelnen Datenbank-Transaktion. Garantiert atomare Persistierung von
 * State Changes (Aggregate) und Events (Outbox) - verhindert Datenverlust
 * und inkonsistente Zustände bei Fehlerszenarien.
 */
@Injectable()
export abstract class TransactionalCommandHandler<TCommand, TResult> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly outboxRepository: IOutboxRepository,
  ) {}

  /**
   * Abstract Method - Subclasses implementieren Business Logic innerhalb der Transaktion.
   *
   * **WICHTIG:** Diese Methode läuft innerhalb einer Prisma Transaction (tx).
   * - Verwende den `tx` Parameter für alle DB-Operations (NICHT this.prisma)
   * - Return events NACH Domain Logic aber VOR clearDomainEvents()
   * - Events werden automatisch vom Base Handler im Outbox persistiert
   */
  protected abstract executeInTransaction(
    command: TCommand,
    tx: TransactionContext,
  ): Promise<Result<TResult> | { result: TResult; events: DomainEvent[] }>;

  /**
   * Public Entry Point - Führt Command in Transaction aus und persistiert Events im Outbox.
   *
   * **Transactional Flow:**
   * 1. Start Prisma Transaction (Isolation Level: READ_COMMITTED)
   * 2. Execute Business Logic (executeInTransaction)
   * 3. Bei Result.fail(): Transaction Rollback, Result propagieren
   * 4. Bei Result.ok(): Save Events to Outbox (atomar in gleicher TX)
   * 5. Commit Transaction oder Rollback bei Exception
   */
  async execute(command: TCommand): Promise<Result<TResult>> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Business Logic ausführen (Aggregate erstellen/ändern + persistieren)
          // WICHTIG: tx wird als TransactionContext übergeben (Opaque Type)
          // Infrastructure Repositories casten zu PrismaTransaction
          const executionResult = await this.executeInTransaction(
            command,
            tx as TransactionContext,
          );

          // 2. Check if business logic failed (Result Pattern)
          if ('isFailure' in executionResult && executionResult.isFailure) {
            // Transaction wird automatisch zurückgerollt wenn wir Exception werfen
            throw new Error(executionResult.error ?? 'Command execution failed');
          }

          // Success case: executionResult ist {result, events}
          const { result, events } = executionResult as {
            result: TResult;
            events: DomainEvent[];
          };

          // 3. Domain Events atomar im Outbox persistieren
          if (events.length > 0) {
            await this.outboxRepository.save(events, tx as TransactionContext);
          }

          // 4. Result zurückgeben (Transaction wird committed)
          return Result.ok(result);
        },
        {
          // Maximale Wartezeit für DB-Lock Acquisition (Concurrent Write Contention)
          maxWait: 5000,
          // Maximale Transaktionsdauer (Deadlock Prevention + Resource Cleanup)
          timeout: 10000,
        },
      );
    } catch (error) {
      // Fehler von executeInTransaction (Business Logic Fehler)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<TResult>(errorMessage);
    }
  }
}
```

### Praktisches Beispiel: Create Handler mit Transaction

```typescript
// packages/backend/src/application/admin/commands/create-invite.handler.ts

/**
 * Command Handler für Invite-Code Erstellung mit Transactional Outbox Pattern.
 *
 * Diese Klasse demonstriert:
 * 1. Aggregate Erstellung mit Validierung (Result Pattern)
 * 2. Persistierung in Transaction
 * 3. Domain Event Extraction
 * 4. Atomare Event-Persistierung im Outbox
 */
@Injectable()
export class CreateInviteHandler extends TransactionalCommandHandler<
  CreateInviteCommand,
  InviteCodeCreatorDto
> {
  constructor(
    prisma: PrismaService,
    outboxRepository: IOutboxRepository,
    @Inject(INVITE_CODE_REPOSITORY)
    private readonly inviteCodeRepository: IInviteCodeRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Business Logic: Erstelle Invite-Code mit Validierung.
   *
   * Läuft INNERHALB einer Prisma-Transaction (tx Parameter).
   * Alle DB-Operationen nutzen den tx Parameter.
   */
  protected async executeInTransaction(
    command: CreateInviteCommand,
    tx: TransactionContext,
  ): Promise<
    Result<InviteCodeCreatorDto> | { result: InviteCodeCreatorDto; events: DomainEvent[] }
  > {
    // 1. Validiere: Code existiert nicht bereits
    const existsResult = await this.inviteCodeRepository.existsByCode(
      command.code,
      tx,
    );
    if (existsResult.isFailure || existsResult.value) {
      // Code existiert bereits → Result.fail (nicht Exception!)
      return Result.fail('INVITE_CODE_EXISTS');
    }

    // 2. Erstelle Aggregate (Domain Layer - keine Seiteneffekte)
    const aggregateResult = InviteCode.create({
      code: command.code,
      expiresAt: command.expiresAt,
      maxUses: command.maxUses,
      label: command.label,
      createdById: command.createdById,
    });

    if (aggregateResult.isFailure) {
      return Result.fail(aggregateResult.error!);
    }

    const aggregate = aggregateResult.value!;

    // 3. Persistiere Aggregate in Transaction
    const saveResult = await this.inviteCodeRepository.save(aggregate, tx);
    if (saveResult.isFailure) {
      return Result.fail('INVITE_CODE_SAVE_FAILED');
    }

    // 4. Extrahiere Domain Events
    const events = aggregate.getDomainEvents();

    // 5. Return {result, events} - Base Handler speichert Events im Outbox
    const dto = InviteCodeCreatorDto.fromAggregate(aggregate);
    return {
      result: dto,
      events, // Base Handler speichert in Outbox (atomar)
    };
  }
}
```

### Transaction Flow Diagramm

```
Controller (REST Request)
    │
    └──→ Command Handler.execute(command)
         │
         ├─→ prisma.$transaction(async (tx) => {
         │   │
         │   ├─→ executeInTransaction(command, tx)
         │   │   │
         │   │   ├─→ inviteCodeRepository.findById(?, tx)  ← Nutze tx
         │   │   ├─→ Aggregate.create()                    ← Domain Logic
         │   │   ├─→ inviteCodeRepository.save(agg, tx)    ← Nutze tx
         │   │   ├─→ aggregate.getDomainEvents()
         │   │   └─→ return { result, events }
         │   │
         │   ├─→ Result.ok(result) → Transaction COMMIT
         │   │                       ↓
         │   ├─→ outboxRepository.save(events, tx)         ← Atomar
         │   │
         │   └─→ return Result.ok(result)
         │       │
         └──────→ Controller mappt zu HTTP Response
                 │
                 └──→ OutboxEventPublisher (async, non-blocking)
                      └──→ Publiziert Events zu Event Bus
```

---

## 5. DI Integration (Dependency Injection)

Repository-Interfaces werden via **Dependency Injection** in Handler injiziert. Dafür nutzen wir **DI_TOKENS** Constants.

### DI_TOKENS Pattern

```typescript
// packages/backend/src/infrastructure/di-tokens.ts

/**
 * Dependency Injection Tokens für Infrastructure Layer.
 *
 * Verwendet Symbol() für Compile-Time Type Safety und
 * Vermeidung von String-basierten Token Collisions.
 *
 * **Warum Symbol statt String:**
 * - Type Safety: TypeScript kann Symbol Types validieren
 * - Keine Namenskollisionen: Jedes Symbol ist einzigartig
 * - Bessere IDE-Unterstützung: Autocomplete und Refactoring
 * - Konsistent mit modernen DI Best Practices
 */

/** Repository Token für IUserRepository */
export const USER_REPOSITORY = Symbol('IUserRepository');

/** Repository Token für IEinsatzRepository */
export const EINSATZ_REPOSITORY = Symbol('IEinsatzRepository');

/** Repository Token für IInviteCodeRepository (Story 1-6) */
export const INVITE_CODE_REPOSITORY = Symbol('IInviteCodeRepository');

/**
 * Kräftemanagement Repository Tokens (Epic 1+).
 *
 * Verwaltung von Admin-Konfigurationsdaten:
 * - QUALIFIKATION: Qualifikations-Definitionen
 * - FAHRZEUGTYP: Fahrzeugtyp-Definitionen
 * - ROLLE: Rollen-Definitionen
 *
 * **WARUM nested Object statt flat Symbols?**
 * - **Namespacing:** Kräfte-Modul hat mehrere zusammenhängende Repositories
 * - **Zukunftssicher:** Weitere Repositories können hinzugefügt werden
 * - **Gruppierung:** Logische Gruppierung von verwandten Tokens
 * - **Konsistenz:** Alle Kräfte-Repositories unter einem Namespace
 */
export const KRAEFTE_REPOSITORIES = {
  QUALIFIKATION: Symbol('IQualifikationRepository'),
  FAHRZEUGTYP: Symbol('IFahrzeugtypRepository'),
  ROLLEN_DEFINITION: Symbol('IRollenDefinitionRepository'),
  FAHRZEUG_ERFASSUNG: Symbol('IFahrzeugErfassungRepository'),
} as const;

/** Alias für konsistente Verwendung in Application Layer */
export const DI_TOKENS = {
  REPOSITORIES: KRAEFTE_REPOSITORIES,
} as const;
```

### Registrierung im NestJS Module

```typescript
// packages/backend/src/modules/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { INVITE_CODE_REPOSITORY } from '@/infrastructure/di-tokens';
import { PrismaInviteCodeRepository } from '@/infrastructure/repositories/prisma-invite-code.repository';
import { CreateInviteHandler } from '@/application/admin/commands/create-invite.handler';
import { AdminInviteController } from './controllers/admin-invite.controller';

/**
 * Admin Module mit Invite-Code Management.
 *
 * Registriert:
 * - Repository Implementation (PrismaInviteCodeRepository)
 * - Command Handler (CreateInviteHandler)
 * - REST Controller (AdminInviteController)
 */
@Module({
  controllers: [AdminInviteController],
  providers: [
    // Repository Implementation mit DI Token
    {
      provide: INVITE_CODE_REPOSITORY,
      useClass: PrismaInviteCodeRepository,
    },

    // Command Handlers (NestJS injiziert Repository via DI Token)
    CreateInviteHandler,
    RevokeInviteHandler,
    ListInvitesHandler,
  ],
})
export class AdminModule {}
```

### Verwendung in Handler

```typescript
// packages/backend/src/application/admin/commands/create-invite.handler.ts

@Injectable()
export class CreateInviteHandler extends TransactionalCommandHandler<
  CreateInviteCommand,
  InviteCodeCreatorDto
> {
  constructor(
    prisma: PrismaService,
    outboxRepository: IOutboxRepository,
    // ✅ RICHTIG: Inject via DI_TOKEN (nicht String!)
    @Inject(INVITE_CODE_REPOSITORY)
    private readonly inviteCodeRepository: IInviteCodeRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateInviteCommand,
    tx: TransactionContext,
  ): Promise<Result<InviteCodeCreatorDto> | { result: InviteCodeCreatorDto; events: DomainEvent[] }> {
    // Verwende injiziertes Repository
    const existsResult = await this.inviteCodeRepository.existsByCode(
      command.code,
      tx,
    );
    // ...
  }
}
```

### AC1: DI Import Check (Wichtig!)

```typescript
// ✅ RICHTIG: import (NICHT import type) für Injectable Classes
import { MyService } from './my.service';
import { IRepository } from '../domain/repositories/i-repository';

@Injectable()
export class MyHandler {
  constructor(
    @Inject(MY_SERVICE_TOKEN) private readonly service: MyService,
    @Inject(REPOSITORY_TOKEN) private readonly repo: IRepository,
  ) {}
}

// ❌ FALSCH: import type bricht NestJS DI zur Laufzeit!
import type { MyService } from './my.service';
import type { IRepository } from '../domain/repositories/i-repository';

// TypeError: MyService is not a constructor (zur Laufzeit!)
@Injectable()
export class MyHandler {
  constructor(
    @Inject(MY_SERVICE_TOKEN) private readonly service: MyService, // undefined!
  ) {}
}
```

**Warum?** TypeScript's `import type` wird zur Compile-Zeit entfernt. NestJS DI benötigt das Runtime-Symbol.

---

## 6. Anti-Patterns (Was NICHT tun)

### Anti-Pattern 1: Direkter Prisma-Zugriff in Handlers

```typescript
// ❌ ANTI-PATTERN: Direkter Prisma-Zugriff
@Injectable()
export class BadCreateInviteHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateInviteCommand): Promise<void> {
    // ❌ FALSCH: Direkter Prisma-Zugriff in Application Layer
    await this.prisma.inviteCode.create({
      data: {
        code: command.code,
        expiresAt: command.expiresAt,
      },
    });
    // Probleme:
    // 1. Application Layer kennt Prisma (Framework-spezifisch)
    // 2. Keine Repository Abstraction (schwer zu testen)
    // 3. Keine Aggregate Persistierung (Domain Events verloren)
    // 4. Keine Transaction Koordination
  }
}

// ✅ RICHTIG: Repository Interface verwenden
@Injectable()
export class GoodCreateInviteHandler extends TransactionalCommandHandler<
  CreateInviteCommand,
  InviteCodeCreatorDto
> {
  constructor(
    prisma: PrismaService,
    outboxRepository: IOutboxRepository,
    @Inject(INVITE_CODE_REPOSITORY)
    private readonly inviteCodeRepository: IInviteCodeRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateInviteCommand,
    tx: TransactionContext,
  ): Promise<{ result: InviteCodeCreatorDto; events: DomainEvent[] }> {
    // ✅ RICHTIG: Repository Interface verwenden
    const aggregate = InviteCode.create({ ... });
    await this.inviteCodeRepository.save(aggregate, tx);
    return { result: dto, events: aggregate.getDomainEvents() };
  }
}
```

**Story 1.3 Beispiel:** Diese Handler wurde mit direktem Prisma-Zugriff implementiert und musste später refaktoriert werden.

### Anti-Pattern 2: String-basierte DI Tokens

```typescript
// ❌ ANTI-PATTERN: String-basierte Tokens
@Module({
  providers: [
    {
      provide: 'IInviteCodeRepository', // String Token
      useClass: PrismaInviteCodeRepository,
    },
  ],
})
export class AdminModule {}

@Injectable()
export class MyHandler {
  constructor(
    @Inject('IInviteCodeRepository') // String Token - typo-anfällig!
    private readonly repo: IInviteCodeRepository,
  ) {}
}

// Probleme:
// - Typo-anfällig: @Inject('IInvitCodeRepository') würde nicht gewarnt
// - Keine IDE-Unterstützung (kein Autocomplete)
// - Schwer zu refaktorieren (String-Suche statt Go-to-Definition)

// ✅ RICHTIG: Symbol-basierte Tokens
const INVITE_CODE_REPOSITORY = Symbol('IInviteCodeRepository');

@Module({
  providers: [
    {
      provide: INVITE_CODE_REPOSITORY,
      useClass: PrismaInviteCodeRepository,
    },
  ],
})
export class AdminModule {}

@Injectable()
export class MyHandler {
  constructor(
    @Inject(INVITE_CODE_REPOSITORY)
    private readonly repo: IInviteCodeRepository,
  ) {}
}
```

### Anti-Pattern 3: Domain Layer mit Framework Dependencies

```typescript
// ❌ ANTI-PATTERN: Prisma Types im Domain Layer
import { Prisma } from '@prisma/client';

export interface IInviteCodeRepository {
  findById(id: string): Promise<Prisma.inviteCodeGetPayload<...>>;
  save(data: Prisma.inviteCodeCreateInput): Promise<void>;
}

// Probleme:
// - Domain Layer ist nicht mehr framework-agnostisch
// - Framework-Wechsel betrifft Domain Layer (massive Refactoring)
// - Schwer zu unit testen (Prisma Types everywhere)

// ✅ RICHTIG: Domain Aggregates in Repository Interface
import type { InviteCode } from '@domain/aggregates';
import type { InviteCodeId } from '@domain/value-objects';

export interface IInviteCodeRepository {
  findById(id: InviteCodeId, tx?: TransactionContext): Promise<Result<InviteCode | null>>;
  save(inviteCode: InviteCode, tx?: TransactionContext): Promise<Result<void>>;
}
```

### Anti-Pattern 4: Exceptions statt Result Pattern

```typescript
// ❌ ANTI-PATTERN: Exceptions für erwartete Fehler
@Injectable()
export class BadHandler {
  async execute(command: CreateInviteCommand): Promise<InviteCodeCreatorDto> {
    // Repository throw Exception für "nicht gefunden"
    const existing = await this.repo.findByCode(command.code);
    // ^ wirft NotFoundException wenn nicht gefunden

    // Problem: Exception-Overhead für normale Cases
    // Problem: Keine Type-Safety auf Handler Level
  }
}

// ✅ RICHTIG: Result Pattern für erwartete Fehler
@Injectable()
export class GoodHandler {
  async execute(command: CreateInviteCommand): Promise<Result<...>> {
    // Repository gibt Result<Aggregate | null> zurück
    const result = await this.repo.findByCode(command.code, tx);

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const existing = result.value;
    if (existing) {
      return Result.fail('CODE_EXISTS');
    }
  }
}
```

### Anti-Pattern 5: Keine Aggregate Boundary

```typescript
// ❌ ANTI-PATTERN: Repository für Entity (nicht Aggregate)
export interface IInviteCodeItemRepository {
  // Operiert auf einzelnen InviteCodeItems statt Aggregate
  createItem(code: string, ...): Promise<void>;
  updateItem(itemId: string, ...): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
}

// Problem: Keine Aggregate Boundary (Invariants können verletzt werden)
// Problem: Keine Domain Events (Items sind einzelne Operationen)

// ✅ RICHTIG: Repository für Aggregate
export interface IInviteCodeRepository {
  // Operiert auf ganzen Aggregate
  save(inviteCode: InviteCode, tx?: TransactionContext): Promise<Result<void>>;
  findById(id: InviteCodeId, tx?: TransactionContext): Promise<Result<InviteCode | null>>;
}

// Invariants sind geschützt (z.B. useCount <= maxUses)
// Domain Events werden korrekt extrahiert
```

---

## 7. Testability & Mocking

Repository-Abstraction ermöglicht **einfaches Mocking** für Unit Tests.

### Mock Repository für Unit Tests

```typescript
// packages/backend/src/application/admin/commands/__tests__/create-invite.handler.spec.ts

describe('CreateInviteHandler', () => {
  let handler: CreateInviteHandler;
  let mockInviteCodeRepository: jest.Mocked<IInviteCodeRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;

  beforeEach(() => {
    // ✅ Mock Repository Interface
    mockInviteCodeRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      existsByCode: jest.fn(),
    } as unknown as jest.Mocked<IInviteCodeRepository>;

    // ✅ Mock PrismaService
    mockPrismaService = {
      $transaction: jest.fn((callback) => callback(mockPrismaService as any)),
    } as unknown as jest.Mocked<PrismaService>;

    // ✅ Mock OutboxRepository
    mockOutboxRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<IOutboxRepository>;

    // Create handler with mocks
    handler = new CreateInviteHandler(
      mockPrismaService,
      mockOutboxRepository,
      mockInviteCodeRepository,
    );
  });

  it('should create invite code successfully', async () => {
    // Given
    const command = CreateInviteCommand.create({
      code: InviteCodeValue.fromString('ABC12345').value!,
      expiresAt: new Date('2026-12-31'),
      maxUses: 5,
      label: 'Team Nord',
      createdById: 'admin-123',
    }).value!;

    // Mock: Code doesn't exist yet
    mockInviteCodeRepository.existsByCode.mockResolvedValue(Result.ok(false));

    // Mock: Save succeeds
    mockInviteCodeRepository.save.mockResolvedValue(Result.ok(undefined));

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(mockInviteCodeRepository.existsByCode).toHaveBeenCalled();
    expect(mockInviteCodeRepository.save).toHaveBeenCalled();
    expect(mockOutboxRepository.save).toHaveBeenCalled(); // Events persisted
  });

  it('should fail if code already exists', async () => {
    // Given
    const command = CreateInviteCommand.create({ ... }).value!;

    // Mock: Code already exists
    mockInviteCodeRepository.existsByCode.mockResolvedValue(Result.ok(true));

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isFailure).toBe(true);
    expect(mockInviteCodeRepository.save).not.toHaveBeenCalled();
  });
});
```

### Integration Tests mit Real Repository

```typescript
// packages/backend/src/application/admin/commands/__tests__/create-invite.handler.integration.spec.ts

describe('CreateInviteHandler (Integration)', () => {
  let handler: CreateInviteHandler;
  let repository: IInviteCodeRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Nutze echte Repositories (Integration Test)
    const module = await Test.createTestingModule({
      providers: [
        CreateInviteHandler,
        {
          provide: INVITE_CODE_REPOSITORY,
          useClass: PrismaInviteCodeRepository,
        },
        PrismaService, // Real Database
        OutboxRepository,
      ],
    }).compile();

    handler = module.get(CreateInviteHandler);
    repository = module.get(INVITE_CODE_REPOSITORY);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    // Cleanup: Lösche Test-Daten
    await prisma.inviteCode.deleteMany({});
  });

  it('should persist invite code to database', async () => {
    // Given
    const command = CreateInviteCommand.create({ ... }).value!;

    // When
    const result = await handler.execute(command);

    // Then: Prüfe dass Code in DB gespeichert wurde
    expect(result.isSuccess).toBe(true);

    // Lade Code aus DB
    const savedCode = await repository.findByCode(command.code);
    expect(savedCode.value).toBeDefined();
    expect(savedCode.value?.code).toBe(command.code);
  });
});
```

---

## 8. Praktisches Code-Review Checklist

Bei Code Review eines neuen Repositories sollten diese Punkte geprüft werden:

### ✅ Repository Interface (Domain Layer)

- [ ] Interface im Domain Layer (`src/domain/repositories/`)
- [ ] `import type` für alle Imports (nur Typen, keine Implementierungen)
- [ ] `Result<T>` Pattern für Rückgabewerte (NICHT Exceptions)
- [ ] `TransactionContext` statt Prisma-Types
- [ ] JSDoc Dokumentation mit "warum" nicht "was"
- [ ] Barrel Export in `index.ts`

```typescript
// Checklist-Template:
export interface IXyzRepository {
  /**
   * Dokumentation mit Warum und Beispiel.
   *
   * @param id - Type-Safe EntityId
   * @param tx - Optional Transaction Context
   * @returns Result<Xyz | null>
   */
  findById(id: XyzId, tx?: TransactionContext): Promise<Result<Xyz | null>>;

  /**
   * Persistiert Aggregate.
   *
   * Domain Events werden vom Handler im Outbox persistiert.
   * Repository darf clearDomainEvents() NICHT aufrufen!
   */
  save(xyz: Xyz, tx?: TransactionContext): Promise<Result<void>>;
}
```

### ✅ Repository Implementation (Infrastructure Layer)

- [ ] Implementation im Infrastructure Layer (`src/infrastructure/repositories/`)
- [ ] `@Injectable()` Decorator
- [ ] `implements IXyzRepository`
- [ ] `PrismaService` Dependency Injection
- [ ] TransactionContext casting (`(tx as PrismaClient | undefined) ?? this.prisma`)
- [ ] Mapper für Domain ↔ Persistence Konvertierung
- [ ] Try-Catch mit Result.fail() Error Handling
- [ ] JSDoc Dokumentation (Upsert Strategy, N+1 Prevention, etc.)

```typescript
// Checklist-Template:
@Injectable()
export class PrismaXyzRepository implements IXyzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(aggregate: Xyz, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;
      const data = PrismaXyzMapper.toPersistence(aggregate);

      await client.xyz.upsert({
        where: { id: aggregate.id.value },
        create: data,
        update: data,
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail<void>(
        error instanceof Error ? error.message : 'Save failed'
      );
    }
  }
}
```

### ✅ DI Registration (Module)

- [ ] DI Token in `di-tokens.ts` erstellen oder verwenden
- [ ] Module registriert Implementation mit Token
- [ ] `provide: REPOSITORY_TOKEN, useClass: PrismaRepository`

```typescript
// Checklist-Template:
@Module({
  providers: [
    {
      provide: XYZ_REPOSITORY,
      useClass: PrismaXyzRepository,
    },
  ],
})
export class XyzModule {}
```

### ✅ Handler Verwendung

- [ ] `@Inject(REPOSITORY_TOKEN)` in Constructor
- [ ] `import` (NICHT `import type`) für DI Tokens
- [ ] TransactionalCommandHandler extends (wenn State Changes)
- [ ] Repository.save(aggregate, tx) nutzt tx Parameter
- [ ] Events werden mit `aggregate.getDomainEvents()` extrahiert

```typescript
// Checklist-Template:
@Injectable()
export class CreateXyzHandler extends TransactionalCommandHandler<
  CreateXyzCommand,
  XyzDto
> {
  constructor(
    prisma: PrismaService,
    outboxRepository: IOutboxRepository,
    @Inject(XYZ_REPOSITORY)
    private readonly xyzRepository: IXyzRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateXyzCommand,
    tx: TransactionContext,
  ): Promise<{ result: XyzDto; events: DomainEvent[] }> {
    const aggregate = Xyz.create({ ... });
    await this.xyzRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    return { result: XyzDto.fromAggregate(aggregate), events };
  }
}
```

---

## Zusammenfassung

Das Repository-Abstraction Pattern ist ein **kritisches** Architectural Pattern für saubere, testbare und wartbare Backends:

| Aspekt | Nutzen |
|--------|--------|
| **Domain Isolation** | Domain Layer bleibt framework-agnostisch |
| **Testability** | Mock Repositories für Unit Tests ohne DB |
| **Austauschbarkeit** | Framework-Wechsel betrifft nur Infrastructure |
| **Transaction Management** | Atomare Multi-Aggregate Operations |
| **CQRS + Events** | Korrekte Event Persistierung im Outbox |
| **Clean Architecture** | Abhängigkeiten fließen nach innen |

**Wichtige Takeaways:**

1. ✅ Repository Interfaces im Domain Layer (abstraction)
2. ✅ Repository Implementations im Infrastructure Layer (concrete)
3. ✅ `Result<T>` Pattern statt Exceptions für erwartete Fehler
4. ✅ `TransactionContext` für framework-agnostische Transactions
5. ✅ DI Tokens (Symbol) statt String-basierte Injection
6. ✅ TransactionalCommandHandler für atomare Aggregate+Event Persistierung
7. ✅ Aggregates sind Persistierungs-Boundary, nicht einzelne Entities

---

## Weitere Ressourcen

- **CLAUDE.md Code Review Checklist (AC1-AC7):** Dependency Injection, DI Tokens, Framework-Agnostizität, Result Pattern, Outbox Integration, Testing Pattern, API Decorators
- **TransactionalCommandHandler:** `/packages/backend/src/application/common/handlers/transactional-command.handler.ts`
- **DI Tokens:** `/packages/backend/src/infrastructure/di-tokens.ts`
- **Example Repository:** `/packages/backend/src/infrastructure/repositories/prisma-lagekarte.repository.ts`
- **Example Repository Interface:** `/packages/backend/src/domain/repositories/i-invite-code.repository.ts`
- **Example Handler:** `/packages/backend/src/application/admin/commands/create-invite.handler.ts`
