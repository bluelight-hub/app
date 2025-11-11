# Transformation zu Hexagonaler Architektur mit DDD
## Bluelight-Hub: Architektur-Analyse & Migrations-Roadmap

**Datum:** 2025-01-11
**Projekt:** Bluelight-Hub (DRK Einsatzunterstützung)
**Analysiert von:** Winston (BMM Architect Agent)

---

## 📋 Executive Summary

Diese Analyse untersucht die Transformation der aktuellen 3-Tier-Architektur von Bluelight-Hub zu einer **Hexagonalen Architektur (Ports & Adapters)** mit **Domain-Driven Design (DDD)**.

**Kernerkenntnisse:**
- ✅ Aktuelle Architektur ist solide 3-Tier (NestJS-Standard)
- ❌ Starke Framework-Kopplung (NestJS, Prisma) in 37+ Dateien
- ❌ Anemic Domain Model (DTOs ohne Business-Logic)
- ❌ Services haben zu viele Verantwortlichkeiten (SRP-Verletzung)
- ✅ 4 klar identifizierbare Bounded Contexts
- ⚠️ Migration-Aufwand: **120-160 Stunden** (~3-4 Wochen)

**Empfehlung:** ✅ **JA zur Migration, aber inkrementell mit Strangler Fig Pattern**

---

## 🎯 IST-ZUSTAND: Aktuelle Architektur

### Architektur-Style: 3-Tier Layered Architecture

```
┌─────────────────────────────────────┐
│   Controller Layer (HTTP/REST)      │ ← Framework-gebunden (NestJS)
├─────────────────────────────────────┤
│   Service Layer (Business Logic)    │ ← Zu viele Verantwortlichkeiten
├─────────────────────────────────────┤
│   Repository Layer (Data Access)    │ ← Leaky (Prisma-Typen durchsickern)
├─────────────────────────────────────┤
│   Prisma ORM                        │ ← Stark gekoppelt (37+ Imports)
└─────────────────────────────────────┘
```

### Identifizierte Bounded Contexts

#### 1. Authentication & User Management Domain
- **Aggregate Root:** `User` (nanoID)
- **Lifecycle:** Active → Locked → Deleted (Soft)
- **Besonderheit:** Unified Auth (passwordless für User, Password für Admins)
- **RBAC:** 3 Rollen (SUPER_ADMIN, ADMIN, USER)
- **Constraints:** Min 1 SUPER_ADMIN, eindeutiger Username, Account Locking

#### 2. Einsatz (Core Operational) Domain
- **Aggregate Root:** `Einsatz` (CUID)
- **Lifecycle:** ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT (State Machine)
- **Besonderheit:** NO-DELETE Policy (nur Archivierung für Compliance)
- **Events:** `einsatz.erstellt` triggert ETB/Lagekarte-Erstellung
- **Utility Classes:**
  - `EinsatzNameGenerator` (Business-Logic für Namens-Generierung)
  - `EinsatzCompletenessCalculator` (Vollständigkeits-Check)
  - `EinsatzStatusTransitions` (State-Machine-Regeln)

#### 3. Einsatztagebuch (ETB - Operational Log) Domain
- **Aggregate Root:** `Einsatztagebuch` (CUID, 1:1 mit Einsatz)
- **Lifecycle:** DRAFT → ACTIVE → LOCKED (immutable when locked)
- **Besonderheit:** Event-driven Creation via `@OnEvent('einsatz.erstellt')`
- **Child Entities:**
  - `EtbEintrag` (n:1) - Mit Versionierung + Soft-Delete
  - `EtbEintragHistorie` (Versioning mit History-Snapshots)
  - `EtbTextbaustein` (Templates)
- **Atomic Operations:** Sequence-Numbers, Versionierung mit History

#### 4. Lagekarte (Situation Map) Domain
- **Aggregate Root:** `Lagekarte` (CUID, 1:1 mit Einsatz)
- **Besonderheit:** Lazy Creation (erst beim ersten Abruf erstellt)
- **Child Entity:** `LagekartePoi` (n:1)
- **Coordinate System:** MGRS (Primär, militärisch präzise) + Lat/Lng (Fallback)
- **Transactional Atomic:** Lagekarte + initialer POI in einer Transaktion
- **Geocoding:** Integration mit Nominatim API

### Module-Struktur (Backend)

```
packages/backend/src/
├── auth/                 # Authentication & Authorization
├── einsatz/             # Einsatz Management
├── etb/                 # Einsatztagebuch
├── user-management/     # User Administration
├── modules/lagekarte/   # Map & POI Management
├── health/              # Health Checks
└── common/              # Shared Utilities
```

**Module-Statistiken:**
- 7 funktionale Module
- ~1,800+ Zeilen Code (Lagekarte allein)
- 17 Dateien in Lagekarte (3 Controller, 4 Services, 2 Repositories)

---

## 🚨 PROBLEME DER AKTUELLEN ARCHITEKTUR

### 1. Anemic Domain Model (Kritisch)

**Problem:** Entities ohne Business-Logic, nur Daten-Container.

```typescript
// ❌ AKTUELL: Anemic
export type Einsatz = {
  id: string;
  status: EinsatzStatus;
  stichwort: string;
  // ... nur Daten, keine Methoden
}

// Service macht alles:
async complete(id: string, userId: string) {
  if (einsatz.status !== 'IN_BEARBEITUNG') {
    throw new Error('Invalid status');
  }
  await this.repository.update(id, { status: 'ABGESCHLOSSEN' });
}
```

**Impact:**
- Business-Regeln verstreut in Services
- Schwer zu testen (Service-Dependencies)
- Duplikation von Validierungs-Logic
- Keine Garantie für Invarianten

---

### 2. Framework-Kopplung (Kritisch)

**Problem:** Starke Abhängigkeiten auf NestJS, Prisma in 37+ Dateien.

```typescript
// ❌ AKTUELL: Framework überall
import { Injectable } from '@nestjs/common';
import { Einsatz, Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EinsatzService {
  constructor(
    private readonly repository: EinsatzRepository,
    private readonly eventEmitter: EventEmitter2,  // Framework-gebunden
  ) {}

  async create(dto: CreateEinsatzDto): Promise<Einsatz> {
    // Prisma-Typen durchsickern
    const data: Prisma.EinsatzCreateInput = { ... };
    const einsatz = await this.repository.create(data);

    // String-basierte Events (nicht typsicher)
    this.eventEmitter.emit('einsatz.erstellt', event);
  }
}
```

**Kopplungs-Hotspots:**

| Framework/Library | Anzahl Imports | Impact |
|-------------------|----------------|--------|
| `@nestjs/common` | ~45 Dateien | Logger, Decorators, Guards |
| `@nestjs/core` | ~40 Dateien | Module, DI, Interceptors |
| `@prisma/client` | ~37 Dateien | ORM, Types |
| `@nestjs/jwt` | ~8 Dateien | Auth |
| `@nestjs/event-emitter` | ~3 Dateien | Domain Events |
| `@nestjs/axios` | ~2 Dateien | HTTP |
| `@nestjs/cache-manager` | ~2 Dateien | Caching |
| `@nestjs/throttler` | ~2 Dateien | Rate Limiting |

**Impact:**
- ORM-Wechsel (Prisma → TypeORM) erfordert 37+ Datei-Änderungen
- Framework-Wechsel (NestJS → Express) nahezu unmöglich
- Testing benötigt komplettes NestJS Test-Setup

---

### 3. Leaky Abstraction (Repositories)

**Problem:** Repositories geben Framework-Typen zurück.

```typescript
// ❌ AKTUELL: Prisma-Typen in Repository-Signatur
import { Einsatz, Prisma } from '@prisma/client';

export class EinsatzRepository {
  async findAll(params?: {
    where?: Prisma.EinsatzWhereInput;  // ← Prisma-Typ durchsickert!
    orderBy?: Prisma.EinsatzOrderByWithRelationInput;
  }): Promise<Einsatz[]> {
    return this.prisma.einsatz.findMany(params);
  }
}

// Service ist jetzt an Prisma gekoppelt:
const einsaetze = await this.repository.findAll({
  where: { status: EinsatzStatus.ANGELEGT },  // Prisma-spezifisch
  orderBy: { createdAt: 'desc' }
});
```

**Impact:**
- Service-Layer kennt Datenbank-Details
- Nicht austauschbar gegen andere ORMs
- Tests müssen Prisma mocken

---

### 4. Services mit zu vielen Verantwortlichkeiten

**Problem:** God Services mit 5+ Responsibilities.

```typescript
// ❌ AKTUELL: EinsatzService tut alles
export class EinsatzService {
  // 1. CRUD Operations
  async create(...) { /* 50+ Zeilen */ }
  async update(...) { /* 40+ Zeilen */ }
  async findAll(...) { /* Querying */ }

  // 2. Business Logic
  async complete(...) { /* Status-Transition */ }
  async archive(...) { /* Archivierung */ }

  // 3. Caching (sollte Infrastructure sein!)
  private completenessCache = new Map<string, ...>();
  private cleanupExpiredCacheEntries() { ... }

  // 4. Data Transformation
  private async toResponseDto(...) { ... }

  // 5. Event Publishing
  this.eventEmitter.emit('einsatz.erstellt', event);

  // ... 15+ Methoden
}
```

**Impact:**
- Single Responsibility Principle verletzt
- Schwer zu testen (zu viele Dependencies)
- Schwer zu verstehen (zu viele Concerns)
- Änderungen haben Seiteneffekte

---

### 5. String-basierte Events (Nicht typsicher)

**Problem:** Magic Strings statt typisierte Events.

```typescript
// ❌ AKTUELL: String-basiert
this.eventEmitter.emit('einsatz.erstellt', event);

@OnEvent('einsatz.erstellt')  // ← Typo-anfällig!
async handleEinsatzErstellt(event: EinsatzErstelltEvent) {
  // Handler-Code
}
```

**Probleme:**
- Typos führen zu Silent Failures
- Keine IDE-Unterstützung für Refactoring
- Keine Compile-Zeit-Sicherheit
- Nicht migrierbar zu Message Queues (RabbitMQ, Kafka)

---

### 6. Fehlende Transactional Outbox

**Problem:** Events werden außerhalb der Transaktion gepublisht.

```typescript
// ❌ AKTUELL: Race Condition möglich
async create(dto: CreateEinsatzDto) {
  const einsatz = await this.repository.create(data);  // DB-Commit
  this.eventEmitter.emit('einsatz.erstellt', event);  // Event nach Commit

  // Was wenn Event-Emit scheitert?
  // → Einsatz existiert, aber ETB wurde nicht erstellt!
}
```

**Impact:**
- Inconsistent State bei Event-Failures
- Kein Retry-Mechanismus
- Lost Events bei System-Crashes

---

### 7. Primitive Obsession

**Problem:** Keine Value Objects, überall Primitives.

```typescript
// ❌ AKTUELL: Primitives
status: string  // "ANGELEGT" | "IN_BEARBEITUNG" | ...
coordinates: { lat: number; lng: number }
mgrs: string  // "33UXP1234567890" - keine Validierung!
```

