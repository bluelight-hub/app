# Backend - Deep Dive Dokumentation

**Generiert:** 2026-02-19
**Scope:** `packages/backend/src/`
**Dateien analysiert:** ~840 TypeScript-Dateien
**Lines of Code:** ~195.000 LOC
**Workflow Mode:** Exhaustive Deep-Dive

---

## Inhaltsverzeichnis

1. [Architektur-Ueberblick](#architektur-ueberblick)
2. [Domain Layer](#domain-layer)
3. [Application Layer](#application-layer)
4. [Infrastructure Layer](#infrastructure-layer)
5. [Modules Layer (REST API)](#modules-layer-rest-api)
6. [Dependency Graph](#dependency-graph)
7. [Data Flow](#data-flow)
8. [Testing-Strategie](#testing-strategie)
9. [Contributor Checklist](#contributor-checklist)

---

## Architektur-Ueberblick

Das Backend implementiert eine **Hexagonale Architektur** (Ports & Adapters) mit **CQRS** (Command Query Responsibility Segregation) und **Domain-Driven Design** (DDD).

### Layer-Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│                     MODULES LAYER (REST API)                    │
│  Controllers, Guards, Decorators, Pipes, Gateways (WS)         │
│  ~110 Dateien, ~18.500 LOC                                     │
├─────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER (CQRS)                     │
│  Commands, Queries, Handlers, Event Handlers, DTOs             │
│  ~545 Dateien, Framework-agnostisch                            │
├─────────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                          │
│  Prisma Repositories, Event Bus, Outbox, Adapters              │
│  ~178 Dateien, ~17.800 LOC                                     │
├─────────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER (DDD)                         │
│  Aggregates, Entities, Value Objects, Events, Ports            │
│  ~230 Dateien, Framework-agnostisch                            │
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
| WebSockets | socket.io (via @nestjs/websockets) | - |

---

## Domain Layer

**Pfad:** `src/domain/`
**Dateien:** 230 (167 Produktion, 63 Tests)
**Verantwortung:** Business Rules, Framework-agnostisch

### Basis-Klassen (Common)

| Klasse | Datei | Zweck |
|--------|-------|-------|
| `AggregateRoot<TId>` | `common/aggregate-root.ts` | Basis fuer alle Aggregates mit Event-Akkumulation |
| `DomainEvent` | `common/domain-event.ts` | Immutable Base fuer Domain Events |
| `EntityId<T>` | `common/entity-id.ts` | Type-safe ID mit CUID2-Validierung |
| `ValueObject<TProps>` | `common/value-object.ts` | Basis fuer immutable Value Objects |
| `Result<T>` | `common/result.ts` | Explizite Fehlerbehandlung ohne Exceptions |
| `DomainException` | `common/exceptions/` | Basis fuer Domain-Fehler |

### Aggregates (Business Roots)

#### Haupt-Aggregates

| Aggregate | Status-Lifecycle | Key Invariants | Events |
|-----------|-----------------|----------------|--------|
| **Einsatz** | ANGELEGT -> IN_BEARBEITUNG -> ABGESCHLOSSEN -> ARCHIVIERT | NO-DELETE, 10-Jahre Retention, ARCHIVIERT = immutable | EinsatzCreatedEvent, EinsatzUpdatedEvent, EinsatzCompletedEvent, EinsatzArchivedEvent |
| **EinsatztagebuchAggregate (ETB)** | DRAFT -> ACTIVE -> LOCKED | Soft-delete Entries, Versionierung, LOCKED = immutable | EtbCreatedEvent, EtbLockedEvent, EintragAddedEvent, EintragUpdatedEvent |
| **LagekarteAggregate** | Active (kein Lifecycle) | Unique POI-Namen pro Lagekarte, MGRS primary | LagekarteCreatedEvent, PoiAddedEvent, PoiRemovedEvent |
| **UserAggregate** | Active/Locked/Deleted | Min-1-SUPER_ADMIN, RBAC, Soft-delete | UserCreatedEvent, UserDeletedEvent, UserRoleChangedEvent |
| **Befehl** | ERTEILT -> ZUGESTELLT -> QUITTIERT / KORRIGIERT | Append-Only (GoBD-Compliance), Alle Empfaenger muessen zustellen/quittieren fuer Status-Transition, QUITTIERT/KORRIGIERT = final | BefehlErstelltEvent, BefehlZugestelltEvent, BefehlStatusGeaendertEvent, BefehlKommentarHinzugefuegtEvent, BefehlQuittiertEvent |
| **FunkkanalAggregate** (Neu, Issue #407) | aktiv <-> inaktiv, aktiv -> archiviert | Genau eine Kraft pro Zuordnung (Check-Constraint), keine doppelte Kraft je Kanal, archiviert = Mutation gesperrt | FunkkanalErstelltEvent, FunkkanalGeaendertEvent, FunkkanalArchiviertEvent, FunkkanalReihenfolgeGeaendertEvent, FunkkanalZuordnungErstelltEvent, FunkkanalZuordnungEntferntEvent |

#### Befehl Aggregate (Neu: Fuehrungsbefehle im Einsatz)

Das **Befehl Aggregate** (`domain/aggregates/befehl.aggregate.ts`) modelliert Fuehrungsbefehle im Einsatzmanagement. Es ist das juengste Aggregate im System und implementiert einen vollstaendigen Befehls-Lifecycle mit State Machine, Child Entities und GoBD-konformer Append-Only Policy.

**State Machine:**

```
ERTEILT ──► ZUGESTELLT ──► QUITTIERT
    │            │
    ▼            ▼
KORRIGIERT ◄─────┘
```

| Status | Bedeutung |
|--------|-----------|
| `ERTEILT` | Initialer Status bei Befehlserstellung |
| `ZUGESTELLT` | Alle Empfaenger haben den Befehl erhalten |
| `QUITTIERT` | Alle Empfaenger haben quittiert (finaler Status) |
| `KORRIGIERT` | Befehl wurde durch Korrekturbefehl ersetzt (finaler Status) |

**Befehlstyp (Computed Getter, nicht persistiert):**

| Typ | Bedingung |
|-----|-----------|
| `KURZBEFEHL` | Nur Auftrag (keine EAMZW-Felder) |
| `EAMZW` | Alle vier optionalen Felder (Ereignis, Mittel, Ziel, Weg) gesetzt — Auftrag ist immer Pflicht. Akronym: Ereignis, Auftrag, Mittel, Ziel, Weg (5 Elemente) |
| `ERWEITERT` | Teilweise EAMZW-Felder gesetzt |

**Child Entities:**

| Entity | Zweck | Persistierung |
|--------|-------|---------------|
| `BefehlEmpfaenger` | Einzelner Empfaenger mit Zustellungs-/Quittierungsstatus | Via Befehl Aggregate (kein eigenes Repository) |
| `BefehlKommentar` | Kommentar/Rueckfrage mit Thread-Support (parentId) | Via Befehl Aggregate (kein eigenes Repository) |

**QuittierungArt (Enum):** `VERSTANDEN`, `RUECKFRAGE`, `NICHT_VERSTANDEN`

**Business Rules:**
- Auftrag ist required, mindestens ein Empfaenger ist required
- Befehlsnummer wird auto-generiert (Format: `B{YEAR}-{CUID-8}`)
- Status-Transitions nur vorwaerts gemaess State Machine
- Alle Empfaenger muessen zugestellt sein bevor ZUGESTELLT-Status erreicht wird
- Alle Empfaenger muessen quittiert haben bevor QUITTIERT-Status erreicht wird
- Korrigierter Befehl kann nicht mehr zugestellt oder quittiert werden
- Befehle koennen NIEMALS geloescht werden (Append-Only, GoBD-Compliance)
- Kommentare unterstuetzen Thread-Antworten via parentId (Parent muss existieren)

#### Funkkanal Aggregate (Neu: Issue #407 Funkverkehr)

Das **Funkkanal Aggregate** (`domain/aggregates/funkkanal/funkkanal.aggregate.ts`) modelliert die Sprechgruppen und Kanäle eines Einsatzes (Kanalplan) und ihre Kraft-Zuordnungen (Fahrzeug, Person, EinsatzEinheit).

**Lifecycle:**

```
aktiv  ◀────▶  inaktiv
  │
  ▼
archiviert  (Mutationen gesperrt; Hard-Delete nur wenn keine
             Funkspruch-ETB-Einträge den Kanal referenzieren)
```

**Child Entities:**

| Entity | Zweck | Persistierung |
|--------|-------|---------------|
| `FunkkanalZuordnung` | Verbindung Kanal ↔ Kraft (Fahrzeug / Person / Einheit) + Rolle + Rufname-Snapshot | Via Aggregat (eigene Tabelle `funkkanal_zuordnung` mit 3 nullable FKs + Check-Constraint) |

**KanalDetails (Discriminated Union VO):** `tmo` (Sprechgruppe + optional GSSI) · `dmo` (DMO-Kanal + optional Repeater) · `analog` (Band 4m/2m + Frequenz + optional Kanalnummer). Serialisierung über `detailsType` (String) + `detailsData` (JSONB).

**FunkkanalZuordnungKraftRef:** Discriminated Union `fahrzeug | person | einheit` — der Mapper schreibt exakt einen der drei FKs, der DB-Check-Constraint `funkkanal_zuordnung_genau_eine_kraft` erzwingt die Exklusivität.

**Business Rules:**

- Kanalname ist erforderlich und pro Einsatz eindeutig (Repository-seitig validiert, siehe Task 11)
- `sortIndex ≥ 0`, Reihenfolge wird pro Einsatz via `FunkkanalReihenfolgeGeaendertEvent` neu gesetzt
- Eine Kraft darf innerhalb eines Kanals nur einmal zugeordnet sein
- Archivierter Kanal lehnt alle mutierenden Methoden mit `Result.fail` ab
- Notfall-Funksprüche (Priorität `notfall`) lösen via `NotfallAlertRequestedEvent` einen WebSocket-Broadcast aus — triggert sich aus `EintragAddedEvent` mit `FunkKontext` (kein eigenes Command)

**Referenzen:**

- [ADR-005: ETB-Kontext Discriminated Union](/Users/rubeen/dev/personal/bluelight-hub/docs/adr/adr-005-etb-eintrag-kontext-discriminated-union.md)
- [ADR-006: WebSocket-Bus einsatz-scoped](/Users/rubeen/dev/personal/bluelight-hub/docs/adr/adr-006-websocket-event-bus-einsatz-scoped.md)
- [ADR-007: Funkkanal als Aggregat](/Users/rubeen/dev/personal/bluelight-hub/docs/adr/adr-007-funkkanal-als-aggregat.md)
- [ADR-008: Polymorphe Zuordnung via nullable FKs](/Users/rubeen/dev/personal/bluelight-hub/docs/adr/adr-008-polymorphe-zuordnung-nullable-fks.md)

#### Kraefte-Subdomain Aggregates

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

### Value Objects (31+)

#### Identity Value Objects

| Value Object | Format | Verwendung |
|--------------|--------|------------|
| `EinsatzId` | CUID2 | Einsatz-Identitaet |
| `UserId` | CUID2 | User-Identitaet |
| `EtbId` | CUID2 | ETB-Identitaet |
| `LagekarteId` | CUID2 | Lagekarte-Identitaet |
| `PoiId` | CUID2 | POI-Identitaet |
| `EintragId` | CUID2 | ETB-Eintrag-Identitaet |
| `BefehlId` | CUID2 | Befehl-Identitaet |

#### Status/Type Value Objects

| Value Object | Erlaubte Werte | Pattern |
|--------------|----------------|---------|
| `EinsatzStatus` | ANGELEGT, IN_BEARBEITUNG, ABGESCHLOSSEN, ARCHIVIERT | State Machine (forward-only) |
| `EtbStatus` | DRAFT, ACTIVE, LOCKED | State Machine |
| `UserRole` | SUPER_ADMIN, ADMIN, USER | RBAC mit Wildcard-Matching |
| `PoiCategory` | EINSATZSTELLE, BEREITSTELLUNGSRAUM, GEFAHRENSTELLE, etc. | Fixed Enum |
| `BefehlStatus` | ERTEILT, ZUGESTELLT, QUITTIERT, KORRIGIERT | State Machine mit `canTransitionTo()` |
| `BefehlNummer` | B{YEAR}-{CUID-8} | Auto-generierte Befehlsnummer |

#### Strukturelle Value Objects

| Value Object | Properties | Domain-Bedeutung |
|--------------|------------|------------------|
| `Address` | strasse, hausnummer, plz, ort | Einsatzort |
| `GeoCoordinate` | lat, lng | WGS84 Koordinaten |
| `MgrsCoordinate` | mgrs string, precision | Militaer-Gitter (MGRS) |
| `Permission` | value (scope:action) | RBAC Permission |

### Domain Events (47 Event-Klassen)

Events werden nach dem **Past Tense** Pattern benannt und enthalten:
- `eventId` (CUID2, auto-generiert)
- `occurredAt` (Timestamp)
- `eventVersion` (fuer Schema-Evolution)

Kategorien:
- **Einsatz Events** (5): Created, Updated, Completed, Archived, StatusChanged
- **ETB Events** (5): Created, Locked, EintragAdded, EintragUpdated, EintragDeleted
- **Lagekarte Events** (4): Created, PoiAdded, PoiRemoved, PoiPositionUpdated
- **User Events** (7): Created, Deleted, RoleChanged, PermissionGranted, PermissionRevoked, Locked, Unlocked
- **Kraefte Events** (23): Fahrzeug-, Person-, Rollen-Events
- **Befehl Events** (5): Erstellt, Zugestellt, StatusGeaendert, KommentarHinzugefuegt, Quittiert

#### Befehl Domain Events (Neu)

| Event | Event Name | Trigger | Payload |
|-------|------------|---------|---------|
| `BefehlErstelltEvent` | `befehl.erstellt` | `Befehl.create()` Factory | befehlId, einsatzId, auftrag, nummer, empfaengerIds |
| `BefehlZugestelltEvent` | `befehl.zugestellt` | `Befehl.markAlsZugestellt()` | befehlId, empfaengerId, zugestelltAm |
| `BefehlStatusGeaendertEvent` | `befehl.status_geaendert` | Automatisch bei Status-Transitions | befehlId, oldStatus, newStatus |
| `BefehlKommentarHinzugefuegtEvent` | `befehl.kommentar_hinzugefuegt` | `Befehl.addKommentar()` | befehlId, kommentarId, authorId, text, isRueckfrage, parentId |
| `BefehlQuittiertEvent` | `befehl.quittiert` | `Befehl.quittieren()` | befehlId, einsatzId, empfaengerId, quittierungArt, nummer, quittiertAm |

**Event-Carried State Transfer:** `BefehlQuittiertEvent` und `BefehlErstelltEvent` enthalten Rich Data, damit WebSocket-Handler keine zusaetzlichen DB-Queries benoetigen.

### Repository Interfaces (Ports)

| Repository | Aggregate | Besonderheiten |
|------------|-----------|----------------|
| `IEinsatzRepository` | Einsatz | Pagination, NO delete(), findEligibleForArchival() |
| `IUserRepository` | User | countSuperAdmins(), getPasswordHash() separiert |
| `IEtbRepository` | ETB | Snapshot-Management, getHistory() |
| `ILagekarteRepository` | Lagekarte | Lazy Creation Support |
| `IBefehlRepository` | Befehl | findByEinsatzId(), findByEmpfaengerId(), findWithOpenRueckfragen(), NO delete() |
| + 10 Kraefte Repositories | Kraefte-Domain | TransactionContext Support |

#### IBefehlRepository (Neu)

```typescript
export interface IBefehlRepository {
  save(befehl: Befehl, tx?: TransactionContext): Promise<Result<void>>;
  findById(id: BefehlId, tx?: TransactionContext): Promise<Result<Befehl | null>>;
  findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<Befehl[]>>;
  findByEmpfaengerId(einsatzId: EinsatzId, empfaengerId: string, tx?: TransactionContext): Promise<Result<Befehl[]>>;
  findWithOpenRueckfragen(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<Befehl[]>>;
  // KEINE delete() Method! (Append-Only Policy, GoBD-Compliance)
}
```

**Besonderheiten:**
- `findByEmpfaengerId`: Filtert Befehle nach einem bestimmten Empfaenger (Prisma `some`-Filter)
- `findWithOpenRueckfragen`: Findet Befehle mit offenen Rueckfragen (isRueckfrage=true UND keine Kind-Kommentare)
- Sortierung immer nach `erteiltAm DESC` (neueste zuerst)

### Port Interfaces (8)

| Port | Zweck |
|------|-------|
| `ILogger` | Framework-agnostisches Logging |
| `IJwtAuthServicePort` | JWT Token Lifecycle |
| `ITokenServicePort` | Magic Link + Password Reset |
| `IEncryptionPort` | AES-256-GCM Verschluesselung |
| `IEventHandlerPort` | Domain Event Handler Interface |
| `IHiOrgServerPort` | HiOrg-Z API Integration |
| `IOAuth2Port` | Generic OAuth2 Flow |

### Domain Services (3)

| Service | Verantwortung |
|---------|---------------|
| `EinsatzNamingService` | Generiert Einsatznummern (E{year}-{sequence}) |
| `EinsatzCompletenessService` | Validiert Einsatz-Vollstaendigkeit |
| `EinsatzArchivalPolicy` | Bestimmt Archivierungs-Eligibilitaet |

---

## Application Layer

**Pfad:** `src/application/`
**Dateien:** 545
**Verantwortung:** Use Cases, CQRS, Event Handlers

### Module-Uebersicht

| Modul | Dateien | Zweck |
|-------|---------|-------|
| **einsatz** | 84 | Core Einsatz-Management |
| **kraefte** | 216 | Ressourcen (12 Submodule) |
| **etb** | 75 | Einsatztagebuch |
| **lagekarte** | 51 | Taktische Karte |
| **integrations** | 44 | HiOrg-Server OAuth2 |
| **user-management** | 37 | User CRUD |
| **befehl** | 17 | Fuehrungsbefehle (Neu) |
| **auth** | 9 | Login/Logout |
| **common** | 8 | Shared Handlers |

### Common Module (Base Classes)

#### TransactionalCommandHandler<TCommand, TResult>

**Zweck:** Basis-Klasse fuer atomare Aggregate + Event Persistenz

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
    // 5. Result<T> zurueckgeben
  }
}
```

**Wichtig fuer Contributors:**
- ALLE Write-Operations MUESSEN diese Base-Klasse erweitern
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

### Befehl Application Module (Neu)

**Pfad:** `src/application/befehl/`
**Dateien:** 17 (Produktion + Tests)

#### Modul-Struktur

```
application/befehl/
├── befehl-application.module.ts           # NestJS Module (DI Setup)
├── commands/
│   ├── create-befehl/
│   │   ├── create-befehl.command.ts       # Command DTO
│   │   ├── create-befehl.handler.ts       # TransactionalCommandHandler
│   │   └── __tests__/
│   ├── quittieren-befehl/
│   │   ├── quittieren-befehl.command.ts   # Command DTO
│   │   ├── quittieren-befehl.handler.ts   # TransactionalCommandHandler
│   │   └── __tests__/
│   └── add-befehl-kommentar/
│       ├── add-befehl-kommentar.command.ts # Command DTO
│       ├── add-befehl-kommentar.handler.ts # TransactionalCommandHandler
│       └── __tests__/
├── dto/
│   ├── befehl.dto.ts                      # Response DTO mit @ApiProperty
│   ├── befehl-empfaenger.dto.ts           # Nested Response DTO
│   ├── befehl-kommentar.dto.ts            # Nested Response DTO
│   ├── create-befehl.dto.ts               # Input DTO mit Validation
│   ├── quittieren-befehl.dto.ts           # Input DTO mit Validation
│   └── add-befehl-kommentar.dto.ts        # Input DTO mit Validation
└── errors/
    └── befehl-error.codes.ts              # Zentralisierte Error Codes
```

#### Command Handlers

| Handler | Command | Zweck | Events |
|---------|---------|-------|--------|
| `CreateBefehlHandler` | `CreateBefehlCommand` | Erstellt neuen Befehl mit Empfaengern | BefehlErstelltEvent |
| `QuittierenBefehlHandler` | `QuittierenBefehlCommand` | Empfaenger quittiert einen Befehl | BefehlQuittiertEvent, ggf. BefehlStatusGeaendertEvent |
| `AddBefehlKommentarHandler` | `AddBefehlKommentarCommand` | Fuegt Kommentar/Rueckfrage hinzu | BefehlKommentarHinzugefuegtEvent |

Alle drei Handler erweitern `TransactionalCommandHandler` fuer atomare Persistierung mit Outbox Pattern.

**Typischer Handler Flow (am Beispiel QuittierenBefehlHandler):**

```
1. Validate BefehlId, EmpfaengerId (Value Object Validation)
2. Load Befehl Aggregate aus Repository (via Transaction)
3. Domain Logic: befehl.quittieren(empfaengerId, quittierungArt)
4. Save Aggregate in Transaction (via Repository)
5. Extract Domain Events fuer Outbox
6. Base Handler speichert Events in Outbox (atomar in gleicher TX)
```

#### BefehlApplicationModule (DI Setup)

```typescript
@Module({
  imports: [PrismaModule, OutboxModule],
  providers: [
    { provide: LOGGER, useFactory: () => new NestLoggerAdapter('Befehl') },
    { provide: BEFEHL_REPOSITORY, useClass: PrismaBefehlRepository },
    AddBefehlKommentarHandler,
    CreateBefehlHandler,
    QuittierenBefehlHandler,
  ],
  exports: [
    AddBefehlKommentarHandler,
    CreateBefehlHandler,
    QuittierenBefehlHandler,
    BEFEHL_REPOSITORY,
  ],
})
export class BefehlApplicationModule {}
```

### Event Handlers (ETB Modul)

Das ETB-Modul reagiert auf Events aus anderen Bounded Contexts:

| Event Handler | Trigger Event | Aktion |
|---------------|---------------|--------|
| `EtbAutoCreationHandler` | EinsatzCreatedEvent | Erstellt ETB fuer Einsatz |
| `FahrzeugErfasstEventHandler` | FahrzeugErfasstEvent | Erstellt ETB-Eintrag |
| `FmsStatusGeaendertEventHandler` | FmsStatusGeaendertEvent | Erstellt ETB-Eintrag |
| `EinsatzPersonHinzugefuegtEventHandler` | EinsatzPersonHinzugefuegtEvent | Erstellt ETB-Eintrag |
| `PersonFahrzeugZuweisungHandler` | PersonZuFahrzeugZugewiesenEvent | Erstellt ETB-Eintrag |
| `RolleBesetztEventHandler` | RolleBesetztEvent | Erstellt ETB-Eintrag |
| `RolleFreigegebenEventHandler` | RolleFreigegebenEvent | Erstellt ETB-Eintrag |

### Kraefte Module (Groesstes Modul)

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
**Dateien:** 178 (125 Produktion)
**LOC:** ~17.800
**Verantwortung:** Technische Implementierung, Adapters

### Transactional Outbox Pattern

#### Komponenten

| Komponente | Datei | Zweck |
|------------|-------|-------|
| `OutboxEventPublisher` | `outbox/outbox-event-publisher.service.ts` | Polling Worker (5s Intervall) |
| `PrismaOutboxRepository` | `outbox/prisma-outbox.repository.ts` | CRUD auf outbox_events Tabelle |
| `EventSerializer` | `outbox/event-serializer.ts` | Domain Event -> JSON (inkl. 5 Befehl-Events) |
| `EventDeserializer` | `outbox/event-deserializer.ts` | JSON -> Domain Event (inkl. 5 Befehl-Events) |

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
                       │ (Success)       │    │ Notifications,  │
                       └─────────────────┘    │ WebSocket Events│
                                              └─────────────────┘
```

**Wichtig fuer Contributors:**
- Pessimistic Locking: `FOR UPDATE SKIP LOCKED`
- Max 3 Retries, dann FAILED
- Batch Processing: 100 Events/Poll
- Bei Fehler: AlertService benachrichtigt

#### Befehl-Event Registrierung im Outbox System

Alle 5 Befehl-Events sind in Serializer und Deserializer registriert:

| Event Name | Serializer | Deserializer |
|------------|------------|--------------|
| `befehl.erstellt` | `serializeBefehlErstellt()` | `deserializeBefehlErstellt()` |
| `befehl.zugestellt` | `serializeBefehlZugestellt()` | `deserializeBefehlZugestellt()` |
| `befehl.status_geaendert` | `serializeBefehlStatusGeaendert()` | `deserializeBefehlStatusGeaendert()` |
| `befehl.kommentar_hinzugefuegt` | `serializeBefehlKommentarHinzugefuegt()` | `deserializeBefehlKommentarHinzugefuegt()` |
| `befehl.quittiert` | `serializeBefehlQuittiert()` | `deserializeBefehlQuittiert()` |

### DI Token System

**Datei:** `di-tokens.ts`

```typescript
export const DI_TOKENS = {
  REPOSITORIES: {
    EINSATZ: Symbol('IEinsatzRepository'),
    USER: Symbol('IUserRepository'),
    ETB: Symbol('IEtbRepository'),
    BEFEHL: Symbol('IBefehlRepository'),  // NEU
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

**Neuer Token:** `BEFEHL_REPOSITORY` (`Symbol('IBefehlRepository')`) fuer Befehl Repository DI.

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
- Result<T> fuer Fehlerbehandlung
- Mapper fuer Domain <-> Persistence Konvertierung

#### PrismaBefehlRepository (Neu)

**Pfad:** `infrastructure/repositories/prisma-befehl.repository.ts`

```typescript
@Injectable()
export class PrismaBefehlRepository implements IBefehlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(befehl: Befehl, tx?: TransactionContext): Promise<Result<void>> {
    const client = (tx as PrismaClient | undefined) ?? this.prisma;
    const data = PrismaBefehlMapper.toPersistence(befehl);
    const { empfaenger, kommentare, ...befehlData } = data;

    await client.befehl.upsert({
      where: { id: data.id },
      create: { ...befehlData, empfaenger: { create: empfaenger }, kommentare: { create: kommentare } },
      update: { ...befehlData, empfaenger: { deleteMany: {}, create: empfaenger }, kommentare: { deleteMany: {}, create: kommentare } },
    });
    return Result.ok<void>(undefined);
  }
}
```

**Besonderheiten gegenueber anderen Repositories:**
- **Nested Child Entity Writes:** Empfaenger und Kommentare werden als nested creates/updates gespeichert
- **DeleteMany + Create Pattern:** Bei Updates werden bestehende Child Entities geloescht und neu erstellt (Replace-Strategie)
- **Eager Loading:** `findById()`, `findByEinsatzId()` und `findByEmpfaengerId()` laden immer Empfaenger und Kommentare mit (`include: { empfaenger: true, kommentare: true }`)
- **Spezialisierte Queries:** `findWithOpenRueckfragen()` nutzt Prisma `some` + `none` Filter fuer offene Rueckfragen

### Event Adapter: BefehlEventAdapter (Neu)

**Pfad:** `infrastructure/events/adapters/befehl-event.adapter.ts`

Der `BefehlEventAdapter` bildet die Bruecke zwischen Domain Events und WebSocket-Delivery:

```
Domain Event (via EventEmitter @OnEvent)
        │
        ▼
BefehlEventAdapter
  - 50ms Delay (Race Condition Prevention)
  - Optional: DB-Lookup fuer einsatzId
  - Fire-and-Forget Pattern
        │
        ▼
BefehlGateway.emit*()
  - WebSocket Room-based Broadcast
  - Room: einsatz:{einsatzId}:befehle
```

| Event Handler | Domain Event | DB-Lookup | WebSocket Event |
|---------------|-------------|-----------|-----------------|
| `onBefehlErstellt()` | BefehlErstelltEvent | Ja (befehlsgeber, status) | `befehl.erstellt` |
| `onBefehlZugestellt()` | BefehlZugestelltEvent | Ja (einsatzId) | `befehl.zugestellt` |
| `onBefehlStatusGeaendert()` | BefehlStatusGeaendertEvent | Ja (einsatzId) | `befehl.statusGeaendert` |
| `onBefehlKommentarHinzugefuegt()` | BefehlKommentarHinzugefuegtEvent | Ja (einsatzId) | `befehl.kommentarHinzugefuegt` |
| `onBefehlQuittiert()` | BefehlQuittiertEvent | Nein (Event-Carried State Transfer) | `befehl.quittiert` |

**50ms Delay:** Verzoegerung vor DB-Lookup/Emission, um sicherzustellen, dass der DB-Commit abgeschlossen ist (Race Condition Prevention zwischen Outbox-Publish und WebSocket-Client DB-Abfragen).

**Fire-and-Forget:** Fehler werden geloggt, nicht propagiert. WebSocket-Emission darf Domain-Flow nicht blockieren.

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
**Dateien:** 110
**LOC:** ~18.500
**Verantwortung:** HTTP Controller, Guards, Decorators, WebSocket Gateways

### API Module Uebersicht

| Modul | Basis-Pfad | Endpoints | Auth | Protokoll |
|-------|------------|-----------|------|-----------|
| auth | `/api/auth` | 11 | Mixed | REST |
| einsatz | `/api/einsatz` | 14 | JwtAuthGuard | REST |
| etb | `/api/etb` | 7 | JwtAuthGuard | REST |
| kraefte | `/api/einsaetze/:id/personen\|fahrzeuge` | 10 | JwtAuthGuard | REST |
| lagekarte | `/api/einsatz/:id/lagekarte` + `/api/lagekarte` | 11 | JwtAuthGuard | REST |
| user-management | `/api/admin/users` | 6 | AdminJwtAuthGuard | REST |
| integrations | `/api/admin/integrations/hiorg` | 9 | AdminJwtAuthGuard | REST |
| **befehl** | `/api/v-alpha/befehle` | **4** | **JwtAuthGuard** | **REST + WebSocket** |

### Befehl Module (Neu)

**Pfad:** `src/modules/befehl/`

#### REST Controller: BefehlController

| Endpoint | Method | Zweck | Request | Response |
|----------|--------|-------|---------|----------|
| `/api/v-alpha/befehle` | POST | Neuen Befehl erstellen | `CreateBefehlDto` | `BefehlDto` (201) |
| `/api/v-alpha/befehle/:id/quittieren` | POST | Befehl quittieren | `QuittierenBefehlDto` | `BefehlDto` (200) |
| `/api/v-alpha/befehle/:id/kommentare` | POST | Kommentar hinzufuegen | `AddBefehlKommentarDto` | `BefehlDto` (201) |
| `/api/v-alpha/befehle?einsatzId=...` | GET | Befehle eines Einsatzes | Query Params | `BefehlDto[]` (200) |

**Query Parameter fuer GET:**
- `einsatzId` (required): ID des Einsatzes
- `empfaengerId` (optional): Filtert nach Empfaenger-ID
- `hasOpenRueckfragen` (optional): Filtert auf Befehle mit offenen Rueckfragen
- **Prioritaet:** `hasOpenRueckfragen` hat Vorrang vor `empfaengerId`

**Error Handling:**
- 400: Validierungsfehler, Domain-Fehler (nicht zugestellt, bereits quittiert, korrigiert)
- 401: JWT Token fehlt oder ungueltig
- 404: Befehl nicht gefunden (via `BEFEHL_ERROR_CODES.NOT_FOUND`)
- 500: Interne Fehler (DB, fehlende ID nach Erstellung)

#### WebSocket Gateway: BefehlGateway

**Pfad:** `src/modules/befehl/gateways/befehl.gateway.ts`
**Namespace:** `/befehle`

| WebSocket Event | Payload Interface | Trigger |
|-----------------|-------------------|---------|
| `befehl.erstellt` | `BefehlErstelltPayload` | Neuer Befehl erstellt |
| `befehl.zugestellt` | `BefehlZugestelltPayload` | Befehl an Empfaenger zugestellt |
| `befehl.statusGeaendert` | `BefehlStatusGeaendertPayload` | Befehlsstatus geaendert |
| `befehl.kommentarHinzugefuegt` | `BefehlKommentarHinzugefuegtPayload` | Kommentar hinzugefuegt |
| `befehl.quittiert` | `BefehlQuittiertPayload` | Befehl quittiert |

**Client Messages:**
- `join:einsatz` mit `JoinEinsatzDto` -> Joined Room `einsatz:{einsatzId}:befehle`
- `leave:einsatz` mit `JoinEinsatzDto` -> Verlaesst Room

**Security:**
- CORS: Nur FRONTEND_URL erlaubt (kein wildcard `*`)
- Authentication: JWT Token bei Connection erforderlich (WsJwtAuthGuard)
- Input Validation: JoinEinsatzDto mit class-validator (UUID v4 Format, verhindert Room Traversal)

### Response Wrapper Pattern

Alle Responses werden standardisiert:

```typescript
{
  "data": { /* Inhalt */ },
  "meta": {
    "timestamp": "2026-02-19T12:00:00.000Z",
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
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste aller Einsaetze' })
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

**Regel:** Abhaengigkeiten fliessen IMMER nach innen (Modules -> Application -> Domain).

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                         EINSATZ                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐   │
│  │ ETB     │◀─│ Events  │──│Lagekarte│──│    Kraefte      │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘   │
│       ▲                                        │               │
│       │                                        ▼               │
│       └────────────────────────────────────────┘               │
│                   (Event-driven ETB Entries)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │              BEFEHL (Neu)                     │              │
│  │  Controller ──▶ Application ──▶ Domain        │              │
│  │       │                                       │              │
│  │       ▼                                       │              │
│  │  BefehlGateway ◀── BefehlEventAdapter         │              │
│  │  (WebSocket)       (Domain Event → WS)        │              │
│  └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  INTEGRATIONS   │
                    │  (HiOrg-Server) │
                    └─────────────────┘
```

### Befehl-spezifische Dependencies

```
BefehlController (modules/)
        │
        ├── CreateBefehlHandler (application/)
        ├── QuittierenBefehlHandler (application/)
        ├── AddBefehlKommentarHandler (application/)
        └── IBefehlRepository (domain/ via DI Token)
                │
                ▼
        PrismaBefehlRepository (infrastructure/)

BefehlEventAdapter (infrastructure/)
        │
        ├── @OnEvent(befehl.*) ← Domain Events via Outbox
        └── BefehlGateway.emit*() → WebSocket Broadcast
                │
                ▼
        Clients in Room einsatz:{id}:befehle
```

### Keine Circular Dependencies

Das Projekt verwendet:
- `pnpm check:arch` fuer Dependency-Checks
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
                                                      ▼ (5s spaeter)
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

### Befehl Creation + WebSocket Flow (Neu)

```
┌──────────────────────┐     ┌────────────────────────┐     ┌────────────────┐
│ POST /befehle        │────▶│CreateBefehlCommand     │────▶│Befehl Aggregate│
│ (BefehlController)   │     │(Handler + TX)          │     │ .create()      │
└──────────────────────┘     └────────────────────────┘     └────────────────┘
                                      │                            │
                                      │                            ▼
                                      │                   ┌────────────────────┐
                                      │                   │ BefehlErstelltEvent│
                                      │                   └────────────────────┘
                                      │                            │
                                      ▼                            ▼
                             ┌─────────────────┐         ┌─────────────────┐
                             │ Prisma Befehl   │         │ Outbox Table    │
                             │ + Empfaenger    │         │ (saved atomar)  │
                             │ (saved)         │         └─────────────────┘
                             └─────────────────┘                  │
                                                                  ▼ (5s spaeter)
                                                         ┌─────────────────┐
                                                         │ Event Publisher │
                                                         └─────────────────┘
                                                                  │
                                                                  ▼
                                                 ┌──────────────────────────┐
                                                 │ BefehlEventAdapter       │
                                                 │ @OnEvent(befehl.erstellt)│
                                                 │ - 50ms Delay             │
                                                 │ - DB-Lookup (Befehlsgeber│
                                                 │   Name, Status)          │
                                                 └──────────────────────────┘
                                                                  │
                                                                  ▼
                                                 ┌──────────────────────────┐
                                                 │ BefehlGateway            │
                                                 │ .emitBefehlErstellt()    │
                                                 │ Room: einsatz:{id}:befehle│
                                                 └──────────────────────────┘
                                                                  │
                                                                  ▼
                                                 ┌──────────────────────────┐
                                                 │ WebSocket Clients        │
                                                 │ (Frontend Real-Time UI)  │
                                                 └──────────────────────────┘
```

### Befehl Quittierung Flow (Neu)

```
POST /befehle/:id/quittieren
        │
        ▼
┌─────────────────────────────────────┐
│ QuittierenBefehlCommand (Handler)   │
│ - Load Befehl Aggregate             │
│ - befehl.quittieren(empfaengerId,   │
│   quittierungArt)                   │
│ - Generate BefehlQuittiertEvent     │
│ - ggf. BefehlStatusGeaendertEvent   │
│   (wenn alle quittiert haben)       │
│ - Atomar: Save + Outbox             │
└─────────────────────────────────────┘
                    │
                    ▼ (5s spaeter via Outbox)
┌─────────────────────────────────────┐
│ BefehlEventAdapter                  │
│ - onBefehlQuittiert()               │
│ - KEIN DB-Lookup (Event-Carried     │
│   State Transfer: Rich Data im      │
│   Event Payload)                    │
│ - 50ms Delay                        │
│ - gateway.emitBefehlQuittiert()     │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ WebSocket Clients                   │
│ Room: einsatz:{einsatzId}:befehle   │
│ Event: befehl.quittiert             │
│ Payload: befehlId, empfaengerId,    │
│          quittierungArt, nummer,    │
│          quittiertAm               │
└─────────────────────────────────────┘
```

### Funkspruch mit Notfall-Prioritaet Flow (Neu: Issue #407)

```
POST /einsatz/:einsatzId/etb/eintraege
     body: { text, kontext: { type: 'funkspruch', kanalId,
             funkPrioritaet: 'notfall', ... }, ereignisZeitpunkt }
            │
            ▼
┌─────────────────────────────────────┐
│ AddEintragCommand (Handler + TX)    │
│ - Load EinsatztagebuchAggregate     │
│ - etb.addEintrag(text, user, ...,   │
│   { ereignisZeitpunkt, kontext })   │
│ - Erzeugt EintragAddedEvent mit     │
│   kontext.type='funkspruch'         │
│ - Atomar: Save + Outbox             │
└─────────────────────────────────────┘
            │
            ▼ (via Outbox → EventBus)
┌─────────────────────────────────────┐
│ FunkNotfallHandler                  │
│ @OnEvent(etb.eintrag_added)         │
│ - Nur wenn kontext.funkPrioritaet   │
│   === 'notfall'                     │
│ - Emittiert                         │
│   NotfallAlertRequestedEvent        │
│   (einsatzId, kanalId, eintragId,   │
│   text, absender)                   │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ EinsatzEventAdapter                 │
│ @OnEvent(funk.notfall_alert_        │
│           requested)                │
│ - broadcast('funk:notfall-alert',   │
│   payload) an Room einsatz:{id}     │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ WebSocket-Clients                   │
│ NotfallAlertToast + Puls-Animation  │
└─────────────────────────────────────┘

Parallel: EtbFunkspruchBroadcastAdapter hört auf EintragAddedEvent
und sendet generischen 'etb:eintrag-erstellt'-Broadcast, damit das
Funkprotokoll sofort aktualisiert wird (Cache-Invalidation via TanStack
Query).
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

### Befehl-Feature Test Coverage (Neu)

| Test-Datei | Test-Anzahl | Fokus |
|------------|-------------|-------|
| `domain/aggregates/befehl.aggregate.spec.ts` | ~45 | Aggregate Factory, State Machine, Quittierung, Kommentare, Event Accumulation, Append-Only |
| `domain/events/befehl.events.spec.ts` | ~30 | Event-Klassen, eventName(), Typed Value Objects, Timestamps |
| `domain/entities/befehl-empfaenger.entity.spec.ts` | ~10 | Create, Reconstitute, markAlsZugestellt, quittieren |
| `domain/entities/befehl-kommentar.entity.spec.ts` | ~8 | Create, Reconstitute, Immutability |
| `domain/value-objects/befehl-id.spec.ts` | ~5 | CUID2 Validation |
| `domain/value-objects/befehl-status.spec.ts` | ~10 | State Machine Transitions, canTransitionTo() |
| `application/befehl/commands/create-befehl/__tests__/` | ~8 | Handler Transactional Flow, Validation |
| `application/befehl/commands/quittieren-befehl/__tests__/` | ~8 | Handler Flow, Error Codes, Domain Logic |
| `application/befehl/commands/add-befehl-kommentar/__tests__/` | ~6 | Handler Flow, Parent Validation |
| `infrastructure/events/adapters/__tests__/befehl-event.adapter.spec.ts` | ~20 | WebSocket Emission, Fire-and-Forget, 50ms Delay, DB-Lookup |
| `infrastructure/outbox/__tests__/event-deserializer.spec.ts` | (Teil) | Befehl Event Deserialisierung |
| `infrastructure/repositories/__tests__/prisma-befehl.repository.spec.ts` | ~20 | UPSERT, findById, findByEinsatzId, findByEmpfaengerId, findWithOpenRueckfragen, TX Support |
| `modules/befehl/controllers/__tests__/befehl.controller.spec.ts` | ~25 | API Contract, HTTP Status Codes, DTO Mapping, Error Handling |

**Geschaetzte Befehl-Feature Test Coverage:** ~195 Tests

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

# Befehl-spezifische Tests (via npx jest im Backend-Ordner)
npx jest --testPathPatterns="befehl" --no-coverage
```

---

## Contributor Checklist

### Vor jeder Aenderung

- [ ] CLAUDE.md gelesen und verstanden
- [ ] Relevante Domain-Dokumentation gelesen
- [ ] Existierende Patterns in aehnlichen Features analysiert

### Bei neuen Commands/Handlers

- [ ] Command mit Factory-Methode und Result<T> erstellt
- [ ] Handler erweitert `TransactionalCommandHandler`
- [ ] Domain Events werden in Aggregate generiert
- [ ] Events in Outbox gespeichert (automatisch durch Base-Klasse)
- [ ] Unit Tests mit AAA Pattern geschrieben
- [ ] JSDoc mit "warum" (nicht "was") hinzugefuegt

### Bei neuen API Endpoints

- [ ] Controller nutzt `@ApiWrappedResponse` (AC7)
- [ ] Korrekte Guards (JwtAuthGuard / AdminJwtAuthGuard)
- [ ] Rate Limiting konfiguriert
- [ ] Error Codes dokumentiert
- [ ] Response DTOs mit @ApiProperty

### Bei Repository-Aenderungen

- [ ] NO-DELETE Policy beachtet
- [ ] TransactionContext Support implementiert
- [ ] UPSERT Pattern verwendet
- [ ] Mapper fuer Domain <-> Persistence

### Bei neuen Domain Events (Befehl-Pattern als Referenz)

- [ ] Event-Klasse in `domain/events/` erstellt (extends DomainEvent, static eventName())
- [ ] Event-Name in `domain/events/event-names.ts` registriert (EVENT_NAMES.BEFEHL.*)
- [ ] Serializer-Methode in `infrastructure/outbox/event-serializer.ts` hinzugefuegt
- [ ] Deserializer-Funktion in `infrastructure/outbox/event-deserializer.ts` hinzugefuegt + in Map registriert
- [ ] Event Adapter erstellt/erweitert (z.B. `infrastructure/events/adapters/befehl-event.adapter.ts`)
- [ ] Event Adapter in Adapters Module registriert
- [ ] Unit Tests fuer Event-Klasse geschrieben

### Bei WebSocket Gateways (Befehl-Pattern als Referenz)

- [ ] Gateway in `modules/{feature}/gateways/` erstellt
- [ ] Typed Payload Interfaces definiert
- [ ] Room-based Broadcast Pattern verwendet (`einsatz:{id}:{feature}`)
- [ ] WsJwtAuthGuard fuer Authentication
- [ ] Input Validation via class-validator DTOs
- [ ] CORS korrekt konfiguriert (kein wildcard)
- [ ] Event Adapter als Bruecke zwischen Domain Events und Gateway
- [ ] 50ms Delay fuer Race Condition Prevention
- [ ] Fire-and-Forget Pattern: Fehler loggen, nicht propagieren

### Code Review Checklist

1. **AC1:** `import type` NUR fuer Typen, NICHT fuer Injectable Classes
2. **AC2:** DI Token Strings als Constants (Symbol-based)
3. **AC3:** Application Layer Framework-agnostisch (nur @Injectable, @Inject)
4. **AC4:** Result<T> statt Exceptions fuer Business-Fehler
5. **AC5:** Outbox-Events atomar mit Domain-Operationen
6. **AC6:** Unit Tests AAA Pattern mit Given-When-Then
7. **AC7:** `@ApiWrappedResponse` statt Standard Swagger

### Risiken & Gotchas

- **Outbox Delay:** Events werden mit ~5s Verzoegerung publiziert
- **WebSocket 50ms Delay:** Zusaetzliche 50ms Verzoegerung vor WebSocket-Emission (Race Condition Prevention)
- **Transaction Timeout:** 10 Sekunden Maximum
- **ARCHIVIERT Status:** Ist FINAL und IMMUTABLE (Einsatz)
- **QUITTIERT/KORRIGIERT Status:** Sind FINAL (Befehl) - keine weiteren Transitions moeglich
- **Min-1-SUPER_ADMIN:** Letzter SUPER_ADMIN kann nicht geloescht werden
- **MGRS Koordinaten:** Primaeres Format fuer DRK-Compliance
- **Befehl Append-Only:** Befehle koennen NIEMALS geloescht werden (GoBD-Compliance)
- **Befehl Nested Writes:** Bei save() werden Empfaenger/Kommentare geloescht und neu erstellt (DeleteMany + Create)
- **hasOpenRueckfragen Prioritaet:** Im GET-Endpoint hat `hasOpenRueckfragen` Vorrang vor `empfaengerId`

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
| Befehl Aggregate | `src/domain/aggregates/befehl.aggregate.ts` |
| Befehl Application Module | `src/application/befehl/befehl-application.module.ts` |
| Befehl Controller | `src/modules/befehl/controllers/befehl.controller.ts` |
| Befehl Gateway (WS) | `src/modules/befehl/gateways/befehl.gateway.ts` |
| Befehl Event Adapter | `src/infrastructure/events/adapters/befehl-event.adapter.ts` |
| Befehl Repository | `src/infrastructure/repositories/prisma-befehl.repository.ts` |
| Event Names Registry | `src/domain/events/event-names.ts` |

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
| Append-Only Policy | Befehle koennen nie geloescht werden (GoBD Compliance) |
| Event-Carried State Transfer | Rich Data in Events fuer DB-Query-freie Verarbeitung |
| Fire-and-Forget | WebSocket-Emission blockiert nicht den Domain-Flow |
| Room-based WebSocket | Clients subscriben auf Einsatz-spezifische Rooms |

---

_Generiert durch `document-project` Workflow (Deep-Dive Mode)_
_Scan Datum: 2026-02-19_
_Analyse Modus: Exhaustive_
