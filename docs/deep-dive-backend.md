# Backend - Deep Dive Dokumentation

**Generiert:** 2026-01-04
**Scope:** `packages/backend/src/`
**Dateien analysiert:** ~810 TypeScript-Dateien
**Lines of Code:** ~187.000 LOC
**Workflow Mode:** Exhaustive Deep-Dive

---

## Inhaltsverzeichnis

1. [Architektur-Überblick](#architektur-überblick)
2. [Domain Layer](#domain-layer)
3. [Application Layer](#application-layer)
4. [Infrastructure Layer](#infrastructure-layer)
5. [Modules Layer (REST API)](#modules-layer-rest-api)
6. [Dependency Graph](#dependency-graph)
7. [Data Flow](#data-flow)
8. [Testing-Strategie](#testing-strategie)
9. [Contributor Checklist](#contributor-checklist)

---

## Architektur-Überblick

Das Backend implementiert eine **Hexagonale Architektur** (Ports & Adapters) mit **CQRS** (Command Query Responsibility Segregation) und **Domain-Driven Design** (DDD).

### Layer-Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│                     MODULES LAYER (REST API)                    │
│  Controllers, Guards, Decorators, Pipes                        │
│  ~102 Dateien, ~17.300 LOC                                     │
├─────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER (CQRS)                     │
│  Commands, Queries, Handlers, Event Handlers, DTOs             │
│  ~524 Dateien, Framework-agnostisch                            │
├─────────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                          │
│  Prisma Repositories, Event Bus, Outbox, Adapters              │
│  ~169 Dateien, ~16.800 LOC                                     │
├─────────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER (DDD)                         │
│  Aggregates, Entities, Value Objects, Events, Ports            │
│  ~216 Dateien, Framework-agnostisch                            │
└─────────────────────────────────────────────────────────────────┘
```

### Technologie-Stack

| Komponente | Technologie | Version |
|------------|-------------|---------|
| Framework | NestJS | 11.0.11 |
| Sprache | TypeScript | 5.8.3 |
| ORM | Prisma | 6.8.2 |
| Datenbank | PostgreSQL | 17 |
| Auth | JWT (passport-jwt) | - |
| API Docs | @nestjs/swagger | 11.1.4 |
| Testing | Jest | 30.0.0-beta.3 |
| Linting | Biome | 1.9.4 |

---

## Domain Layer

**Pfad:** `src/domain/`
**Dateien:** 216 (157 Produktion, 59 Tests)
**Verantwortung:** Business Rules, Framework-agnostisch

### Basis-Klassen (Common)

| Klasse | Datei | Zweck |
|--------|-------|-------|
| `AggregateRoot<TId>` | `common/aggregate-root.ts` | Basis für alle Aggregates mit Event-Akkumulation |
| `DomainEvent` | `common/domain-event.ts` | Immutable Base für Domain Events |
| `EntityId<T>` | `common/entity-id.ts` | Type-safe ID mit CUID2-Validierung |
| `ValueObject<TProps>` | `common/value-object.ts` | Basis für immutable Value Objects |
| `Result<T>` | `common/result.ts` | Explizite Fehlerbehandlung ohne Exceptions |
| `DomainException` | `common/exceptions/` | Basis für Domain-Fehler |

### Aggregates (Business Roots)

#### Haupt-Aggregates

| Aggregate | Status-Lifecycle | Key Invariants | Events |
|-----------|-----------------|----------------|--------|
| **Einsatz** | ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT | NO-DELETE, 10-Jahre Retention, ARCHIVIERT = immutable | EinsatzCreatedEvent, EinsatzUpdatedEvent, EinsatzCompletedEvent, EinsatzArchivedEvent |
| **EinsatztagebuchAggregate (ETB)** | DRAFT → ACTIVE → LOCKED | Soft-delete Entries, Versionierung, LOCKED = immutable | EtbCreatedEvent, EtbLockedEvent, EintragAddedEvent, EintragUpdatedEvent |
| **LagekarteAggregate** | Active (kein Lifecycle) | Unique POI-Namen pro Lagekarte, MGRS primary | LagekarteCreatedEvent, PoiAddedEvent, PoiRemovedEvent |
| **UserAggregate** | Active/Locked/Deleted | Min-1-SUPER_ADMIN, RBAC, Soft-delete | UserCreatedEvent, UserDeletedEvent, UserRoleChangedEvent |

#### Kräfte-Subdomain Aggregates

| Aggregate | Zweck |
|-----------|-------|
| `StammFahrzeug` | Fahrzeug-Stammdaten (Master) |
| `StammPerson` | Personal-Stammdaten (Master) |
| `EinsatzFahrzeug` | Fahrzeug im Einsatz (FMS Status) |
| `EinsatzPerson` | Personal im Einsatz (Position) |
| `RollenBesetzung` | Rollen-Zuweisung |
| `Qualifikation` | Qualifikations-Definitionen |
| `Fahrzeugtyp` | Fahrzeugtyp-Klassifikation |
| `RollenDefinition` | Rollen-Definitionen |
| `FunkStatusConfig` | FMS Status-Konfiguration |

### Value Objects (28+)

#### Identity Value Objects

| Value Object | Format | Verwendung |
|--------------|--------|------------|
| `EinsatzId` | CUID2 | Einsatz-Identität |
| `UserId` | CUID2 | User-Identität |
| `EtbId` | CUID2 | ETB-Identität |
| `LagekarteId` | CUID2 | Lagekarte-Identität |
| `PoiId` | CUID2 | POI-Identität |
| `EintragId` | CUID2 | ETB-Eintrag-Identität |

#### Status/Type Value Objects

| Value Object | Erlaubte Werte | Pattern |
|--------------|----------------|---------|
| `EinsatzStatus` | ANGELEGT, IN_BEARBEITUNG, ABGESCHLOSSEN, ARCHIVIERT | State Machine (forward-only) |
| `EtbStatus` | DRAFT, ACTIVE, LOCKED | State Machine |
| `UserRole` | SUPER_ADMIN, ADMIN, USER | RBAC mit Wildcard-Matching |
| `PoiCategory` | EINSATZSTELLE, BEREITSTELLUNGSRAUM, GEFAHRENSTELLE, etc. | Fixed Enum |

#### Strukturelle Value Objects

| Value Object | Properties | Domain-Bedeutung |
|--------------|------------|------------------|
| `Address` | strasse, hausnummer, plz, ort | Einsatzort |
| `GeoCoordinate` | lat, lng | WGS84 Koordinaten |
| `MgrsCoordinate` | mgrs string, precision | Militär-Gitter (MGRS) |
| `Permission` | value (scope:action) | RBAC Permission |

### Domain Events (42 Event-Klassen)

Events werden nach dem **Past Tense** Pattern benannt und enthalten:
- `eventId` (CUID2, auto-generiert)
- `occurredAt` (Timestamp)
- `eventVersion` (für Schema-Evolution)

Kategorien:
- **Einsatz Events** (5): Created, Updated, Completed, Archived, StatusChanged
- **ETB Events** (5): Created, Locked, EintragAdded, EintragUpdated, EintragDeleted
- **Lagekarte Events** (4): Created, PoiAdded, PoiRemoved, PoiPositionUpdated
- **User Events** (5): Created, Deleted, RoleChanged, PermissionGranted, PermissionRevoked
- **Kräfte Events** (23): Fahrzeug-, Person-, Rollen-Events

### Repository Interfaces (Ports)

| Repository | Aggregate | Besonderheiten |
|------------|-----------|----------------|
| `IEinsatzRepository` | Einsatz | Pagination, NO delete(), findEligibleForArchival() |
| `IUserRepository` | User | countSuperAdmins(), getPasswordHash() separiert |
| `IEtbRepository` | ETB | Snapshot-Management, getHistory() |
| `ILagekarteRepository` | Lagekarte | Lazy Creation Support |
| + 10 Kräfte Repositories | Kräfte-Domain | TransactionContext Support |

### Port Interfaces (8)

| Port | Zweck |
|------|-------|
| `ILogger` | Framework-agnostisches Logging |
| `IJwtAuthServicePort` | JWT Token Lifecycle |
| `ITokenServicePort` | Magic Link + Password Reset |
| `IEncryptionPort` | AES-256-GCM Verschlüsselung |
| `IEventHandlerPort` | Domain Event Handler Interface |
| `IHiOrgServerPort` | HiOrg-Z API Integration |
| `IOAuth2Port` | Generic OAuth2 Flow |

### Domain Services (3)

| Service | Verantwortung |
|---------|---------------|
| `EinsatzNamingService` | Generiert Einsatznummern (E{year}-{sequence}) |
| `EinsatzCompletenessService` | Validiert Einsatz-Vollständigkeit |
| `EinsatzArchivalPolicy` | Bestimmt Archivierungs-Eligibilität |

---

## Application Layer

**Pfad:** `src/application/`
**Dateien:** 524
**Verantwortung:** Use Cases, CQRS, Event Handlers

### Module-Übersicht

| Modul | Dateien | Zweck |
|-------|---------|-------|
| **einsatz** | 84 | Core Einsatz-Management |
| **kraefte** | 216 | Ressourcen (12 Submodule) |
| **etb** | 75 | Einsatztagebuch |
| **lagekarte** | 51 | Taktische Karte |
| **integrations** | 44 | HiOrg-Server OAuth2 |
| **user-management** | 37 | User CRUD |
| **auth** | 9 | Login/Logout |
| **common** | 8 | Shared Handlers |

### Common Module (Base Classes)

#### TransactionalCommandHandler<TCommand, TResult>

**Zweck:** Basis-Klasse für atomare Aggregate + Event Persistenz

```typescript
abstract class TransactionalCommandHandler<TCommand, TResult> {
  protected abstract executeInTransaction(
    command: TCommand,
    tx: TransactionContext
  ): Promise<{ result: TResult; events: DomainEvent[] }>;

  async execute(command: TCommand): Promise<Result<TResult>> {
    // 1. Transaction starten
    // 2. executeInTransaction() aufrufen
    // 3. Events in Outbox speichern (atomar)
    // 4. Transaction commit
    // 5. Result<T> zurückgeben
  }
}
```

**Wichtig für Contributors:**
- ALLE Write-Operations MÜSSEN diese Base-Klasse erweitern
- Events werden automatisch in Outbox gespeichert
- Transaction-Timeout: 10 Sekunden
- Bei Fehler: Automatischer Rollback

### CQRS Pattern

#### Commands

```
commands/
├── create-einsatz/
│   ├── create-einsatz.command.ts      # DTO mit Factory-Methode
│   ├── create-einsatz.handler.ts      # Extends TransactionalCommandHandler
│   └── __tests__/
│       └── create-einsatz.handler.spec.ts
```

**Command-Struktur:**
```typescript
export class CreateEinsatzCommand {
  private constructor(readonly alarmstichwort: string, ...) {}

  public static create(...): Result<CreateEinsatzCommand> {
    // Validation
    return Result.ok(new CreateEinsatzCommand(...));
  }
}
```

#### Queries

```typescript
export class GetEinsatzByIdQuery {
  constructor(readonly id: string) {}
}

// Handler implementiert IQueryHandler
export class GetEinsatzByIdHandler implements IQueryHandler<GetEinsatzByIdQuery, Result<EinsatzDto | null>> {
  async execute(query: GetEinsatzByIdQuery): Promise<Result<EinsatzDto | null>> {
    // Return Result.ok(null) for "not found" (not error!)
  }
}
```

### Event Handlers (ETB Modul)

Das ETB-Modul reagiert auf Events aus anderen Bounded Contexts:

| Event Handler | Trigger Event | Aktion |
|---------------|---------------|--------|
| `EtbAutoCreationHandler` | EinsatzCreatedEvent | Erstellt ETB für Einsatz |
| `FahrzeugErfasstEventHandler` | FahrzeugErfasstEvent | Erstellt ETB-Eintrag |
| `FmsStatusGeaendertEventHandler` | FmsStatusGeaendertEvent | Erstellt ETB-Eintrag |
| `EinsatzPersonHinzugefuegtEventHandler` | EinsatzPersonHinzugefuegtEvent | Erstellt ETB-Eintrag |
| `PersonFahrzeugZuweisungHandler` | PersonZuFahrzeugZugewiesenEvent | Erstellt ETB-Eintrag |
| `RolleBesetztEventHandler` | RolleBesetztEvent | Erstellt ETB-Eintrag |
| `RolleFreigegebenEventHandler` | RolleFreigegebenEvent | Erstellt ETB-Eintrag |

### Kräfte Module (Größtes Modul)

**12 Submodule:**

| Submodul | Dateien | Fokus |
|----------|---------|-------|
| einsatz-fahrzeuge | 30 | Fahrzeuge im Einsatz |
| einsatz-personen | 20+ | Personal im Einsatz |
| stamm-fahrzeuge | 15 | Fahrzeug-Stammdaten |
| stamm-personen | 15+ | Personal-Stammdaten |
| fahrzeugtypen | 12 | Fahrzeugtyp-Verwaltung |
| funkstatus | 8 | FMS Status-Konfiguration |
| rollen | 8 | Rollen-Definitionen |
| rollen-besetzung | 8 | Rollen-Zuweisungen |
| qualifikationen | 8 | Qualifikations-Verwaltung |

---

## Infrastructure Layer

**Pfad:** `src/infrastructure/`
**Dateien:** 169 (118 Produktion)
**LOC:** ~16.800
**Verantwortung:** Technische Implementierung, Adapters

### Transactional Outbox Pattern

#### Komponenten

| Komponente | Datei | Zweck |
|------------|-------|-------|
| `OutboxEventPublisher` | `outbox/outbox-event-publisher.service.ts` | Polling Worker (5s Intervall) |
| `PrismaOutboxRepository` | `outbox/prisma-outbox.repository.ts` | CRUD auf outbox_events Tabelle |
| `EventSerializer` | `outbox/event-serializer.ts` | Domain Event → JSON |
| `EventDeserializer` | `outbox/event-deserializer.ts` | JSON → Domain Event |

#### Outbox Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Command Handler │───▶│ Outbox Table     │───▶│ Event Publisher │
│ (Transaction)   │    │ (PENDING status) │    │ (5s Polling)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                        │
                              │                        ▼
                              │               ┌─────────────────┐
                              │               │ Event Handlers  │
                              │               │ (via EventBus)  │
                              │               └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ PUBLISHED       │    │ ETB Entries,    │
                       │ (Success)       │    │ Notifications   │
                       └─────────────────┘    └─────────────────┘
```

**Wichtig für Contributors:**
- Pessimistic Locking: `FOR UPDATE SKIP LOCKED`
- Max 3 Retries, dann FAILED
- Batch Processing: 100 Events/Poll
- Bei Fehler: AlertService benachrichtigt

### DI Token System

**Datei:** `di-tokens.ts`

```typescript
export const DI_TOKENS = {
  REPOSITORIES: {
    EINSATZ: Symbol('IEinsatzRepository'),
    USER: Symbol('IUserRepository'),
    ETB: Symbol('IEtbRepository'),
    // ...
  },
  SERVICES: {
    JWT_AUTH: Symbol('IJwtAuthServicePort'),
    LOGGER: Symbol('ILogger'),
    // ...
  },
  EVENT_HANDLERS: {
    ETB_AUTO_CREATION: Symbol('EtbAutoCreationHandler'),
    // ...
  }
} as const;
```

**Verwendung:**
```typescript
@Inject(DI_TOKENS.REPOSITORIES.EINSATZ)
private readonly repository: IEinsatzRepository
```

### Repository Implementierungen

Alle Repositories folgen dem Pattern:

```typescript
@Injectable()
export class PrismaEinsatzRepository implements IEinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(einsatz: Einsatz, tx?: TransactionContext): Promise<Result<void>> {
    const client = tx ?? this.prisma;
    // UPSERT Pattern
    await client.einsatz.upsert({
      where: { id: einsatz.id.value },
      create: EinsatzMapper.toPersistence(einsatz),
      update: EinsatzMapper.toPersistence(einsatz),
    });
    return Result.ok(undefined);
  }
}
```

**Pattern-Regeln:**
- Transaction-Support via optionalem `tx` Parameter
- UPSERT statt CREATE/UPDATE
- NO-DELETE Policy: Kein `delete()` Method
- Result<T> für Fehlerbehandlung
- Mapper für Domain ↔ Persistence Konvertierung

### Port Adapter Implementierungen

| Adapter | Port | Implementierung |
|---------|------|-----------------|
| `NestLoggerAdapter` | ILogger | NestJS Logger |
| `JwtTokenServiceAdapter` | IJwtAuthServicePort | @nestjs/jwt (HS256, 24h Expiry) |
| `AesEncryptionAdapter` | IEncryptionPort | AES-256-GCM |
| `HiOrgServerAdapter` | IHiOrgServerPort | REST JSON:API, OAuth2 |

---

## Modules Layer (REST API)

**Pfad:** `src/modules/`
**Dateien:** 102
**LOC:** ~17.300
**Verantwortung:** HTTP Controller, Guards, Decorators

### API Module Übersicht

| Modul | Basis-Pfad | Endpoints | Auth |
|-------|------------|-----------|------|
| auth | `/api/auth` | 11 | Mixed |
| einsatz | `/api/einsatz` | 14 | JwtAuthGuard |
| etb | `/api/etb` | 7 | JwtAuthGuard |
| kraefte | `/api/einsaetze/:id/personen\|fahrzeuge` | 10 | JwtAuthGuard |
| lagekarte | `/api/einsatz/:id/lagekarte` + `/api/lagekarte` | 11 | JwtAuthGuard |
| user-management | `/api/admin/users` | 6 | AdminJwtAuthGuard |
| integrations | `/api/admin/integrations/hiorg` | 9 | AdminJwtAuthGuard |

### Response Wrapper Pattern

Alle Responses werden standardisiert:

```typescript
{
  "data": { /* Inhalt */ },
  "meta": {
    "timestamp": "2026-01-04T12:00:00.000Z",
    "version": "alpha",
    "requestId": "abc123xyz"
  },
  "pagination": {  // nur bei Arrays
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Custom Decorators (AC7)

```typescript
// RICHTIG: Custom Wrapper Decorator
@Get()
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste aller Einsätze' })
async findAll(): Promise<PaginatedData<EinsatzDto>> { ... }

// FALSCH: Standard Swagger Decorators
@ApiOkResponse({ type: EinsatzDto })  // Generiert falsches Schema!
```

### Rate Limiting

| Endpoint-Typ | Limit |
|--------------|-------|
| Standard GET | 30/min |
| Mutations (POST/PUT/DELETE) | 10/min |
| Auth Endpoints | 5/min |
| Auth Check | 120/min |

### Error Handling

| HTTP Code | Bedeutung |
|-----------|-----------|
| 400 | Validation Errors, Business Rule Violations |
| 401 | Missing/Invalid JWT |
| 403 | Insufficient Permissions |
| 404 | Resource Not Found |
| 409 | Duplicates, Constraint Violations |
| 410 | Deprecated Endpoints (NO-DELETE Policy) |
| 429 | Rate Limit Exceeded |

---

## Dependency Graph

### Layer Dependencies

```
Modules Layer
     │
     ▼
Application Layer  ────▶  Domain Layer
     │                         ▲
     ▼                         │
Infrastructure Layer ──────────┘
```

**Regel:** Abhängigkeiten fließen IMMER nach innen (Modules → Application → Domain).

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                         EINSATZ                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ ETB     │◀─│ Events  │──│Lagekarte│──│    Kräfte       │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │
│       ▲                                        │             │
│       │                                        ▼             │
│       └────────────────────────────────────────┘             │
│                   (Event-driven ETB Entries)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  INTEGRATIONS   │
                    │  (HiOrg-Server) │
                    └─────────────────┘
```

### Keine Circular Dependencies

Das Projekt verwendet:
- `pnpm check:arch` für Dependency-Checks
- Symbol-based DI Tokens verhindern zyklische Imports
- Event-driven Communication zwischen Bounded Contexts

---

## Data Flow

### Einsatz Creation Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ POST /einsatz│────▶│CreateEinsatzCmd  │────▶│EinsatzAggregate │
│ (Controller) │     │(Handler + TX)    │     │ .create()       │
└──────────────┘     └──────────────────┘     └─────────────────┘
                              │                        │
                              │                        ▼
                              │               ┌─────────────────┐
                              │               │ EinsatzCreated  │
                              │               │ Event           │
                              │               └─────────────────┘
                              │                        │
                              ▼                        ▼
                     ┌─────────────────┐     ┌─────────────────┐
                     │ Prisma Einsatz  │     │ Outbox Table    │
                     │ (saved)         │     │ (saved atomar)  │
                     └─────────────────┘     └─────────────────┘
                                                      │
                                                      ▼ (5s später)
                                             ┌─────────────────┐
                                             │ Event Publisher │
                                             └─────────────────┘
                                                      │
                              ┌────────────────┬──────┴──────┐
                              ▼                ▼              ▼
                     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
                     │ ETB Auto    │  │ Lagekarte   │  │ Logging     │
                     │ Creation    │  │ Auto Create │  │ Handler     │
                     └─────────────┘  └─────────────┘  └─────────────┘
```

### FMS Status Update Flow

```
PATCH /fahrzeuge/:id/status
        │
        ▼
┌─────────────────────────────────────┐
│ UpdateFmsStatusCommand (Handler)    │
│ - Load EinsatzFahrzeug              │
│ - Update FMS Status                 │
│ - Generate FmsStatusGeaendertEvent  │
│ - Atomar: Save + Outbox             │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ FmsStatusGeaendertEventHandler      │
│ - Load ETB                          │
│ - Add Entry: "Fahrzeug X: Status Y" │
│ - Save ETB                          │
└─────────────────────────────────────┘
```

---

## Testing-Strategie

### Test-Kategorien

| Kategorie | Pfad | Fokus |
|-----------|------|-------|
| Unit Tests | `**/*.spec.ts` | Handler, Services, Value Objects |
| Integration Tests | `src/__tests__/integration/` | Repository + DB |
| E2E Tests | `src/__tests__/e2e/` | API Endpoints |
| Domain Tests | `src/domain/__tests__/` | Aggregates, Events |
| Architecture Tests | `src/__tests__/architecture/` | Dependency Rules |

### AAA Pattern (Given-When-Then)

```typescript
describe('CreateEinsatzHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // WICHTIG: Mock Reset
  });

  it('should create einsatz successfully', async () => {
    // Given (Arrange)
    const command = CreateEinsatzCommand.create(...).value!;
    mockRepository.save.mockResolvedValue(Result.ok(undefined));

    // When (Act)
    const result = await handler.execute(command);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ nummer: 'E-2025-001' }),
      expect.any(Object)
    );
  });
});
```

### Test Commands

```bash
# Alle Tests
pnpm --filter @bluelight-hub/backend test

# Unit Tests
pnpm --filter @bluelight-hub/backend test:unit

# Domain Tests
pnpm --filter @bluelight-hub/backend test:domain

# E2E Tests
pnpm --filter @bluelight-hub/backend test:e2e

# Integration Tests
pnpm --filter @bluelight-hub/backend test:integration
```

---

## Contributor Checklist

### Vor jeder Änderung

- [ ] CLAUDE.md gelesen und verstanden
- [ ] Relevante Domain-Dokumentation gelesen
- [ ] Existierende Patterns in ähnlichen Features analysiert

### Bei neuen Commands/Handlers

- [ ] Command mit Factory-Methode und Result<T> erstellt
- [ ] Handler erweitert `TransactionalCommandHandler`
- [ ] Domain Events werden in Aggregate generiert
- [ ] Events in Outbox gespeichert (automatisch durch Base-Klasse)
- [ ] Unit Tests mit AAA Pattern geschrieben
- [ ] JSDoc mit "warum" (nicht "was") hinzugefügt

### Bei neuen API Endpoints

- [ ] Controller nutzt `@ApiWrappedResponse` (AC7)
- [ ] Korrekte Guards (JwtAuthGuard / AdminJwtAuthGuard)
- [ ] Rate Limiting konfiguriert
- [ ] Error Codes dokumentiert
- [ ] Response DTOs mit @ApiProperty

### Bei Repository-Änderungen

- [ ] NO-DELETE Policy beachtet
- [ ] TransactionContext Support implementiert
- [ ] UPSERT Pattern verwendet
- [ ] Mapper für Domain ↔ Persistence

### Code Review Checklist

1. **AC1:** `import type` NUR für Typen, NICHT für Injectable Classes
2. **AC2:** DI Token Strings als Constants (Symbol-based)
3. **AC3:** Application Layer Framework-agnostisch (nur @Injectable, @Inject)
4. **AC4:** Result<T> statt Exceptions für Business-Fehler
5. **AC5:** Outbox-Events atomar mit Domain-Operationen
6. **AC6:** Unit Tests AAA Pattern mit Given-When-Then
7. **AC7:** `@ApiWrappedResponse` statt Standard Swagger

### Risiken & Gotchas

- **Outbox Delay:** Events werden mit ~5s Verzögerung publiziert
- **Transaction Timeout:** 10 Sekunden Maximum
- **ARCHIVIERT Status:** Ist FINAL und IMMUTABLE
- **Min-1-SUPER_ADMIN:** Letzter SUPER_ADMIN kann nicht gelöscht werden
- **MGRS Koordinaten:** Primäres Format für DRK-Compliance

---

## Appendix

### Wichtige Dateipfade

| Kategorie | Pfad |
|-----------|------|
| DI Tokens | `src/infrastructure/di-tokens.ts` |
| Base Handler | `src/application/common/handlers/transactional-command.handler.ts` |
| Result Pattern | `src/domain/common/result.ts` |
| Outbox Publisher | `src/infrastructure/outbox/outbox-event-publisher.service.ts` |
| API Decorators | `src/modules/common/decorators/api-wrapped-response.decorator.ts` |
| Prisma Schema | `prisma/schema.prisma` |

### Architektur-Patterns

| Pattern | Implementierung |
|---------|-----------------|
| Hexagonal Architecture | Ports in Domain, Adapters in Infrastructure |
| CQRS | CommandBus + QueryBus (NestJS CQRS Module) |
| Event Sourcing | Domain Events + Outbox Pattern |
| Result Pattern | Explizite Fehlerbehandlung |
| Repository Pattern | Interfaces in Domain, Impl in Infrastructure |
| Aggregate Root | Transaktionale Grenzen, Child-Entity Management |
| Value Object | Immutable, Strukturelle Gleichheit |
| Factory Method | Static create() mit Validierung |
| Transactional Outbox | Atomare Event-Persistenz |
| NO-DELETE Policy | Soft-delete via Status (DRK Compliance) |

---

_Generiert durch `document-project` Workflow (Deep-Dive Mode)_
_Scan Datum: 2026-01-04_
_Analyse Modus: Exhaustive_