**Impact:**
- Keine Validierung (z.B. ungültige MGRS-Koordinaten)
- Keine Business-Methoden (z.B. distanceTo())
- Keine Type-Safety (status könnte "INVALID" sein)

---

## 🎯 SOLL-ZUSTAND: Hexagonale Architektur mit DDD

### Architektur-Diagramm

```
┌────────────────────────────────────────────────────────┐
│              APPLICATION LAYER (Use Cases)             │
│  ┌─────────────────┐  ┌──────────────────┐           │
│  │ Command Handler │  │  Query Handler   │           │
│  └─────────────────┘  └──────────────────┘           │
│           ↓                     ↓                      │
│  ┌──────────────────────────────────────────┐         │
│  │         DOMAIN LAYER (Core)              │         │
│  │  ┌────────────┐  ┌─────────────────┐    │         │
│  │  │ Aggregates │  │  Value Objects  │    │         │
│  │  │  Entities  │  │  Domain Events  │    │         │
│  │  │  Services  │  │  Repositories*  │    │         │
│  │  └────────────┘  └─────────────────┘    │         │
│  └──────────────────────────────────────────┘         │
│           ↑                     ↑                      │
│  ┌─────────────────┐  ┌──────────────────┐           │
│  │ INBOUND PORTS   │  │  OUTBOUND PORTS  │           │
│  └─────────────────┘  └──────────────────┘           │
└────────────────────────────────────────────────────────┘
           ↑                     ↑
┌──────────────────┐  ┌──────────────────────┐
│ INBOUND ADAPTERS │  │  OUTBOUND ADAPTERS   │
│  - REST (NestJS) │  │  - Prisma Adapter    │
│  - GraphQL (opt) │  │  - Event Bus Adapter │
│  - CLI (opt)     │  │  - Nominatim Adapter │
└──────────────────┘  └──────────────────────┘
```

*(Repository = Interface im Domain Layer)*

---

## 📋 DETAILLIERTE TRANSFORMATIONS-SCHRITTE

### 1️⃣ DOMAIN LAYER (NEU erstellen)

#### 1.1 Rich Aggregates

**Aktuell:** Anemic Models ohne Logic

```typescript
// ❌ AKTUELL: Nur Daten
export type Einsatz = {
  id: string;
  status: EinsatzStatus;
  stichwort: string;
}
```

**Soll:** Rich Domain Models mit Business-Logic

```typescript
// ✅ SOLL: Rich Aggregate
export class EinsatzAggregate {
  private constructor(
    private readonly id: EinsatzId,
    private status: EinsatzStatus,
    private readonly stichwort: EinsatzStichwort,
    private readonly createdBy: UserId,
    private readonly events: DomainEvent[] = []
  ) {}

  // Factory Method (Ersatz für Constructor)
  static create(data: CreateEinsatzData, creator: UserId): EinsatzAggregate {
    // Business-Rule: Startzeit darf nicht in Zukunft liegen
    if (data.startzeit > new Date()) {
      throw new EinsatzInFutureNotAllowedError();
    }

    const aggregate = new EinsatzAggregate(
      EinsatzId.generate(),
      EinsatzStatus.ANGELEGT,
      data.stichwort,
      creator
    );

    // Domain Event
    aggregate.addEvent(new EinsatzCreatedEvent(aggregate.id, creator));

    return aggregate;
  }

  // Business Logic im Aggregate
  complete(completedBy: UserId): void {
    // State Machine Validation
    if (!this.status.canTransitionTo(EinsatzStatus.ABGESCHLOSSEN)) {
      throw new InvalidStatusTransitionError(
        this.status,
        EinsatzStatus.ABGESCHLOSSEN
      );
    }

    this.status = EinsatzStatus.ABGESCHLOSSEN;
    this.addEvent(new EinsatzCompletedEvent(this.id, completedBy));
  }

  archive(archivedBy: UserId): void {
    // Business-Rule: Nur abgeschlossene Einsätze archivierbar
    if (!this.status.equals(EinsatzStatus.ABGESCHLOSSEN)) {
      throw new EinsatzNotArchivableError(this.id, this.status);
    }

    this.status = EinsatzStatus.ARCHIVIERT;
    this.addEvent(new EinsatzArchivedEvent(this.id, archivedBy));
  }

  // Invarianten schützen
  canEdit(): boolean {
    return !this.status.equals(EinsatzStatus.ARCHIVIERT);
  }

  // Event-Handling
  getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events.length = 0;
  }
}
```

**Vorteile:**
- ✅ Business-Regeln zentral im Aggregate
- ✅ Invarianten werden geschützt (private constructor)
- ✅ Nicht-valide Zustände unmöglich (kein ARCHIVIERT ohne ABGESCHLOSSEN)
- ✅ Domain Events als First-Class Citizens
- ✅ Testbar ohne Framework (Pure TypeScript)

**Änderungen:**
- Erstelle `/domain/aggregates/einsatz/einsatz-aggregate.ts`
- Erstelle `/domain/aggregates/etb/einsatztagebuch-aggregate.ts`
- Erstelle `/domain/aggregates/lagekarte/lagekarte-aggregate.ts`
- Erstelle `/domain/aggregates/user/user-aggregate.ts`

**Aufwand:** 16-20 Stunden (4 Aggregates × 4-5h)

---

#### 1.2 Value Objects

**Aktuell:** Primitives überall (String, Number)

```typescript
// ❌ AKTUELL: Primitive Obsession
status: string  // Keine Validierung!
coordinates: { lat: number; lng: number }  // Keine Methoden!
mgrs: string  // "33UXP1234567890" - keine Prüfung!
```

**Soll:** Value Objects mit Validierung & Methoden

```typescript
// ✅ SOLL: Value Objects

// 1. EinsatzStatus (Enum mit Transition-Logic)
export class EinsatzStatus extends ValueObject<string> {
  static readonly ANGELEGT = new EinsatzStatus('ANGELEGT');
  static readonly IN_BEARBEITUNG = new EinsatzStatus('IN_BEARBEITUNG');
  static readonly ABGESCHLOSSEN = new EinsatzStatus('ABGESCHLOSSEN');
  static readonly ARCHIVIERT = new EinsatzStatus('ARCHIVIERT');

  private constructor(value: string) {
    super(value);
  }

  canTransitionTo(target: EinsatzStatus): boolean {
    const transitions = {
      ANGELEGT: ['IN_BEARBEITUNG'],
      IN_BEARBEITUNG: ['ABGESCHLOSSEN'],
      ABGESCHLOSSEN: ['ARCHIVIERT'],
      ARCHIVIERT: []
    };
    return transitions[this.value].includes(target.value);
  }

  equals(other: EinsatzStatus): boolean {
    return this.value === other.value;
  }
}

// 2. MGRS-Koordinate (mit Validierung)
export class MgrsCoordinate extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<MgrsCoordinate> {
    if (!this.isValid(value)) {
      return Result.fail(`Invalid MGRS: ${value}`);
    }
    return Result.ok(new MgrsCoordinate(value));
  }

  private static isValid(value: string): boolean {
    // MGRS Format: 33UXP1234567890 (Zone + Grid + 10-digit coords)
    return /^\d{1,2}[A-Z]{3}\d{10}$/.test(value);
  }

  toLatLng(): GeoCoordinate {
    // Conversion via mgrs library
    const { latitude, longitude } = mgrs.toPoint(this.value);
    return GeoCoordinate.create(latitude, longitude).getValue();
  }

  equals(other: MgrsCoordinate): boolean {
    return this.value === other.value;
  }
}

// 3. Geo-Koordinate (mit Distance-Berechnung)
export class GeoCoordinate extends ValueObject<{lat: number; lng: number}> {
  private constructor(lat: number, lng: number) {
    super({ lat, lng });
  }

  static create(lat: number, lng: number): Result<GeoCoordinate> {
    if (lat < -90 || lat > 90) {
      return Result.fail(`Invalid latitude: ${lat}`);
    }
    if (lng < -180 || lng > 180) {
      return Result.fail(`Invalid longitude: ${lng}`);
    }
    return Result.ok(new GeoCoordinate(lat, lng));
  }

  distanceTo(other: GeoCoordinate): number {
    // Haversine Formula
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(other.value.lat - this.value.lat);
    const dLng = this.toRad(other.value.lng - this.value.lng);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(this.value.lat)) *
              Math.cos(this.toRad(other.value.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toMgrs(): MgrsCoordinate {
    const mgrsString = mgrs.forward([this.value.lng, this.value.lat]);
    return MgrsCoordinate.create(mgrsString).getValue();
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// 4. Typed IDs (Type Safety)
export class EinsatzId extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static generate(): EinsatzId {
    return new EinsatzId(cuid());
  }

  static create(value: string): Result<EinsatzId> {
    if (!value || value.length < 10) {
      return Result.fail('Invalid EinsatzId');
    }
    return Result.ok(new EinsatzId(value));
  }
}

export class UserId extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static generate(): UserId {
    return new UserId(nanoid());
  }

  static create(value: string): Result<UserId> {
    if (!value || value.length < 5) {
      return Result.fail('Invalid UserId');
    }
    return Result.ok(new UserId(value));
  }
}

// 5. Address (mit Validierung)
export class Address extends ValueObject<{
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}> {
  private constructor(data: AddressData) {
    super(data);
  }

  static create(data: AddressData): Result<Address> {
    // Mindestens Stadt oder Straße erforderlich
    if (!data.city && !data.street) {
      return Result.fail('Address needs at least city or street');
    }
    return Result.ok(new Address(data));
  }

  toString(): string {
    const parts = [
      this.value.street,
      this.value.zip,
      this.value.city,
      this.value.country
    ].filter(Boolean);
    return parts.join(', ');
  }
}

// 6. EinsatzStichwort (Keywords mit Business-Rules)
export class EinsatzStichwort extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<EinsatzStichwort> {
    if (!value || value.trim().length === 0) {
      return Result.fail('Stichwort cannot be empty');
    }
    if (value.length > 100) {
      return Result.fail('Stichwort too long (max 100 chars)');
    }
    return Result.ok(new EinsatzStichwort(value.trim()));
  }
}
```

**Weitere Value Objects (gesamt 15-20):**
- `EinsatzName` (generierte Namen mit Business-Rules)
- `TimeRange` (Start/End mit Validierung)
- `EtbSequenceNumber` (fortlaufende Nummern)
- `EtbVersion` (Versionierung)
- `EtbEintragText` (mit maxLength-Validierung)
- `LagekartePoiName`
- `LagekartePoiType` (Enum: VEHICLE, PERSON, LOCATION, etc.)

**Vorteile:**
- ✅ Validierung zentral (nicht verstreut in Services)
- ✅ Business-Methoden direkt am Value Object (distanceTo, canTransitionTo)
- ✅ Type-Safety (kann nicht EinsatzId mit UserId verwechseln)
- ✅ Immutability (Value Objects sind unveränderlich)

**Änderungen:**
- Erstelle `/domain/value-objects/` mit 15-20 Value Objects
- Ersetze alle Primitives in Aggregates durch Value Objects

**Aufwand:** 12-16 Stunden (15-20 VOs × 30-45min)

---

#### 1.3 Domain Events

**Aktuell:** String-basiert, framework-gebunden

```typescript
// ❌ AKTUELL: Stringly-typed
this.eventEmitter.emit('einsatz.erstellt', event);

@OnEvent('einsatz.erstellt')  // Magic String!
async handleEinsatzErstellt(event: EinsatzErstelltEvent) {
  // Handler-Code
}
```

**Soll:** Typisierte Domain Events (Framework-agnostisch)

```typescript
// ✅ SOLL: Domain Events

// Base Class
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(aggregateId: string) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
  }

  abstract eventName(): string;
}

// Einsatz Events
export class EinsatzCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly createdBy: string,
    public readonly stichwort: string
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'EinsatzCreated';  // Type-safe!
  }
}

export class EinsatzCompletedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly completedBy: string,
    public readonly completedAt: Date
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'EinsatzCompleted';
  }
}

export class EinsatzArchivedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly archivedBy: string
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'EinsatzArchived';
  }
}

// ETB Events
export class EinsatztagebuchCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly einsatzId: string
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'EinsatztagebuchCreated';
  }
}

export class EtbEintragAddedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly eintragId: string,
    public readonly text: string,
    public readonly createdBy: string
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'EtbEintragAdded';
  }
}

export class EinsatztagebuchLockedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly lockedBy: string,
    public readonly reason: string
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'EinsatztagebuchLocked';
  }
}

// Lagekarte Events
export class LagekarteCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly einsatzId: string
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'LagekarteCreated';
  }
}

export class LagekartePoiAddedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly poiId: string,
    public readonly name: string,
    public readonly coordinate: GeoCoordinate
  ) {
    super(aggregateId);
  }

  eventName(): string {
    return 'LagekartePoiAdded';
  }
}
```

**Event Handler Interface (Port):**

```typescript
// Port für Event Publishing (im Domain Layer)
export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}

// Port für Event Handling (im Application Layer)
export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}
```

**Vorteile:**
- ✅ Type-Safe (keine Magic Strings)
- ✅ IDE-Support (Refactoring, Auto-Complete)
- ✅ Framework-agnostisch (austauschbar)
- ✅ Migrierbar zu Message Queues (RabbitMQ, Kafka)

**Änderungen:**
- Erstelle `/domain/events/` mit allen Domain Events (~15-20 Events)
- Erstelle `/domain/events/handlers/` für Handler-Interfaces
- Ersetze String-Events durch typisierte Events

**Aufwand:** 6-8 Stunden (15-20 Events)

---

#### 1.4 Domain Services

**Aktuell:** Business-Logic in Application Services verstreut

```typescript
// ❌ AKTUELL: Logic in Application Service
export class EinsatzService {
  private async toResponseDto(einsatz: Einsatz): Promise<EinsatzResponseDto> {
    const name = EinsatzNameGenerator.generate(einsatz);
    const completeness = EinsatzCompletenessCalculator.calculate(einsatz);
    return { ...einsatz, name, completeness };
  }
}
```

**Soll:** Domain Services für Cross-Aggregate-Logic

```typescript
// ✅ SOLL: Domain Services

// 1. Naming Service (Complex Business-Logic)
export class EinsatzNamingService {
  generateName(einsatz: EinsatzAggregate): EinsatzName {
    // Business-Rule: Name = Stichwort + Datum + Uhrzeit
    const date = format(einsatz.startzeit, 'dd.MM.yyyy');
    const time = format(einsatz.startzeit, 'HH:mm');

    const nameString = `${einsatz.stichwort.value} - ${date} ${time}`;
    return EinsatzName.create(nameString).getValue();
  }
}

// 2. Completeness Service (Spanning Multiple Aggregates)
export class EinsatzCompletenessService {
  calculate(
    einsatz: EinsatzAggregate,
    etb?: EinsatztagebuchAggregate
  ): EinsatzCompleteness {
    let score = 0;
    let total = 10;

    // Pflichtfelder
    if (einsatz.stichwort) score++;
    if (einsatz.startzeit) score++;
    if (einsatz.status !== EinsatzStatus.ANGELEGT) score++;

    // Optionale Felder
    if (einsatz.address) score++;
    if (einsatz.hasEinsatzleiter()) score++;
    if (einsatz.fahrzeuge.length > 0) score++;

    // Cross-Aggregate: ETB
    if (etb && etb.entries.length >= 3) score++;
    if (etb && etb.isLocked) score++;

    const percentage = Math.round((score / total) * 100);
    return new EinsatzCompleteness(percentage, score, total);
  }
}

// 3. Geocoding Service (External Dependency)
export class GeocodingService {
  constructor(private readonly geocodingPort: IGeocodingPort) {}

  async resolveAddress(address: Address): Promise<GeoCoordinate | null> {
    // Domain Logic: Priority MGRS > LatLng > Address
    try {
      return await this.geocodingPort.geocode(address);
    } catch (error) {
      // Graceful fallback
      return null;
    }
  }

  async reverseGeocode(coordinate: GeoCoordinate): Promise<Address | null> {
    try {
      return await this.geocodingPort.reverseGeocode(coordinate);
    } catch (error) {
      return null;
    }
  }
}

// 4. Status Transition Service (State Machine)
export class EinsatzStatusTransitionService {
  canTransition(from: EinsatzStatus, to: EinsatzStatus): boolean {
    return from.canTransitionTo(to);
  }

  validateTransition(from: EinsatzStatus, to: EinsatzStatus): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidStatusTransitionError(from, to);
    }
  }

  getAvailableTransitions(current: EinsatzStatus): EinsatzStatus[] {
    const transitions = {
      [EinsatzStatus.ANGELEGT]: [EinsatzStatus.IN_BEARBEITUNG],
      [EinsatzStatus.IN_BEARBEITUNG]: [EinsatzStatus.ABGESCHLOSSEN],
      [EinsatzStatus.ABGESCHLOSSEN]: [EinsatzStatus.ARCHIVIERT],
      [EinsatzStatus.ARCHIVIERT]: []
    };
    return transitions[current.value] || [];
  }
}
```

**Vorteile:**
- ✅ Cross-Aggregate-Logic zentral (nicht in Aggregates)
- ✅ Wiederverwendbar (mehrere Use Cases nutzen gleichen Service)
- ✅ Testbar ohne Framework

**Änderungen:**
- Erstelle `/domain/services/` mit Domain Services
- Extrahiere Cross-Aggregate-Logic aus Application Services

**Aufwand:** 4-6 Stunden (3-5 Services)

---

#### 1.5 Repository Interfaces (Ports)

**Aktuell:** Repositories geben Prisma-Typen zurück

```typescript
// ❌ AKTUELL: Leaky Abstraction
import { Einsatz, Prisma } from '@prisma/client';

export class EinsatzRepository {
  async findAll(params?: {
    where?: Prisma.EinsatzWhereInput;  // ← Prisma durchsickert!
    orderBy?: Prisma.EinsatzOrderByWithRelationInput;
  }): Promise<Einsatz[]> {
    return this.prisma.einsatz.findMany(params);
  }
}
```

**Soll:** Domain-agnostische Repository-Interfaces (Ports)

```typescript
// ✅ SOLL: Repository Interface (im Domain Layer)

export interface IEinsatzRepository {
  save(aggregate: EinsatzAggregate): Promise<void>;
  findById(id: EinsatzId): Promise<EinsatzAggregate | null>;
  findAll(spec: EinsatzSpecification): Promise<EinsatzAggregate[]>;
  delete(id: EinsatzId): Promise<void>;  // Soft-Delete
  nextIdentity(): EinsatzId;
}

// Specification Pattern für typsichere Queries
export abstract class EinsatzSpecification {
  abstract isSatisfiedBy(einsatz: EinsatzAggregate): boolean;
  abstract toPrismaWhere?(): Prisma.EinsatzWhereInput;  // Optional für Performance
}

export class ActiveEinsatzSpec extends EinsatzSpecification {
  isSatisfiedBy(einsatz: EinsatzAggregate): boolean {
    return !einsatz.isArchived();
  }

  toPrismaWhere(): Prisma.EinsatzWhereInput {
    return { status: { not: 'ARCHIVIERT' } };
  }
}

export class EinsatzByStatusSpec extends EinsatzSpecification {
  constructor(private readonly status: EinsatzStatus) {}

  isSatisfiedBy(einsatz: EinsatzAggregate): boolean {
    return einsatz.hasStatus(this.status);
  }

  toPrismaWhere(): Prisma.EinsatzWhereInput {
    return { status: this.status.value };
  }
}

export class EinsatzByUserSpec extends EinsatzSpecification {
  constructor(private readonly userId: UserId) {}

  isSatisfiedBy(einsatz: EinsatzAggregate): boolean {
    return einsatz.createdBy.equals(this.userId);
  }

  toPrismaWhere(): Prisma.EinsatzWhereInput {
    return { createdBy: this.userId.value };
  }
}

// Composite Specification (AND)
export class AndSpec extends EinsatzSpecification {
  constructor(
    private readonly left: EinsatzSpecification,
    private readonly right: EinsatzSpecification
  ) {}

  isSatisfiedBy(einsatz: EinsatzAggregate): boolean {
    return this.left.isSatisfiedBy(einsatz) &&
           this.right.isSatisfiedBy(einsatz);
  }

  toPrismaWhere(): Prisma.EinsatzWhereInput {
    return {
      AND: [
        this.left.toPrismaWhere?.() || {},
        this.right.toPrismaWhere?.() || {}
      ]
    };
  }
}
```

**Weitere Repository-Interfaces:**

```typescript
export interface IEinsatztagebuchRepository {
  save(aggregate: EinsatztagebuchAggregate): Promise<void>;
  findById(id: EtbId): Promise<EinsatztagebuchAggregate | null>;
  findByEinsatzId(einsatzId: EinsatzId): Promise<EinsatztagebuchAggregate | null>;
  delete(id: EtbId): Promise<void>;
}

export interface ILagekarteRepository {
  save(aggregate: LagekarteAggregate): Promise<void>;
  findById(id: LagekarteId): Promise<LagekarteAggregate | null>;
  findByEinsatzId(einsatzId: EinsatzId): Promise<LagekarteAggregate | null>;
}

export interface IUserRepository {
  save(aggregate: UserAggregate): Promise<void>;
  findById(id: UserId): Promise<UserAggregate | null>;
  findByUsername(username: string): Promise<UserAggregate | null>;
  findAll(spec: UserSpecification): Promise<UserAggregate[]>;
}
```

**Vorteile:**
- ✅ Domain Layer kennt keine Infrastruktur-Details
- ✅ Austauschbar (Prisma → TypeORM → In-Memory für Tests)
- ✅ Specification Pattern für typsichere Queries

**Änderungen:**
- Erstelle `/domain/repositories/` mit Repository-Interfaces
- Alle 5 Repositories zu Ports umbauen

**Aufwand:** 4-6 Stunden (5 Repositories)

---

### 2️⃣ APPLICATION LAYER (Umstrukturieren)

#### 2.1 Use Cases / Command Handlers (CQRS-Light)

**Aktuell:** God Services mit zu vielen Responsibilities

```typescript
// ❌ AKTUELL: God Service
export class EinsatzService {
  async create(...) { /* 50+ Zeilen */ }
  async update(...) { /* 40+ Zeilen */ }
  async findAll(...) { /* Querying */ }
  async calculateCompleteness(...) { /* Caching + Berechnung */ }
  // ... 15+ Methoden
}
```

**Soll:** Single-Purpose Use Cases (Command/Query Separation)

```typescript
// ✅ SOLL: Command (Input DTO)
export class CreateEinsatzCommand {
  constructor(
    public readonly stichwort: string,
    public readonly startzeit: Date,
    public readonly address?: {
      street?: string;
      city?: string;
      zip?: string;
    },
    public readonly createdBy: string
  ) {}
}

// ✅ Command Handler (Single Responsibility)
export class CreateEinsatzHandler {
  constructor(
    private readonly repository: IEinsatzRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(command: CreateEinsatzCommand): Promise<Result<EinsatzId>> {
    // 1. Validate & Create Value Objects
    const stichworVo = EinsatzStichwort.create(command.stichwort);
    if (stichworVo.isFailure) {
      return Result.fail(stichworVo.error);
    }

    const creatorId = UserId.create(command.createdBy);
    if (creatorId.isFailure) {
      return Result.fail(creatorId.error);
    }

    let addressVo: Address | undefined;
    if (command.address) {
      const addressResult = Address.create(command.address);
      if (addressResult.isFailure) {
        return Result.fail(addressResult.error);
      }
      addressVo = addressResult.getValue();
    }

    // 2. Create Aggregate (Business Logic hier!)
    const aggregate = EinsatzAggregate.create({
      stichwort: stichworVo.getValue(),
      startzeit: command.startzeit,
      address: addressVo
    }, creatorId.getValue());

    // 3. Persist
    await this.repository.save(aggregate);

    // 4. Publish Domain Events
    await this.eventPublisher.publishAll(aggregate.getUncommittedEvents());
    aggregate.clearEvents();

    return Result.ok(aggregate.id);
  }
}

// ✅ Command: Update Einsatz
export class CompleteEinsatzCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly completedBy: string
  ) {}
}

export class CompleteEinsatzHandler {
  constructor(
    private readonly repository: IEinsatzRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(command: CompleteEinsatzCommand): Promise<Result<void>> {
    // 1. Load Aggregate
    const id = EinsatzId.create(command.einsatzId).getValue();
    const aggregate = await this.repository.findById(id);

    if (!aggregate) {
      return Result.fail('Einsatz not found');
    }

    // 2. Business Logic (im Aggregate!)
    try {
      const userId = UserId.create(command.completedBy).getValue();
      aggregate.complete(userId);
    } catch (error) {
      return Result.fail(error.message);
    }

    // 3. Persist
    await this.repository.save(aggregate);

    // 4. Publish Events
    await this.eventPublisher.publishAll(aggregate.getUncommittedEvents());
    aggregate.clearEvents();

    return Result.ok();
  }
}

// ✅ Query (Separate von Commands - CQRS Light)
export class GetActiveEinsaetzeQuery {
  constructor(
    public readonly userId?: string,
    public readonly status?: string
  ) {}
}

export class GetActiveEinsaetzeHandler {
  constructor(private readonly repository: IEinsatzRepository) {}

  async execute(query: GetActiveEinsaetzeQuery): Promise<EinsatzDto[]> {
    // Build Specification
    let spec: EinsatzSpecification = new ActiveEinsatzSpec();

    if (query.status) {
      const statusVo = EinsatzStatus.fromString(query.status);
      spec = new AndSpec(spec, new EinsatzByStatusSpec(statusVo));
    }

    if (query.userId) {
      const userId = UserId.create(query.userId).getValue();
      spec = new AndSpec(spec, new EinsatzByUserSpec(userId));
    }

    // Fetch from Repository
    const aggregates = await this.repository.findAll(spec);

    // Map to DTO (kein Domain-Leak!)
    return aggregates.map(a => EinsatzMapper.toDto(a));
  }
}

// DTO Mapper (Application Layer)
export class EinsatzMapper {
  static toDto(aggregate: EinsatzAggregate): EinsatzDto {
    return {
      id: aggregate.id.value,
      stichwort: aggregate.stichwort.value,
      status: aggregate.status.value,
      startzeit: aggregate.startzeit,
      address: aggregate.address?.toString(),
      createdBy: aggregate.createdBy.value,
      // ... weitere Felder
    };
  }
}
```

**Weitere Use Cases (Beispiele):**

```typescript
// Commands (Write)
- CreateEinsatzHandler
- UpdateEinsatzHandler
- CompleteEinsatzHandler
- ArchiveEinsatzHandler
- DeleteEinsatzHandler
- AddEtbEintragHandler
- LockEinsatztagebuchHandler
- CreateLagekarteHandler
- AddLagekartePoiHandler

// Queries (Read)
- GetActiveEinsaetzeHandler
- GetEinsatzByIdHandler
- GetEinsatzCompletenessHandler
- GetEinsatztagebuchHandler
- GetLagekarteHandler
- SearchEinsaetzeHandler
```

**Vorteile:**
- ✅ Single Responsibility (ein Handler = eine Operation)
- ✅ Testbar ohne Framework (nur Ports mocken)
- ✅ CQRS Light (Commands vs. Queries getrennt)
- ✅ Business-Logic im Domain Layer, nicht im Handler

**Änderungen:**
- Erstelle `/application/commands/einsatz/` mit Commands + Handlers
- Erstelle `/application/queries/einsatz/` mit Queries + Handlers
- Erstelle `/application/commands/etb/` mit ETB-Handlers
- Erstelle `/application/commands/lagekarte/` mit Lagekarte-Handlers
- Zerlege jeden Service in 5-10 Use Cases

**Aufwand:** 20-30 Stunden (4 Services × 5-10 Use Cases)

---

#### 2.2 Application Ports (Outbound)

**Aktuell:** Direkte Framework-Dependencies

```typescript
// ❌ AKTUELL: Framework-gekoppelt
constructor(
  private readonly httpService: HttpService,  // @nestjs/axios
  private readonly eventEmitter: EventEmitter2,  // @nestjs/event-emitter
  private readonly prisma: PrismaService  // Prisma direkt
) {}
```

**Soll:** Abstrakte Ports (Dependency Inversion)

```typescript
// ✅ SOLL: Application Layer Ports

// 1. Geocoding Port
export interface IGeocodingPort {
  geocode(address: Address): Promise<GeoCoordinate | null>;
  reverseGeocode(coordinate: GeoCoordinate): Promise<Address | null>;
}

// 2. Event Publisher Port (bereits im Domain Layer)
export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}

// 3. Unit of Work Port (Transaktions-Management)
export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  inTransaction<T>(work: () => Promise<T>): Promise<T>;
}

// 4. Cache Port
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// 5. HTTP Client Port (für externe APIs)
export interface IHttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<T>;
  post<T>(url: string, data: any, options?: RequestOptions): Promise<T>;
  put<T>(url: string, data: any, options?: RequestOptions): Promise<T>;
  delete<T>(url: string, options?: RequestOptions): Promise<T>;
}

// 6. Logger Port
export interface ILogger {
  debug(message: string, context?: string): void;
  info(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
}

// 7. Config Port
export interface IConfigService {
  get<T>(key: string): T;
  get<T>(key: string, defaultValue: T): T;
}

// 8. Token Service Port (für JWT)
export interface ITokenService {
  signAccessToken(userId: string): string;
  signRefreshToken(userId: string): string;
  verifyAccessToken(token: string): { userId: string } | null;
  verifyRefreshToken(token: string): { userId: string } | null;
}
```

**Usage im Handler:**

```typescript
// ✅ Handler nutzt nur Ports
export class AddLagekartePoiHandler {
  constructor(
    private readonly repository: ILagekarteRepository,
    private readonly geocodingPort: IGeocodingPort,  // ← Port, nicht Adapter!
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(command: AddLagekartePoiCommand): Promise<Result<void>> {
    // 1. Load Aggregate
    const lagekarte = await this.repository.findById(
      LagekarteId.create(command.lagekarteId).getValue()
    );

    if (!lagekarte) return Result.fail('Lagekarte not found');

    // 2. Geocode Address (via Port!)
    let coordinate: GeoCoordinate | null = null;
    if (command.address) {
      const address = Address.create(command.address).getValue();
      coordinate = await this.geocodingPort.geocode(address);
    }

    // 3. Add POI (Business Logic im Aggregate)
    const poi = LagekartePoi.create({
      name: command.name,
      coordinate: coordinate || command.coordinate,
      type: command.type
    });

    lagekarte.addPoi(poi);

    // 4. Persist & Publish
    await this.repository.save(lagekarte);
    await this.eventPublisher.publishAll(lagekarte.getUncommittedEvents());

    return Result.ok();
  }
}
```

**Vorteile:**
- ✅ Dependency Inversion (High-Level hängt nicht von Low-Level ab)
- ✅ Testbarkeit (Ports einfach mockbar)
- ✅ Austauschbarkeit (Adapter-Implementierung egal)

**Änderungen:**
- Erstelle `/application/ports/` mit allen Outbound Port-Interfaces
- Services nutzen nur noch Ports, keine Implementierungen

**Aufwand:** 4-6 Stunden (8-10 Ports)

---

### 3️⃣ INFRASTRUCTURE LAYER (Adapters erstellen)

#### 3.1 Inbound Adapters (REST Controllers)

**Aktuell:** Controller mit Business-Logic-Kenntnis

```typescript
// ❌ AKTUELL: Controller kennt Service-Details
@Controller('einsatz')
export class EinsatzController {
  constructor(private readonly service: EinsatzService) {}

  @Post()
  async create(
    @Body() dto: CreateEinsatzDto,
    @CurrentUser() user: User
  ) {
    return this.service.create(dto, user.id);
  }
}
```

**Soll:** Thin Controller als Adapter (nur Mapping)

```typescript
// ✅ SOLL: Controller ruft nur Use Case auf
@Controller('einsatz')
@ApiTags('Einsatz')
export class EinsatzController {
  constructor(
    private readonly createHandler: CreateEinsatzHandler,
    private readonly completeHandler: CompleteEinsatzHandler,
    private readonly getActiveHandler: GetActiveEinsaetzeHandler
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Neuen Einsatz erstellen' })
  @ApiResponse({ status: 201, description: 'Einsatz erfolgreich erstellt' })
  async create(
    @Body() dto: CreateEinsatzDto,
    @CurrentUser() user: User
  ): Promise<{ id: string }> {
    // 1. DTO → Command
    const command = new CreateEinsatzCommand(
      dto.stichwort,
      dto.startzeit,
      dto.address,
      user.id
    );

    // 2. Execute Use Case
    const result = await this.createHandler.execute(command);

    // 3. Handle Result
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return { id: result.getValue().value };
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Einsatz abschließen' })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    const command = new CompleteEinsatzCommand(id, user.id);
    const result = await this.completeHandler.execute(command);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aktive Einsätze abrufen' })
  async getActive(
    @Query('status') status?: string,
    @CurrentUser() user?: User
  ): Promise<EinsatzDto[]> {
    const query = new GetActiveEinsaetzeQuery(user?.id, status);
    return this.getActiveHandler.execute(query);
  }
}
```

**DTOs bleiben im Infrastructure Layer:**

```typescript
// DTOs sind API-Contracts (nicht Domain!)
export class CreateEinsatzDto {
  @IsString()
  @IsNotEmpty()
  stichwort: string;

  @IsDate()
  @Type(() => Date)
  startzeit: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

export class AddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/)
  zip?: string;
}
```

**Vorteile:**
- ✅ Controller = Thin Adapter (keine Business-Logic)
- ✅ Use Cases wiederverwendbar (GraphQL, CLI, Message Queue)
- ✅ Testbar (Controller-Tests minimal, Use Case-Tests umfangreich)

**Änderungen:**
- Controller zu Thin Adapters umbauen
- DTOs bleiben im Infrastructure Layer (API-Contracts)
- Controller injiziert Use Cases statt Services

**Aufwand:** 8-10 Stunden (8 Controller umbauen)

---

#### 3.2 Outbound Adapters (Persistence)

**Aktuell:** Repository mit Prisma-Typen

```typescript
// ❌ AKTUELL: Prisma-gekoppelt
export class EinsatzRepository {
  async create(data: Prisma.EinsatzCreateInput): Promise<Einsatz> {
    return this.prisma.einsatz.create({ data });
  }
}
```

**Soll:** Adapter implementiert Port (mit Mapper)

```typescript
// ✅ SOLL: Prisma Adapter (Infrastructure)
@Injectable()
export class PrismaEinsatzRepository implements IEinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(aggregate: EinsatzAggregate): Promise<void> {
    // 1. Domain → Persistence (Mapper)
    const prismaData = PrismaEinsatzMapper.toPersistence(aggregate);

    // 2. Upsert (Create oder Update)
    await this.prisma.einsatz.upsert({
      where: { id: aggregate.id.value },
      create: prismaData,
      update: prismaData
    });
  }

  async findById(id: EinsatzId): Promise<EinsatzAggregate | null> {
    const prismaEinsatz = await this.prisma.einsatz.findUnique({
      where: { id: id.value },
      include: {
        // Load relations if needed
      }
    });

    if (!prismaEinsatz) return null;

    // Persistence → Domain (Mapper)
    return PrismaEinsatzMapper.toDomain(prismaEinsatz);
  }

  async findAll(spec: EinsatzSpecification): Promise<EinsatzAggregate[]> {
    // Specification → Prisma Query
    const where = spec.toPrismaWhere?.() || {};

    const prismaEinsaetze = await this.prisma.einsatz.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return prismaEinsaetze.map(e => PrismaEinsatzMapper.toDomain(e));
  }

  async delete(id: EinsatzId): Promise<void> {
    // Soft Delete
    await this.prisma.einsatz.update({
      where: { id: id.value },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  }

  nextIdentity(): EinsatzId {
    return EinsatzId.generate();
  }
}
```

**Mapper (Domain ↔ Persistence):**

```typescript
// ✅ Mapper (Infrastructure)
export class PrismaEinsatzMapper {
  static toDomain(raw: PrismaEinsatz): EinsatzAggregate {
    // Prisma → Domain (Value Objects!)
    const id = EinsatzId.create(raw.id).getValue();
    const status = EinsatzStatus.fromString(raw.status);
    const stichwort = EinsatzStichwort.create(raw.stichwort).getValue();
    const createdBy = UserId.create(raw.createdBy).getValue();

    let address: Address | undefined;
    if (raw.strasse || raw.ort) {
      address = Address.create({
        street: raw.strasse,
        city: raw.ort,
        zip: raw.plz
      }).getValue();
    }

    // Reconstitute Aggregate (ohne Events zu triggern)
    return EinsatzAggregate.reconstitute({
      id,
      status,
      stichwort,
      address,
      startzeit: raw.startzeit,
      endzeit: raw.endzeit,
      createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    });
  }

  static toPersistence(aggregate: EinsatzAggregate): Prisma.EinsatzCreateInput {
    // Domain → Prisma (Flatten Value Objects!)
    return {
      id: aggregate.id.value,
      status: aggregate.status.value,
      stichwort: aggregate.stichwort.value,
      strasse: aggregate.address?.value.street,
      ort: aggregate.address?.value.city,
      plz: aggregate.address?.value.zip,
      startzeit: aggregate.startzeit,
      endzeit: aggregate.endzeit,
      createdBy: aggregate.createdBy.value,
      createdAt: aggregate.createdAt,
      updatedAt: new Date()
    };
  }
}
```

**Aggregate Reconstitution (für Laden aus DB):**

```typescript
// Im Aggregate: Static Method für Reconstitution
export class EinsatzAggregate {
  // ... existing methods

  // Reconstitute aus DB (ohne Events)
  static reconstitute(data: ReconstitutionData): EinsatzAggregate {
    const aggregate = new EinsatzAggregate(
      data.id,
      data.status,
      data.stichwort,
      data.createdBy
    );

    // Set fields ohne Events zu triggern
    aggregate.address = data.address;
    aggregate.startzeit = data.startzeit;
    aggregate.endzeit = data.endzeit;
    aggregate.createdAt = data.createdAt;
    aggregate.updatedAt = data.updatedAt;

    return aggregate;
  }
}
```

**Vorteile:**
- ✅ Domain Layer komplett unabhängig von Prisma
- ✅ ORM austauschbar (Prisma → TypeORM → In-Memory)
- ✅ Mapper kapselt Mapping-Logic
- ✅ Tests können In-Memory-Repository nutzen

**Änderungen:**
- Erstelle `/infrastructure/persistence/prisma/adapters/` mit Adapter-Implementierungen
- Erstelle `/infrastructure/persistence/prisma/mappers/` mit Domain ↔ Persistence Mappern
- Alle 5 Repositories zu Adapters umbauen

**Aufwand:** 12-16 Stunden (5 Repositories × 2-3h)

---

#### 3.3 Outbound Adapters (External Services)

**Aktuell:** Service nutzt direkt HttpService

```typescript
// ❌ AKTUELL: Framework-gekoppelt
export class GeocodingService {
  constructor(private readonly httpService: HttpService) {}

  async geocodeAddress(address: string): Promise<...> {
    const response = await firstValueFrom(
      this.httpService.get(url).pipe(...)
    );
  }
}
```

**Soll:** Adapter implementiert Port

```typescript
// ✅ SOLL: Nominatim Geocoding Adapter
@Injectable()
export class NominatimGeocodingAdapter implements IGeocodingPort {
  private readonly baseUrl: string;

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly config: IConfigService,
    private readonly logger: ILogger
  ) {
    this.baseUrl = this.config.get('NOMINATIM_API_URL',
      'https://nominatim.openstreetmap.org');
  }

  async geocode(address: Address): Promise<GeoCoordinate | null> {
    const url = this.buildGeocodeUrl(address);

    try {
      const response = await this.httpClient.get<NominatimResponse[]>(url);

      if (response.length === 0) {
        this.logger.warn(`No results for address: ${address.toString()}`);
        return null;
      }

      return this.mapToGeoCoordinate(response[0]);
    } catch (error) {
      if (error.statusCode === 429) {
        throw new RateLimitExceededError('Nominatim rate limit exceeded');
      }

      this.logger.error(`Geocoding failed: ${error.message}`);
      return null;
    }
  }

  async reverseGeocode(coordinate: GeoCoordinate): Promise<Address | null> {
    const url = this.buildReverseGeocodeUrl(coordinate);

    try {
      const response = await this.httpClient.get<NominatimResponse>(url);
      return this.mapToAddress(response);
    } catch (error) {
      this.logger.error(`Reverse geocoding failed: ${error.message}`);
      return null;
    }
  }

  private buildGeocodeUrl(address: Address): string {
    const params = new URLSearchParams({
      format: 'json',
      q: address.toString(),
      limit: '1'
    });
    return `${this.baseUrl}/search?${params}`;
  }

  private buildReverseGeocodeUrl(coordinate: GeoCoordinate): string {
    const params = new URLSearchParams({
      format: 'json',
      lat: coordinate.value.lat.toString(),
      lon: coordinate.value.lng.toString()
    });
    return `${this.baseUrl}/reverse?${params}`;
  }

  private mapToGeoCoordinate(response: NominatimResponse): GeoCoordinate {
    return GeoCoordinate.create(
      parseFloat(response.lat),
      parseFloat(response.lon)
    ).getValue();
  }

  private mapToAddress(response: NominatimResponse): Address {
    return Address.create({
      street: response.address?.road,
      city: response.address?.city || response.address?.town,
      zip: response.address?.postcode,
      country: response.address?.country
    }).getValue();
  }
}

// HTTP Client Adapter (Wrapper um @nestjs/axios)
@Injectable()
export class NestHttpClientAdapter implements IHttpClient {
  constructor(private readonly httpService: HttpService) {}

  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.get(url, options).pipe(
        catchError((error) => {
          throw new HttpException(error.message, error.response?.status || 500);
        })
      )
    );
    return response.data;
  }

  async post<T>(url: string, data: any, options?: RequestOptions): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.post(url, data, options)
    );
    return response.data;
  }

  // ... put, delete
}
```

**Alternative Adapter (austauschbar!):**

```typescript
// ✅ Axios Adapter (direkt, ohne NestJS)
export class AxiosHttpClientAdapter implements IHttpClient {
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const response = await axios.get(url, options);
    return response.data;
  }

  // ... post, put, delete
}

// ✅ Fetch Adapter (native)
export class FetchHttpClientAdapter implements IHttpClient {
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: options?.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  // ... post, put, delete
}
```

**Vorteile:**
- ✅ Framework-unabhängig (austauschbar)
- ✅ Adapter-Pattern ermöglicht Test-Doubles
- ✅ Error-Handling zentral im Adapter
- ✅ Rate-Limiting kann im Adapter implementiert werden

**Änderungen:**
- Erstelle `/infrastructure/external/nominatim/` mit Nominatim Adapter
- Erstelle `/infrastructure/http/` mit HTTP Client Adapters
- Alle externe Integrations-Punkte zu Adapters umbauen

**Aufwand:** 6-8 Stunden (3 externe Services)

---

#### 3.4 Outbound Adapters (Event Bus)

**Aktuell:** EventEmitter2 direkt genutzt

```typescript
// ❌ AKTUELL: Framework-gebunden
this.eventEmitter.emit('einsatz.erstellt', event);

@OnEvent('einsatz.erstellt')
async handleEinsatzErstellt(event: EinsatzErstelltEvent) { ... }
```

**Soll:** Event Bus Adapter (austauschbar)

```typescript
// ✅ SOLL: NestJS Event Bus Adapter
@Injectable()
export class NestEventBusAdapter implements IEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    // Map Domain Event → NestJS Event (type-safe!)
    this.eventEmitter.emit(event.eventName(), event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

// Event Handler Adapter
@Injectable()
export class EinsatzCreatedEventHandler {
  constructor(
    private readonly createEtbHandler: CreateEinsatztagebuchHandler,
    private readonly createLagekarteHandler: CreateLagekarteHandler,
    private readonly logger: ILogger
  ) {}

  @OnEvent('EinsatzCreated')  // Type-safe event name!
  async handle(event: EinsatzCreatedEvent): Promise<void> {
    this.logger.info(`Handling EinsatzCreated: ${event.aggregateId}`);

    try {
      // Trigger ETB Creation
      await this.createEtbHandler.execute(
        new CreateEinsatztagebuchCommand(event.aggregateId)
      );

      // Trigger Lagekarte Creation (lazy, nur wenn benötigt)
      // ... optional

    } catch (error) {
      this.logger.error(
        `Failed to handle EinsatzCreated: ${error.message}`,
        error.stack
      );
      // TODO: Dead Letter Queue für manuelle Nachbearbeitung
    }
  }
}
```

**Alternative Adapter (RabbitMQ):**

```typescript
// ✅ RabbitMQ Adapter (austauschbar!)
@Injectable()
export class RabbitMqEventBusAdapter implements IEventPublisher {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly config: IConfigService
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const exchange = this.config.get('RABBITMQ_EXCHANGE', 'domain-events');

    await this.amqpConnection.publish(
      exchange,
      event.eventName(),  // Routing Key
      {
        eventId: event.eventId,
        occurredAt: event.occurredAt,
        aggregateId: event.aggregateId,
        payload: event
      }
    );
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

// RabbitMQ Subscriber
@Injectable()
export class RabbitMqEventSubscriber {
  constructor(
    private readonly handlers: Map<string, IEventHandler<any>>
  ) {}

  @RabbitSubscribe({
    exchange: 'domain-events',
    routingKey: 'EinsatzCreated',
    queue: 'etb-creation-queue'
  })
  async handleEinsatzCreated(msg: any): Promise<void> {
    const event = new EinsatzCreatedEvent(
      msg.aggregateId,
      msg.payload.createdBy,
      msg.payload.stichwort
    );

    const handler = this.handlers.get('EinsatzCreated');
    if (handler) {
      await handler.handle(event);
    }
  }
}
```

**Transactional Outbox Pattern (Optional, für garantierte Delivery):**

```typescript
// ✅ Outbox Pattern für garantierte Event-Delivery
@Injectable()
export class OutboxEventBusAdapter implements IEventPublisher {
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: DomainEvent): Promise<void> {
    // Events in DB speichern statt sofort publishen
    await this.prisma.outboxEvent.create({
      data: {
        eventId: event.eventId,
        eventName: event.eventName(),
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        payload: JSON.stringify(event),
        status: 'PENDING'
      }
    });
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await this.prisma.outboxEvent.createMany({
      data: events.map(e => ({
        eventId: e.eventId,
        eventName: e.eventName(),
        aggregateId: e.aggregateId,
        occurredAt: e.occurredAt,
        payload: JSON.stringify(e),
        status: 'PENDING'
      }))
    });
  }
}

// Polling Worker (separate Process)
@Injectable()
export class OutboxEventPoller {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realEventBus: IEventPublisher  // RabbitMQ oder NestJS
  ) {}

  @Cron('*/5 * * * * *')  // Alle 5 Sekunden
  async pollAndPublish(): Promise<void> {
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 100,
      orderBy: { occurredAt: 'asc' }
    });

    for (const outboxEvent of pendingEvents) {
      try {
        // Reconstruct Domain Event
        const event = JSON.parse(outboxEvent.payload);

        // Publish via real Event Bus
        await this.realEventBus.publish(event);

        // Mark as published
        await this.prisma.outboxEvent.update({
          where: { id: outboxEvent.id },
          data: { status: 'PUBLISHED', publishedAt: new Date() }
        });
      } catch (error) {
        // Retry-Logic (exponential backoff)
        await this.prisma.outboxEvent.update({
          where: { id: outboxEvent.id },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
            lastError: error.message
          }
        });
      }
    }
  }
}
```

**Vorteile:**
- ✅ Framework-unabhängig (NestJS → RabbitMQ austauschbar)
- ✅ Type-Safe Events
- ✅ Outbox Pattern für garantierte Delivery (optional)
- ✅ Retry-Mechanismus

**Änderungen:**
- Erstelle `/infrastructure/events/adapters/` mit Event Bus Adapters
- NestJS EventEmitter als Default, RabbitMQ optional
- Outbox Pattern optional für kritische Events

**Aufwand:** 4-6 Stunden (Basic), +6-8h für Outbox Pattern

---

### 4️⃣ DEPENDENCY INJECTION (NestJS Modules anpassen)

**Aktuell:** Direkte Service-Injektionen

```typescript
@Module({
  providers: [EinsatzService, EinsatzRepository],
  exports: [EinsatzService]
})
export class EinsatzModule {}
```

**Soll:** Ports & Adapters registrieren (Dependency Inversion)

```typescript
// ✅ SOLL: Ports zu Adapters binden
@Module({
  imports: [PrismaModule],
  providers: [
    // Command Handlers (Application Layer)
    CreateEinsatzHandler,
    CompleteEinsatzHandler,
    ArchiveEinsatzHandler,

    // Query Handlers (Application Layer)
    GetActiveEinsaetzeHandler,
    GetEinsatzByIdHandler,

    // Domain Services
    EinsatzNamingService,
    EinsatzCompletenessService,

    // Repository (bind Interface → Implementation)
    {
      provide: 'IEinsatzRepository',
      useClass: PrismaEinsatzRepository
    },

    // Event Publisher
    {
      provide: 'IEventPublisher',
      useClass: NestEventBusAdapter
    },

    // Geocoding Service
    {
      provide: 'IGeocodingPort',
      useClass: NominatimGeocodingAdapter
    },

    // HTTP Client
    {
      provide: 'IHttpClient',
      useClass: NestHttpClientAdapter
    },

    // Cache Service
    {
      provide: 'ICacheService',
      useClass: NestCacheAdapter
    },

    // Logger
    {
      provide: 'ILogger',
      useClass: NestLoggerAdapter
    }
  ],
  controllers: [EinsatzController],
  exports: [
    'IEinsatzRepository',
    CreateEinsatzHandler,
    CompleteEinsatzHandler,
    GetActiveEinsaetzeHandler
  ]
})
export class EinsatzModule {}
```

**Custom Injection Tokens (Alternative zu Strings):**

```typescript
// ✅ Type-Safe Injection Tokens
export const EINSATZ_REPOSITORY = Symbol('IEinsatzRepository');
export const EVENT_PUBLISHER = Symbol('IEventPublisher');
export const GEOCODING_PORT = Symbol('IGeocodingPort');

// Usage im Module
{
  provide: EINSATZ_REPOSITORY,
  useClass: PrismaEinsatzRepository
}

// Usage im Handler
constructor(
  @Inject(EINSATZ_REPOSITORY) private readonly repository: IEinsatzRepository,
  @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher
) {}
```

**Vorteile:**
- ✅ Dependency Inversion Principle
- ✅ Austauschbar (Adapter-Implementierung in Module wählen)
- ✅ Testbar (Test-Module mit Mock-Adapters)

**Änderungen:**
- Alle Module zu Port/Adapter-Bindings umbauen
- String-Tokens oder Custom Injection Tokens nutzen

**Aufwand:** 6-8 Stunden (7 Module)

---

## 📊 AUFWANDS-SCHÄTZUNG & MIGRATION-STRATEGIE

### Gesamtaufwand: **120-160 Stunden** (~3-4 Wochen Vollzeit)

| Phase | Komponente | Aufwand | Priorität |
|-------|-----------|---------|-----------|
| **Phase 1** | Domain Layer - Aggregates | 16-20h | 🔴 KRITISCH |
| **Phase 1** | Domain Layer - Value Objects | 12-16h | 🔴 KRITISCH |
| **Phase 1** | Domain Layer - Domain Events | 6-8h | 🔴 KRITISCH |
| **Phase 1** | Domain Layer - Domain Services | 4-6h | 🟢 MITTEL |
| **Phase 1** | Domain Layer - Repository Interfaces | 4-6h | 🟡 HOCH |
| **Phase 2** | Application Layer - Use Cases | 20-30h | 🔴 KRITISCH |
| **Phase 2** | Application Layer - Ports | 4-6h | 🔴 KRITISCH |
| **Phase 3** | Infrastructure - Persistence Adapters | 12-16h | 🟡 HOCH |
| **Phase 3** | Infrastructure - Inbound Adapters | 8-10h | 🟡 HOCH |
| **Phase 3** | Infrastructure - External Adapters | 6-8h | 🟡 HOCH |
| **Phase 4** | Infrastructure - Event Bus Adapter | 4-6h | 🟡 HOCH |
| **Phase 4** | Dependency Injection refactor | 6-8h | 🟡 HOCH |
| **Phase 5** | Testing & Cleanup | 12-16h | 🟢 MITTEL |

**Total:** 120-160 Stunden

---

## 🚀 MIGRATION-STRATEGIE: Strangler Fig Pattern

**Empfehlung:** Nicht Big-Bang Rewrite, sondern **inkrementelle Transformation**.

### Warum Strangler Fig?

- ✅ Produktions-System bleibt lauffähig
- ✅ Continuous Delivery möglich
- ✅ Lernkurve wird flacher (Team lernt iterativ)
- ✅ Rollback jederzeit möglich
- ✅ Business Value kontinuierlich liefern

### Schritt 1: **Parallel Domain Layer aufbauen** (Woche 1)

**Ziel:** Domain Layer komplett neu, OHNE existierenden Code zu ändern.

**Tasks:**
1. Erstelle `/domain/` Ordner-Struktur
2. Implementiere alle Aggregates (Einsatz, ETB, Lagekarte, User)
3. Implementiere alle Value Objects (15-20 VOs)
4. Implementiere alle Domain Events (15-20 Events)
5. Implementiere Domain Services (3-5 Services)
6. Implementiere Repository-Interfaces (5 Interfaces)

**Deliverable:** `/domain/` Ordner vollständig, keine Änderung an existierendem Code.

**Testing:** Unit-Tests für alle Domain-Components (kein Framework nötig!).

---

### Schritt 2: **Einen Bounded Context migrieren** (Woche 2)

**Start mit kleinstem Context:** Lagekarte

**Warum Lagekarte?**
- ✅ Kleinste Module (~1,800 Zeilen)
- ✅ Isoliert (wenig Cross-Context-Dependencies)
- ✅ Klare Aggregate-Grenzen
- ✅ Geocoding-Integration gut abgrenzbar

**Tasks:**
1. Erstelle Application Layer für Lagekarte
   - Commands: `CreateLagekarteHandler`, `AddPoiHandler`
   - Queries: `GetLagekarteHandler`, `GetPoisHandler`
2. Erstelle Infrastructure Adapters
   - `PrismaLagekarteRepository` (implementiert `ILagekarteRepository`)
   - `PrismaLagekarteMapper` (Domain ↔ Persistence)
   - `NominatimGeocodingAdapter` (implementiert `IGeocodingPort`)
3. Refactor Controller
   - `LagekarteController` nutzt Use Cases statt Service
4. **WICHTIG:** Alter `LagekarteService` bleibt, wird aber intern von Adapters genutzt
5. NestJS Module umbauen (Ports/Adapters registrieren)

**Testing:** Integration-Tests für Lagekarte mit neuem Stack.

**Deliverable:** Lagekarte läuft mit Hexagonal Architecture, Rest unverändert.

**Rollback:** Einfach (Controller wieder auf alten Service umstellen).

---

### Schritt 3: **Zweiten Context migrieren** (Woche 3)

**Nächster Context:** ETB (Einsatztagebuch)

**Warum ETB?**
- ✅ Komplexer als Lagekarte (gute Lernkurve)
- ✅ Event-driven (gutes Testing für Event-System)
- ✅ Versionierung (gutes Testing für komplexe Business-Logic)

**Tasks:**
1. Application Layer für ETB (7-10 Use Cases)
2. Infrastructure Adapters für ETB
3. Event Handlers für `EinsatzCreatedEvent` (Auto-Creation ETB)
4. Controller Refactoring
5. NestJS Module

**Testing:** Integration-Tests, Event-Handler-Tests.

**Deliverable:** 2/4 Contexts migriert.

---

### Schritt 4: **Hauptcontext migrieren** (Woche 4)

**Größter Context:** Einsatz

**Tasks:**
1. Application Layer für Einsatz (10-15 Use Cases)
2. Infrastructure Adapters
3. Event Publishing für `EinsatzCreated`, `EinsatzCompleted`, etc.
4. Controller Refactoring
5. Domain Services Integration (Naming, Completeness)

**Parallel:** Auth Context (klein)

**Deliverable:** Alle 4 Contexts migriert.

---

### Schritt 5: **Cleanup & Refactoring** (Woche 5, optional)

**Tasks:**
1. Alte Services löschen
2. Tests auf neuen Stack migrieren
3. Dokumentation aktualisieren (arc42)
4. Performance-Optimierungen (Caching, N+1 Queries)
5. Outbox Pattern implementieren (optional)

---

## 🎯 VORTEILE DER TRANSFORMATION

### 1. Wartbarkeit ✅

**Aktuell:**
- Services haben 5+ Verantwortlichkeiten
- Business-Logic verstreut in Services, Utils, Repositories
- Framework-Code vermischt mit Business-Logic

**Nach Hexagonal + DDD:**
- ✅ **Klar getrennte Schichten:** Änderungen in einem Layer beeinflussen andere nicht
- ✅ **Business-Logic zentral:** Alle Regeln in Aggregates
- ✅ **Single Responsibility:** Ein Handler = eine Operation

**Beispiel:** Status-Transition-Logik von 3 Orten → 1 Ort (EinsatzAggregate)

---

### 2. Testbarkeit ✅

**Aktuell:**
- Unit-Tests benötigen NestJS Test-Framework
- Repository-Tests benötigen Prisma-Mocks
- Service-Tests haben viele Dependencies

**Nach Hexagonal + DDD:**
- ✅ **Domain Logic ohne Framework testbar:** Pure TypeScript, <1ms
- ✅ **Use Cases isoliert testbar:** Nur Ports mocken
- ✅ **Integration-Tests klar abgegrenzt:** Adapters separat testen

**Beispiel:**
```typescript
// ✅ Domain Test (kein Framework!)
test('Einsatz cannot be archived if not completed', () => {
  const einsatz = EinsatzAggregate.create(...);

  expect(() => einsatz.archive(userId))
    .toThrow(EinsatzNotArchivableError);
});
```

---

### 3. Framework-Unabhängigkeit ✅

**Aktuell:**
- NestJS-Decorators in 45+ Dateien
- Prisma-Typen in 37+ Dateien
- Migration zu anderem Framework nahezu unmöglich

**Nach Hexagonal + DDD:**
- ✅ **Domain Layer komplett framework-agnostisch**
- ✅ **Application Layer nur Ports, keine Implementierungen**
- ✅ **Infrastructure Layer austauschbar:** NestJS → Express, Fastify, etc.

**Beispiel:** Prisma → TypeORM = nur Adapter ändern, Domain bleibt unberührt.

---

### 4. Skalierbarkeit ✅

**Aktuell:**
- Monolith mit 7 Modulen
- Keine klare Bounded Context-Trennung
- Cross-Context-Dependencies überall

**Nach Hexagonal + DDD:**
- ✅ **Bounded Contexts klar definiert:** Jeder Context ist eigenständig
- ✅ **Event-driven Communication:** Asynchrone Kommunikation möglich
- ✅ **Microservice-ready:** Jeder Context kann separater Service werden

**Beispiel:** ETB-Context als separater Service deployen = nur Event-Integration ändern.

---

### 5. Business-Alignment ✅

**Aktuell:**
- Domain-Logic verstreut in DTOs, Services, Utils
- Fachbegriffe vermischt mit Technical Terms
- Ubiquitous Language nicht konsistent

**Nach Hexagonal + DDD:**
- ✅ **Ubiquitous Language im Code:** `EinsatzAggregate.complete()`, nicht `setStatus()`
- ✅ **Business-Rules zentral:** Alle Regeln in Aggregates
- ✅ **Domain Events tracken Änderungen:** `EinsatzCompletedEvent`

**Beispiel:** Nicht-Techniker können Domain-Code verstehen.

---

### 6. Technische Schulden reduzieren ✅

**Aktuell:**
- Leaky Abstractions (Prisma-Typen durchsickern)
- God Services
- String-basierte Events
- Keine Transactional Outbox

**Nach Hexagonal + DDD:**
- ✅ **Keine Leaky Abstractions:** Mapper kapseln
- ✅ **Single Responsibility:** Use Cases statt God Services
- ✅ **Type-Safe Events:** Typisierte Domain Events
- ✅ **Optional Transactional Outbox:** Garantierte Event-Delivery

---

## ⚠️ RISIKEN & HERAUSFORDERUNGEN

### 1. Lernkurve (MITTEL)

**Problem:**
- Team muss DDD-Konzepte lernen (Aggregates, Value Objects, Domain Events)
- Hexagonal Architecture Pattern ist neu
- Mehr Boilerplate (Mapper, Commands, Handlers)

**Mitigation:**
- ✅ Training vor Start (2-3 Tage)
- ✅ Pair Programming während Migration
- ✅ Code Reviews mit Fokus auf Patterns
- ✅ Dokumentation & Beispiele

**Aufwand:** 2-3 Tage Training + 1 Woche Einarbeitungszeit

---

### 2. Migration-Komplexität (HOCH)

**Problem:**
- Datenbank-Modell muss nicht ändern, aber Mapper komplex
- Event-Handling muss kompatibel bleiben (alte Events → neue Handlers)
- Zwei Code-Stile parallel (während Migration)

**Mitigation:**
- ✅ **Strangler Fig Pattern:** Inkrementelle Migration, kein Big-Bang
- ✅ **Feature Flags:** Neue Architektur per Flag aktivieren/deaktivieren
- ✅ **Comprehensive Testing:** Integration-Tests für beide Stile

**Aufwand:** Strangler Fig reduziert Risiko erheblich

---

### 3. Performance-Overhead (GERING)

**Problem:**
- Zusätzliche Mapper-Schicht (Domain ↔ Persistence)
- Mehr Objekt-Instanzen (Value Objects statt Primitives)
- Event-Handling mit Outbox Pattern (extra DB-Calls)

**Mitigation:**
- ✅ **Benchmarking:** Performance-Tests vor/nach Migration
- ✅ **Caching-Strategie:** Repository-Caching, Query-Caching
- ✅ **Lazy Loading:** Aggregates nur laden wenn nötig
- ✅ **Profiling:** Hotspots identifizieren und optimieren

**Reality-Check:** Mapper-Overhead < 1ms, vernachlässigbar bei I/O-Operationen.

---

### 4. Over-Engineering Gefahr (MITTEL)

**Problem:**
- Für kleine Features zu viel Boilerplate (Command, Handler, Mapper)
- Versuchung, alles als Aggregate zu modellieren

**Mitigation:**
- ✅ **Pragmatisch bleiben:** Nicht jede Kleinigkeit als Aggregate
- ✅ **CRUD-Shortcuts:** Einfache CRUD-Operationen können direkten Zugriff haben
- ✅ **Cost-Benefit-Analyse:** Nur komplexe Business-Logic als DDD

**Regel:** Wenn keine Business-Regeln → CRUD reicht, kein Aggregate nötig.

---

### 5. Team-Akzeptanz (MITTEL)

**Problem:**
- Team könnte neue Architektur als zu komplex empfinden
- "Das haben wir schon immer so gemacht"-Mentalität

**Mitigation:**
- ✅ **Stakeholder einbinden:** Erklären, warum Migration wichtig ist
- ✅ **Quick Wins zeigen:** Testbarkeit, Framework-Unabhängigkeit
- ✅ **Schrittweise Migration:** Nicht alles auf einmal

---

## 🔍 KONKRETE BEISPIEL-TRANSFORMATION

### Vorher (Aktuell): 3-Tier

```typescript
// ❌ AKTUELL: Controller
@Controller('einsatz')
export class EinsatzController {
  constructor(private readonly service: EinsatzService) {}

  @Post()
  async create(@Body() dto: CreateEinsatzDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }
}

// ❌ AKTUELL: Service (God Service)
@Injectable()
export class EinsatzService {
  constructor(
    private readonly repository: EinsatzRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateEinsatzDto, userId: string): Promise<EinsatzResponseDto> {
    // Validation (sollte Domain sein!)
    if (!dto.stichwort || dto.stichwort.length === 0) {
      throw new BadRequestException('Stichwort required');
    }

    // Prisma-Typen durchsickern
    const einsatz = await this.repository.create({
      stichwort: dto.stichwort,
      status: EinsatzStatus.ANGELEGT,
      createdBy: userId,
      strasse: dto.address?.street,
      ort: dto.address?.city,
      plz: dto.address?.zip,
      startzeit: dto.startzeit || new Date()
    });

    // String-basierte Events
    this.eventEmitter.emit('einsatz.erstellt',
      new EinsatzErstelltEvent(einsatz.id, userId));

    // Mapping (sollte Mapper sein!)
    return this.toResponseDto(einsatz);
  }

  private async toResponseDto(einsatz: Einsatz): Promise<EinsatzResponseDto> {
    const name = EinsatzNameGenerator.generate(einsatz);
    return { ...einsatz, name };
  }
}

// ❌ AKTUELL: Repository (Leaky)
export class EinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EinsatzCreateInput): Promise<Einsatz> {
    return this.prisma.einsatz.create({ data });
  }
}
```

---

### Nachher (Hexagonal + DDD):

```typescript
// ✅ NACH: Controller (Thin Adapter)
@Controller('einsatz')
export class EinsatzController {
  constructor(private readonly createHandler: CreateEinsatzHandler) {}

  @Post()
  async create(@Body() dto: CreateEinsatzDto, @CurrentUser() user: User) {
    const command = new CreateEinsatzCommand(
      dto.stichwort,
      dto.startzeit,
      dto.address,
      user.id
    );

    const result = await this.createHandler.execute(command);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return { id: result.getValue().value };
  }
}

// ✅ NACH: Command Handler (Application Layer)
export class CreateEinsatzHandler {
  constructor(
    @Inject('IEinsatzRepository') private readonly repository: IEinsatzRepository,
    @Inject('IEventPublisher') private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(command: CreateEinsatzCommand): Promise<Result<EinsatzId>> {
    // 1. Validation via Value Objects (Domain!)
    const stichworVo = EinsatzStichwort.create(command.stichwort);
    if (stichworVo.isFailure) {
      return Result.fail(stichworVo.error);
    }

    const creatorId = UserId.create(command.createdBy);
    if (creatorId.isFailure) {
      return Result.fail(creatorId.error);
    }

    let addressVo: Address | undefined;
    if (command.address) {
      const addressResult = Address.create(command.address);
      if (addressResult.isFailure) {
        return Result.fail(addressResult.error);
      }
      addressVo = addressResult.getValue();
    }

    // 2. Create Aggregate (Business Logic!)
    const aggregate = EinsatzAggregate.create({
      stichwort: stichworVo.getValue(),
      startzeit: command.startzeit || new Date(),
      address: addressVo
    }, creatorId.getValue());

    // 3. Persist (via Port!)
    await this.repository.save(aggregate);

    // 4. Publish Domain Events (Type-Safe!)
    await this.eventPublisher.publishAll(aggregate.getUncommittedEvents());
    aggregate.clearEvents();

    return Result.ok(aggregate.id);
  }
}

// ✅ NACH: Aggregate (Domain Layer - Rich Model)
export class EinsatzAggregate {
  private constructor(
    private readonly id: EinsatzId,
    private status: EinsatzStatus,
    private readonly stichwort: EinsatzStichwort,
    private readonly address: Address | undefined,
    private readonly startzeit: Date,
    private readonly createdBy: UserId,
    private readonly events: DomainEvent[] = []
  ) {}

  static create(data: CreateEinsatzData, creator: UserId): EinsatzAggregate {
    // Business-Rule: Startzeit nicht in Zukunft
    if (data.startzeit > new Date()) {
      throw new EinsatzInFutureNotAllowedError();
    }

    const aggregate = new EinsatzAggregate(
      EinsatzId.generate(),
      EinsatzStatus.ANGELEGT,
      data.stichwort,
      data.address,
      data.startzeit,
      creator
    );

    // Domain Event (Type-Safe!)
    aggregate.addEvent(new EinsatzCreatedEvent(
      aggregate.id.value,
      creator.value,
      data.stichwort.value
    ));

    return aggregate;
  }

  complete(completedBy: UserId): void {
    // Business-Rule: State Transition
    if (!this.status.canTransitionTo(EinsatzStatus.ABGESCHLOSSEN)) {
      throw new InvalidStatusTransitionError(this.status, EinsatzStatus.ABGESCHLOSSEN);
    }

    this.status = EinsatzStatus.ABGESCHLOSSEN;
    this.addEvent(new EinsatzCompletedEvent(this.id.value, completedBy.value));
  }

  // ... weitere Business-Methoden
}

// ✅ NACH: Repository Adapter (Infrastructure)
@Injectable()
export class PrismaEinsatzRepository implements IEinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(aggregate: EinsatzAggregate): Promise<void> {
    // Domain → Persistence (Mapper!)
    const prismaData = PrismaEinsatzMapper.toPersistence(aggregate);

    await this.prisma.einsatz.upsert({
      where: { id: aggregate.id.value },
      create: prismaData,
      update: prismaData
    });
  }

  async findById(id: EinsatzId): Promise<EinsatzAggregate | null> {
    const prismaEinsatz = await this.prisma.einsatz.findUnique({
      where: { id: id.value }
    });

    if (!prismaEinsatz) return null;

    // Persistence → Domain (Mapper!)
    return PrismaEinsatzMapper.toDomain(prismaEinsatz);
  }
}

// ✅ NACH: Mapper (Infrastructure)
export class PrismaEinsatzMapper {
  static toPersistence(aggregate: EinsatzAggregate): Prisma.EinsatzCreateInput {
    return {
      id: aggregate.id.value,
      status: aggregate.status.value,
      stichwort: aggregate.stichwort.value,
      strasse: aggregate.address?.value.street,
      ort: aggregate.address?.value.city,
      plz: aggregate.address?.value.zip,
      startzeit: aggregate.startzeit,
      createdBy: aggregate.createdBy.value,
      createdAt: aggregate.createdAt
    };
  }

  static toDomain(raw: PrismaEinsatz): EinsatzAggregate {
    const id = EinsatzId.create(raw.id).getValue();
    const status = EinsatzStatus.fromString(raw.status);
    const stichwort = EinsatzStichwort.create(raw.stichwort).getValue();
    const createdBy = UserId.create(raw.createdBy).getValue();

    let address: Address | undefined;
    if (raw.strasse || raw.ort) {
      address = Address.create({
        street: raw.strasse,
        city: raw.ort,
        zip: raw.plz
      }).getValue();
    }

    return EinsatzAggregate.reconstitute({
      id, status, stichwort, address,
      startzeit: raw.startzeit,
      createdBy,
      createdAt: raw.createdAt
    });
  }
}
```

---

## 📋 ENTSCHEIDUNGS-CHECKLISTE

**Sollte Bluelight-Hub zu Hexagonaler Architektur + DDD migrieren?**

| Kriterium | Bewertung | Begründung |
|-----------|-----------|------------|
| **Team-Größe** | ✅ JA | 2+ Entwickler profitieren von klarer Struktur |
| **Langfristigkeit** | ✅ JA | 10-Jahre-Archivierung = Langzeit-Projekt |
| **Komplexität** | ✅ JA | 4 Bounded Contexts mit komplexen Business-Rules |
| **Wartbarkeit-Problem** | ✅ JA | Aktuelle Kopplung erschwert Änderungen |
| **Framework-Lock-in** | ✅ JA | Starke NestJS/Prisma-Kopplung ist Risiko |
| **Testing-Problem** | ✅ JA | Domain Logic aktuell schwer testbar ohne Framework |
| **Microservices geplant?** | ⚠️ VIELLEICHT | Falls ja, Hexagonal ist Vorbedingung |
| **Business-Regeln ändern häufig?** | ✅ JA | DRK-Anforderungen ändern sich |
| **Zeit verfügbar?** | ⚠️ KRITISCH | 3-4 Wochen Vollzeit-Aufwand |
| **Budget verfügbar?** | ⚠️ KRITISCH | Keine neuen Features während Migration |

**Bewertung:** 8/10 Kriterien sprechen FÜR Migration

**Empfehlung:** ✅ **JA, aber inkrementell mit Strangler Fig Pattern**

---

## 🎓 NÄCHSTE SCHRITTE

### Option A: Migration starten (Empfohlen)

1. **Training** (2-3 Tage)
   - DDD Grundlagen (Aggregates, Value Objects, Domain Events)
   - Hexagonal Architecture Pattern
   - Strangler Fig Migration-Pattern

2. **Pilot-Projekt** (1 Woche)
   - Lagekarte-Context als Proof-of-Concept
   - Validierung der Architektur-Entscheidungen
   - Team-Feedback sammeln

3. **Go/No-Go Entscheidung**
   - Pilot erfolgreich? → Weiter mit vollständiger Migration
   - Pilot problematisch? → Anpassungen oder Abbruch

4. **Vollständige Migration** (3-4 Wochen)
   - Strangler Fig Pattern wie beschrieben
   - Woche 1: Domain Layer
   - Woche 2-4: Contexts migrieren
   - Woche 5: Cleanup

---

### Option B: Selektive Verbesserungen (Kompromiss)

Falls vollständige Migration zu aufwändig, selektiv verbessern:

1. **Quick Wins umsetzen** (1 Woche)
   - Repository-Abstractions (keine Prisma-Typen mehr durchsickern)
   - Value Objects für kritische Typen (Status, IDs)
   - Event-Typisierung (keine Magic Strings mehr)

2. **God Services auflösen** (2 Wochen)
   - Services in Use Cases zerlegen
   - Single Responsibility etablieren

3. **Keine vollständige Hexagonal Architecture**
   - Domain Layer nur teilweise (Value Objects, Events)
   - Application Layer als Use Cases
   - Infrastructure Layer bleibt wie ist

**Aufwand:** 3 Wochen statt 4-5 Wochen
**Benefit:** 60% der Vorteile, 40% weniger Aufwand

---

### Option C: Status Quo beibehalten (Nicht empfohlen)

Falls Migration nicht durchführbar:

1. **Technische Schulden dokumentieren**
   - Framework-Kopplung als Risiko markieren
   - Testing-Probleme dokumentieren

2. **Minimalverbesserungen**
   - Code Reviews schärfer (neue God Services verhindern)
   - Tests wo möglich verbessern

3. **Exit-Strategie vorbereiten**
   - Bei nächster großer Änderung Migration neu evaluieren

---

## 📚 RESSOURCEN & LITERATUR

### DDD (Domain-Driven Design)

- **Buch:** "Domain-Driven Design" von Eric Evans (Original, 2003)
- **Buch:** "Implementing Domain-Driven Design" von Vaughn Vernon (Praxisnah)
- **Artikel:** Martin Fowler - "Anemic Domain Model" (Anti-Pattern)

### Hexagonal Architecture

- **Original:** Alistair Cockburn - "Hexagonal Architecture" (2005)
- **Artikel:** Netflix Tech Blog - "Ready for changes with Hexagonal Architecture"
- **Buch:** "Get Your Hands Dirty on Clean Architecture" von Tom Hombergs

### Strangler Fig Pattern

- **Original:** Martin Fowler - "StranglerFigApplication" (Pattern)
- **Artikel:** Sam Newman - "Monolith to Microservices" (Buch, Kapitel 3)

### CQRS & Event Sourcing

- **Buch:** "Versioning in an Event Sourced System" von Greg Young
- **Artikel:** Microsoft - "CQRS Journey" (Patterns & Practices)

---

## 🏁 FAZIT

Die aktuelle 3-Tier-Architektur von Bluelight-Hub ist **solide für ein NestJS-Projekt**, zeigt aber **kritische Schwächen** bei:

1. ❌ Framework-Kopplung (NestJS, Prisma in 37+ Dateien)
2. ❌ Anemic Domain Model (Business-Logic verstreut)
3. ❌ God Services (zu viele Verantwortlichkeiten)
4. ❌ Leaky Abstractions (Prisma-Typen durchsickern)
5. ❌ String-basierte Events (nicht typsicher)

**Hexagonale Architektur mit DDD** löst alle diese Probleme:

✅ Framework-Unabhängigkeit
✅ Rich Domain Models (Business-Logic zentral)
✅ Single Responsibility (Use Cases statt God Services)
✅ Clean Abstractions (Ports & Adapters)
✅ Type-Safe Events (Domain Events)

**Empfehlung:** Migration mit **Strangler Fig Pattern** über 3-4 Wochen, Start mit kleinstem Context (Lagekarte).

**Kritischer Erfolgsfaktor:** Team-Training + inkrementelle Migration + Pragmatismus (kein Over-Engineering).

---

**Ende der Analyse** 🏗️
