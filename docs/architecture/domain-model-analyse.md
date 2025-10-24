# Domain-Modell Analyse: Bluelight-Hub

**Autor:** Claude Code
**Datum:** 2025-10-22
**Status:** Analyse
**Version:** 1.0

---

## Executive Summary

Das Bluelight-Hub-System implementiert aktuell **kein Domain-Driven Design (DDD)**, obwohl dies in den Architektur-Constraints (`docs/architecture/02-constraints.adoc:94`) als Vorgabe definiert ist. Stattdessen nutzt das System ein **Transaction Script Pattern** mit einem **Anemic Domain Model**.

**Kritische Findings:**
- ✅ Architektur-Vorgabe: "Domain-Driven Design für die Geschäftslogik"
- ❌ Implementierung: Transaction Script + Anemic Domain Model
- ⚠️ Business Logic verstreut über Services, Utils und DTOs
- ⚠️ Nur 2 "Entity"-Klassen im gesamten Backend (reine Datenstrukturen)

---

## 1. Aktuelle Architektur-Analyse

### 1.1 Fehlende Domain-Schicht

#### Problem 1: Direkte Nutzung von Prisma-Types

**Beispiel: EinsatzService**
```typescript
// packages/backend/src/einsatz/einsatz.service.ts:31-42
async create(dto: CreateEinsatzDto, userId: string): Promise<EinsatzResponseDto> {
  const einsatzData = {
    alarmstichwort: dto.alarmstichwort || null,
    alarmierungszeit: dto.alarmierungszeit ? new Date(dto.alarmierungszeit) : null,
    creator: { connect: { id: userId } }
  };

  const einsatz = await this.repository.create(einsatzData); // ← Prisma-Type
  this.logger.log(`🚨 Einsatz ${einsatz.id} erstellt von User ${userId}`);

  const event = new EinsatzErstelltEvent(einsatz.id, userId);
  this.eventEmitter.emit('einsatz.erstellt', event);

  return this.toResponseDto(einsatz); // ← Prisma → DTO
}
```

**Architektur-Flow aktuell:**
```
Controller → Service → Repository → Prisma Client
    ↓           ↓           ↓            ↓
  DTO    →   Prisma    →  Prisma   →   Prisma
           (Einsatz)    (CreateInput)  (Model)
```

**Problem:**
- Keine Kapselung von Business Logic
- Services arbeiten direkt mit Prisma-generierten Types
- Keine Validierung auf Domain-Ebene
- Geschäftsregeln verstreut

#### Problem 2: Business Logic in Utility-Klassen

**Gefundene Utilities (sollten Domain-Logik sein):**

1. **Status-Transitions** (`packages/backend/src/einsatz/utils/status-transitions.util.ts`)
```typescript
export class EinsatzStatusTransitions {
  private static readonly ALLOWED_TRANSITIONS: Record<EinsatzStatus, EinsatzStatus[]> = {
    [EinsatzStatus.ANGELEGT]: [EinsatzStatus.IN_BEARBEITUNG, EinsatzStatus.ABGESCHLOSSEN],
    [EinsatzStatus.IN_BEARBEITUNG]: [EinsatzStatus.ABGESCHLOSSEN],
    [EinsatzStatus.ABGESCHLOSSEN]: [EinsatzStatus.ARCHIVIERT],
    [EinsatzStatus.ARCHIVIERT]: [],
  };

  static validateTransition(from: EinsatzStatus, to: EinsatzStatus): void {
    if (!this.isTransitionAllowed(from, to)) {
      throw new BadRequestException(/*...*/);
    }
  }
}
```

**Problem:** Das ist **Kern-Geschäftslogik**, gehört aber nicht in eine Utility-Klasse!

2. **Name-Generator** (`packages/backend/src/einsatz/utils/name-generator.util.ts`)
```typescript
export class EinsatzNameGenerator {
  static generate(einsatz: Einsatz): string {
    // Geschäftslogik zur Name-Generierung
  }
}
```

3. **Completeness-Calculator** (`packages/backend/src/einsatz/utils/completeness.util.ts`)
```typescript
export class EinsatzCompletenessCalculator {
  private static readonly FIELD_WEIGHTS = {
    alarmstichwort: { weight: 30, priority: 'critical' },
    alarmierungszeit: { weight: 25, priority: 'critical' },
  };

  static calculate(einsatz: Partial<Einsatz>): EinsatzCompleteness {
    // Geschäftslogik zur Vollständigkeitsberechnung
  }
}
```

**Wo diese Logik hingehört:**
```typescript
// Domain-Objekt mit eigenem Verhalten
class Einsatz {
  getName(): EinsatzName { /* ... */ }
  calculateCompleteness(): Completeness { /* ... */ }
  transitionTo(newStatus: EinsatzStatus): void { /* ... */ }
}
```

#### Problem 3: Anemic Domain Model

**Einzige "Entity"-Klassen im System:**

```typescript
// packages/backend/src/modules/lagekarte/entities/lagekarte.entity.ts:10
export class Lagekarte implements PrismaLagekarte {
  @ApiProperty({ description: 'Eindeutige ID der Lagekarte' })
  id!: string;

  @ApiProperty({ description: 'Referenz zum zugehörigen Einsatz' })
  einsatzId!: string;

  @ApiProperty({ description: 'GeoJSON State für Zeichnungen' })
  state!: object;

  createdAt!: Date;
  updatedAt!: Date;
}
```

**Das ist kein Domain-Modell, sondern ein DTO!**
- Nur Datenfelder
- Kein Verhalten
- Keine Geschäftslogik
- Keine Invarianten

### 1.2 Repository Pattern: Falsche Abstraktion

**Aktuelles Repository:**
```typescript
// packages/backend/src/einsatz/einsatz.repository.ts
@Injectable()
export class EinsatzRepository {
  async create(data: Prisma.EinsatzCreateInput): Promise<Einsatz> {
    return this.prisma.einsatz.create({ data });
  }

  async findOne(id: string): Promise<Einsatz | null> {
    return this.prisma.einsatz.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.EinsatzUpdateInput): Promise<Einsatz> {
    return this.prisma.einsatz.update({ where: { id }, data });
  }
}
```

**Problem:**
- Repository gibt Prisma-Types zurück (`Einsatz` = Prisma-generiert)
- Keine Mapper zwischen Persistence und Domain
- Prisma-Abhängigkeit "leaked" in die Domain
- Repository ist nur Prisma-Wrapper

**DDD-konformes Repository:**
```typescript
// domain/repositories/einsatz.repository.interface.ts
export interface IEinsatzRepository {
  save(einsatz: DomainEinsatz): Promise<void>;
  findById(id: string): Promise<DomainEinsatz | null>;
  findAll(): Promise<DomainEinsatz[]>;
}

// infrastructure/persistence/einsatz.repository.ts
export class EinsatzRepository implements IEinsatzRepository {
  async save(einsatz: DomainEinsatz): Promise<void> {
    const prismaData = EinsatzMapper.toPrisma(einsatz);
    await this.prisma.einsatz.upsert({
      where: { id: einsatz.id },
      update: prismaData,
      create: prismaData
    });
  }
}
```

---

## 2. Widerspruch zur Architektur-Dokumentation

### 2.1 Architektur-Constraints

**Aus `docs/architecture/02-constraints.adoc:89-94`:**
```asciidoc
==== Architekturprinzipien

* Modularer Aufbau mit klaren Schnittstellen
* Strikte Trennung von Frontend und Backend
* Offline-First-Ansatz mit Daten-Synchronisation
* Domain-Driven Design für die Geschäftslogik  ← HIER!
* Geteilter, generierter Code für Schnittstellen zwischen Frontend und Backend (OpenAPI)
```

### 2.2 Weitere DDD-Referenzen in Dokumentation

**Aus `docs/architecture/08-concepts.adoc`:**
```asciidoc
* Services: Kapseln die Geschäftslogik und Anwendungsfälle
* Domain Services: Komplexe Geschäftslogik, die nicht zu einer einzelnen Entität gehört
* Separation of Concerns: Trennung von Datenzugriff und Geschäftslogik
* Value Objects: Unveränderliche Objekte ohne eigene Identität
```

**Realität:** Keine dieser Konzepte ist implementiert!

---

## 3. Pattern-Vergleich: Transaction Script vs. Domain Model

### 3.1 Aktuelles Pattern: Transaction Script + Anemic Domain Model

#### Charakteristika
```typescript
// Service mit prozeduraler Logik
class EinsatzService {
  async create(dto: CreateEinsatzDto): Promise<EinsatzResponseDto> {
    // 1. Validierung (falls vorhanden)
    // 2. Daten transformieren
    // 3. DB-Call
    // 4. Event emittieren
    // 5. DTO zurück
  }

  async updateStatus(id: string, newStatus: EinsatzStatus): Promise<void> {
    const einsatz = await this.repository.findOne(id);
    EinsatzStatusTransitions.validateTransition(einsatz.status, newStatus); // ← Extern!
    await this.repository.update(id, { status: newStatus });
  }
}
```

#### Vorteile ✅
- Einfach zu verstehen
- Schnell zu implementieren
- Wenig Overhead für simple CRUD
- Direkte DB-Zugriffe

#### Nachteile ❌
- Business Logic verstreut (Service, Utils, Validators)
- Schwer zu testen (DB-abhängig)
- Duplizierung von Validierungslogik
- Keine Kapselung von Geschäftsregeln
- Schwer wartbar bei wachsender Komplexität
- Invarianten nicht geschützt
- Code spricht nicht die Fachsprache (Ubiquitous Language)

### 3.2 Empfohlenes Pattern: Rich Domain Model (DDD)

#### Charakteristika
```typescript
// Domain Entity mit Verhalten
class Einsatz {
  private constructor(
    private readonly id: EinsatzId,
    private alarmstichwort: Alarmstichwort,
    private status: EinsatzStatus,
    private alarmierungszeit?: Alarmierungszeit
  ) {}

  // Factory Method mit Geschäftsregeln
  static create(alarmstichwort: string, userId: UserId): Einsatz {
    if (!alarmstichwort) {
      throw new DomainException('Alarmstichwort ist Pflichtfeld');
    }

    return new Einsatz(
      EinsatzId.generate(),
      Alarmstichwort.create(alarmstichwort),
      EinsatzStatus.angelegt()
    );
  }

  // Business Logic als Methoden
  markInProgress(): void {
    this.status = this.status.transitionTo(EinsatzStatus.IN_BEARBEITUNG);
  }

  complete(): void {
    if (!this.canBeCompleted()) {
      throw new DomainException('Einsatz kann nicht abgeschlossen werden: fehlende Pflichtfelder');
    }
    this.status = this.status.transitionTo(EinsatzStatus.ABGESCHLOSSEN);
  }

  archive(userId: UserId): ArchivedEinsatz {
    if (!this.canBeArchived()) {
      throw new DomainException('Nur abgeschlossene Einsätze können archiviert werden');
    }
    return ArchivedEinsatz.fromEinsatz(this, userId, new Date());
  }

  // Geschäftsregeln gekapselt
  private canBeCompleted(): boolean {
    return this.alarmstichwort.isValid() &&
           this.alarmierungszeit !== undefined;
  }

  private canBeArchived(): boolean {
    return this.status.equals(EinsatzStatus.ABGESCHLOSSEN);
  }

  // Berechnete Werte als Domain Logic
  getName(): EinsatzName {
    return EinsatzName.generate(this.alarmstichwort, this.alarmierungszeit);
  }

  getCompleteness(): Completeness {
    return Completeness.calculate({
      alarmstichwort: this.alarmstichwort,
      alarmierungszeit: this.alarmierungszeit
    });
  }
}
```

#### Vorteile ✅
- **Testbarkeit:** Domain-Logik ohne DB testbar
- **Wartbarkeit:** Business Rules an einem Ort (Single Source of Truth)
- **Verständlichkeit:** Code spricht Fachsprache (Ubiquitous Language)
- **Skalierbarkeit:** Einfacher zu erweitern
- **Compliance:** Erfüllt Architektur-Constraint (DDD)
- **Robustheit:** Invarianten durch Kapselung geschützt
- **Wiederverwendbarkeit:** Domain-Logik kann in verschiedenen Use Cases genutzt werden

#### Nachteile ❌
- Höherer initialer Aufwand
- Mehr Boilerplate-Code (Mapper, Interfaces)
- Steilere Lernkurve für Team

---

## 4. Empfohlene Ziel-Architektur

### 4.1 Schichten-Modell (DDD + Hexagonal Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                  (Controllers, DTOs, Pipes)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Application Layer                          │
│       (Use Cases, Commands, Queries, Handlers)               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Domain Layer                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Entities (Rich Domain Objects)                     │     │
│  │ - Einsatz                                          │     │
│  │ - Einsatztagebuch                                  │     │
│  │ - Lagekarte                                        │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Value Objects (unveränderlich)                     │     │
│  │ - EinsatzId, EinsatzName, EinsatzStatus            │     │
│  │ - Alarmstichwort, Alarmierungszeit                 │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Domain Events                                       │     │
│  │ - EinsatzErstelltEvent (✅ existiert bereits)      │     │
│  │ - EinsatzAbgeschlossenEvent                        │     │
│  │ - EinsatzArchiviertEvent                           │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Repository Interfaces (Ports)                      │     │
│  │ - IEinsatzRepository                               │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                 Infrastructure Layer                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Repository Implementations (Adapters)              │     │
│  │ - EinsatzRepository                                │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Mappers (Domain ↔ Persistence)                     │     │
│  │ - EinsatzMapper                                    │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ External Services                                   │     │
│  │ - PrismaService                                    │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Verzeichnisstruktur (Beispiel: Einsatz-Modul)

```
packages/backend/src/einsatz/
├── domain/                          # Domain Layer (Geschäftslogik)
│   ├── entities/
│   │   └── einsatz.entity.ts       # Rich Domain Object
│   ├── value-objects/
│   │   ├── einsatz-id.vo.ts
│   │   ├── einsatz-name.vo.ts
│   │   ├── einsatz-status.vo.ts
│   │   ├── alarmstichwort.vo.ts
│   │   └── alarmierungszeit.vo.ts
│   ├── events/
│   │   ├── einsatz-erstellt.event.ts       ✅ (existiert bereits)
│   │   ├── einsatz-abgeschlossen.event.ts
│   │   └── einsatz-archiviert.event.ts
│   ├── repositories/
│   │   └── einsatz.repository.interface.ts  # Port
│   └── exceptions/
│       └── einsatz.exception.ts
│
├── application/                     # Application Layer (Use Cases)
│   ├── commands/
│   │   ├── create-einsatz/
│   │   │   ├── create-einsatz.command.ts
│   │   │   └── create-einsatz.handler.ts
│   │   ├── update-einsatz-status/
│   │   │   ├── update-einsatz-status.command.ts
│   │   │   └── update-einsatz-status.handler.ts
│   │   └── archive-einsatz/
│   │       ├── archive-einsatz.command.ts
│   │       └── archive-einsatz.handler.ts
│   └── queries/
│       ├── get-einsatz/
│       │   ├── get-einsatz.query.ts
│       │   └── get-einsatz.handler.ts
│       └── list-einsaetze/
│           ├── list-einsaetze.query.ts
│           └── list-einsaetze.handler.ts
│
├── infrastructure/                  # Infrastructure Layer
│   ├── persistence/
│   │   ├── einsatz.repository.ts   # Adapter (implementiert Interface)
│   │   └── mappers/
│   │       └── einsatz.mapper.ts   # Prisma ↔ Domain
│   └── event-handlers/
│       └── einsatz-erstellt.handler.ts
│
├── presentation/                    # Presentation Layer
│   ├── controllers/
│   │   └── einsatz.controller.ts
│   ├── dto/
│   │   ├── create-einsatz.dto.ts
│   │   ├── update-einsatz.dto.ts
│   │   └── einsatz-response.dto.ts
│   └── pipes/
│       └── einsatz-validation.pipe.ts
│
└── einsatz.module.ts
```

### 4.3 Abhängigkeits-Regeln

**DDD Dependency Rule:**
```
Presentation → Application → Domain ← Infrastructure
                                ↑
                        (nur Interfaces)
```

**Wichtig:**
- ✅ Domain kennt **nichts** außer sich selbst
- ✅ Application nutzt Domain-Interfaces
- ✅ Infrastructure implementiert Domain-Interfaces
- ✅ Presentation nutzt Application (Commands/Queries)
- ❌ Domain darf **niemals** Infrastructure kennen (Dependency Inversion!)

---

## 5. Migration-Strategie

### 5.1 Priorisierung nach Business Value

#### Phase 1: Kritische Aggregates (JETZT)
1. **Einsatz** - Kern-Aggregate mit komplexer Business Logic
   - Status-Transitions
   - Completeness-Calculation
   - Name-Generation
   - Archivierung

2. **EinsatzStatus** als Value Object
   - Gekapselte Status-Transitions
   - Type-Safe Status-Handling

#### Phase 2: Komplexe Module (3-6 Monate)
3. **Einsatztagebuch (ETB)**
   - Einträge, Historie, Versionierung
   - Sperrung/Freigabe

4. **Lagekarte**
   - GeoJSON-Handling
   - POI-Management

#### Phase 3: Support-Module (6-12 Monate)
5. **User Management**
   - Einfaches CRUD, später migrieren
   - Aktuelles Pattern ist hier ok

6. **Authentication/Authorization**
   - Security-kritisch, aber wenig Business Logic
   - Später migrieren

### 5.2 Schritt-für-Schritt-Migration (Beispiel: Einsatz)

#### Step 1: Domain Entity erstellen

**Datei:** `domain/entities/einsatz.entity.ts`

```typescript
import { EinsatzId } from '../value-objects/einsatz-id.vo';
import { EinsatzStatus } from '../value-objects/einsatz-status.vo';
import { Alarmstichwort } from '../value-objects/alarmstichwort.vo';
import { EinsatzName } from '../value-objects/einsatz-name.vo';
import { Alarmierungszeit } from '../value-objects/alarmierungszeit.vo';

export class Einsatz {
  private constructor(
    private readonly _id: EinsatzId,
    private _alarmstichwort: Alarmstichwort,
    private _status: EinsatzStatus,
    private _alarmierungszeit?: Alarmierungszeit,
    private _einsatzort?: string,
    private _beschreibung?: string,
    private _einsatzleiter?: string,
    private _metadata?: Record<string, any>,
    private readonly _createdBy: string,
    private readonly _createdAt: Date,
    private _updatedBy?: string,
    private _updatedAt?: Date,
    private _archivedBy?: string,
    private _archivedAt?: Date
  ) {
    this.validateInvariants();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Erstellt einen neuen Einsatz
   *
   * @param alarmstichwort - Optional: Alarmstichwort (z.B. "Brand 3")
   * @param userId - User ID des Erstellers
   * @returns Neuer Einsatz im Status ANGELEGT
   */
  static create(alarmstichwort: string | undefined, userId: string): Einsatz {
    return new Einsatz(
      EinsatzId.generate(),
      alarmstichwort ? Alarmstichwort.create(alarmstichwort) : Alarmstichwort.empty(),
      EinsatzStatus.angelegt(),
      undefined, // alarmierungszeit
      undefined, // einsatzort
      undefined, // beschreibung
      undefined, // einsatzleiter
      undefined, // metadata
      userId,
      new Date()
    );
  }

  /**
   * Rekonstruiert einen Einsatz aus der Datenbank
   * (wird vom Mapper genutzt)
   */
  static reconstitute(
    id: string,
    alarmstichwort: string | null,
    status: string,
    alarmierungszeit: Date | null,
    einsatzort: string | null,
    beschreibung: string | null,
    einsatzleiter: string | null,
    metadata: any,
    createdBy: string,
    createdAt: Date,
    updatedBy: string | null,
    updatedAt: Date | null,
    archivedBy: string | null,
    archivedAt: Date | null
  ): Einsatz {
    return new Einsatz(
      EinsatzId.fromString(id),
      alarmstichwort ? Alarmstichwort.create(alarmstichwort) : Alarmstichwort.empty(),
      EinsatzStatus.fromString(status),
      alarmierungszeit ? Alarmierungszeit.create(alarmierungszeit) : undefined,
      einsatzort ?? undefined,
      beschreibung ?? undefined,
      einsatzleiter ?? undefined,
      metadata ?? undefined,
      createdBy,
      createdAt,
      updatedBy ?? undefined,
      updatedAt ?? undefined,
      archivedBy ?? undefined,
      archivedAt ?? undefined
    );
  }

  // ============================================
  // Business Logic (Commands)
  // ============================================

  /**
   * Setzt Einsatz auf "In Bearbeitung"
   */
  markInProgress(): void {
    this._status = this._status.transitionTo(EinsatzStatus.IN_BEARBEITUNG);
    this.markUpdated();
  }

  /**
   * Schließt Einsatz ab (nur wenn vollständig)
   */
  complete(): void {
    if (!this.canBeCompleted()) {
      throw new EinsatzCannotBeCompletedException(
        'Einsatz kann nicht abgeschlossen werden: Alarmstichwort und Alarmierungszeit sind erforderlich'
      );
    }
    this._status = this._status.transitionTo(EinsatzStatus.ABGESCHLOSSEN);
    this.markUpdated();
  }

  /**
   * Archiviert Einsatz (nur wenn abgeschlossen)
   */
  archive(userId: string): void {
    if (!this.canBeArchived()) {
      throw new EinsatzCannotBeArchivedException(
        'Nur abgeschlossene Einsätze können archiviert werden'
      );
    }
    this._status = this._status.transitionTo(EinsatzStatus.ARCHIVIERT);
    this._archivedBy = userId;
    this._archivedAt = new Date();
    this.markUpdated();
  }

  /**
   * Aktualisiert Einsatz-Daten
   */
  update(data: {
    alarmstichwort?: string;
    alarmierungszeit?: Date;
    einsatzort?: string;
    beschreibung?: string;
    einsatzleiter?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.canBeEdited()) {
      throw new EinsatzIsArchivedException('Archivierte Einsätze können nicht bearbeitet werden');
    }

    if (data.alarmstichwort !== undefined) {
      this._alarmstichwort = data.alarmstichwort
        ? Alarmstichwort.create(data.alarmstichwort)
        : Alarmstichwort.empty();
    }
    if (data.alarmierungszeit !== undefined) {
      this._alarmierungszeit = Alarmierungszeit.create(data.alarmierungszeit);
    }
    if (data.einsatzort !== undefined) {
      this._einsatzort = data.einsatzort;
    }
    if (data.beschreibung !== undefined) {
      this._beschreibung = data.beschreibung;
    }
    if (data.einsatzleiter !== undefined) {
      this._einsatzleiter = data.einsatzleiter;
    }
    if (data.metadata !== undefined) {
      this._metadata = data.metadata;
    }

    this.markUpdated();
  }

  // ============================================
  // Business Logic (Queries/Berechnungen)
  // ============================================

  /**
   * Generiert den Einsatz-Namen
   */
  getName(): EinsatzName {
    return EinsatzName.generate(this._alarmstichwort, this._alarmierungszeit, this._createdAt);
  }

  /**
   * Berechnet Vollständigkeit
   */
  getCompleteness(): Completeness {
    return Completeness.calculate({
      alarmstichwort: this._alarmstichwort,
      alarmierungszeit: this._alarmierungszeit
    });
  }

  /**
   * Prüft ob Einsatz abgeschlossen werden kann
   */
  canBeCompleted(): boolean {
    return this._alarmstichwort.isValid() &&
           this._alarmierungszeit !== undefined;
  }

  /**
   * Prüft ob Einsatz archiviert werden kann
   */
  canBeArchived(): boolean {
    return this._status.equals(EinsatzStatus.ABGESCHLOSSEN);
  }

  /**
   * Prüft ob Einsatz bearbeitet werden kann
   */
  canBeEdited(): boolean {
    return !this._status.equals(EinsatzStatus.ARCHIVIERT);
  }

  // ============================================
  // Getters (Read-Only Zugriff)
  // ============================================

  get id(): EinsatzId {
    return this._id;
  }

  get alarmstichwort(): Alarmstichwort {
    return this._alarmstichwort;
  }

  get status(): EinsatzStatus {
    return this._status;
  }

  get alarmierungszeit(): Alarmierungszeit | undefined {
    return this._alarmierungszeit;
  }

  get einsatzort(): string | undefined {
    return this._einsatzort;
  }

  get beschreibung(): string | undefined {
    return this._beschreibung;
  }

  get einsatzleiter(): string | undefined {
    return this._einsatzleiter;
  }

  get metadata(): Record<string, any> | undefined {
    return this._metadata;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  get archivedBy(): string | undefined {
    return this._archivedBy;
  }

  get archivedAt(): Date | undefined {
    return this._archivedAt;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private validateInvariants(): void {
    // Grundlegende Invarianten prüfen
    if (!this._id) {
      throw new Error('Einsatz muss eine ID haben');
    }
    if (!this._createdBy) {
      throw new Error('Einsatz muss einen Ersteller haben');
    }
    if (!this._createdAt) {
      throw new Error('Einsatz muss ein Erstellungsdatum haben');
    }
  }

  private markUpdated(): void {
    this._updatedAt = new Date();
  }
}
```

#### Step 2: Value Objects erstellen

**Beispiel: EinsatzStatus als Value Object**

**Datei:** `domain/value-objects/einsatz-status.vo.ts`

```typescript
export class EinsatzStatus {
  private static readonly ALLOWED_TRANSITIONS = {
    ANGELEGT: ['IN_BEARBEITUNG', 'ABGESCHLOSSEN'],
    IN_BEARBEITUNG: ['ABGESCHLOSSEN'],
    ABGESCHLOSSEN: ['ARCHIVIERT'],
    ARCHIVIERT: []
  } as const;

  private constructor(private readonly value: 'ANGELEGT' | 'IN_BEARBEITUNG' | 'ABGESCHLOSSEN' | 'ARCHIVIERT') {}

  // Factory Methods
  static angelegt(): EinsatzStatus {
    return new EinsatzStatus('ANGELEGT');
  }

  static inBearbeitung(): EinsatzStatus {
    return new EinsatzStatus('IN_BEARBEITUNG');
  }

  static abgeschlossen(): EinsatzStatus {
    return new EinsatzStatus('ABGESCHLOSSEN');
  }

  static archiviert(): EinsatzStatus {
    return new EinsatzStatus('ARCHIVIERT');
  }

  static fromString(value: string): EinsatzStatus {
    const upperValue = value.toUpperCase();
    if (!['ANGELEGT', 'IN_BEARBEITUNG', 'ABGESCHLOSSEN', 'ARCHIVIERT'].includes(upperValue)) {
      throw new InvalidEinsatzStatusException(`Ungültiger Status: ${value}`);
    }
    return new EinsatzStatus(upperValue as any);
  }

  // Business Logic: Status-Transitions
  transitionTo(newStatus: EinsatzStatus): EinsatzStatus {
    if (this.equals(newStatus)) {
      return this; // Gleicher Status
    }

    const allowedTransitions = EinsatzStatus.ALLOWED_TRANSITIONS[this.value];
    if (!allowedTransitions.includes(newStatus.value as any)) {
      throw new InvalidStatusTransitionException(
        `Status-Übergang von "${this.value}" zu "${newStatus.value}" ist nicht erlaubt. ` +
        `Erlaubte Übergänge: ${allowedTransitions.join(', ') || 'keine'}`
      );
    }

    return newStatus;
  }

  // Queries
  canTransitionTo(newStatus: EinsatzStatus): boolean {
    if (this.equals(newStatus)) return true;
    const allowedTransitions = EinsatzStatus.ALLOWED_TRANSITIONS[this.value];
    return allowedTransitions.includes(newStatus.value as any);
  }

  isArchiviert(): boolean {
    return this.value === 'ARCHIVIERT';
  }

  // Value Object Equality
  equals(other: EinsatzStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  // Getter für Prisma-Mapping
  getValue(): string {
    return this.value;
  }
}
```

#### Step 3: Mapper erstellen

**Datei:** `infrastructure/persistence/mappers/einsatz.mapper.ts`

```typescript
import { Einsatz as PrismaEinsatz } from '@prisma/client';
import { Einsatz } from '../../../domain/entities/einsatz.entity';

export class EinsatzMapper {
  /**
   * Konvertiert Prisma-Modell zu Domain-Entity
   */
  static toDomain(prisma: PrismaEinsatz): Einsatz {
    return Einsatz.reconstitute(
      prisma.id,
      prisma.alarmstichwort,
      prisma.status,
      prisma.alarmierungszeit,
      prisma.einsatzort,
      prisma.beschreibung,
      prisma.einsatzleiter,
      prisma.metadata,
      prisma.createdBy,
      prisma.createdAt,
      prisma.updatedBy,
      prisma.updatedAt,
      prisma.archivedBy,
      prisma.archivedAt
    );
  }

  /**
   * Konvertiert Domain-Entity zu Prisma Create Input
   */
  static toPrismaCreate(domain: Einsatz): Prisma.EinsatzCreateInput {
    return {
      id: domain.id.getValue(),
      alarmstichwort: domain.alarmstichwort.getValue() || null,
      status: domain.status.getValue(),
      alarmierungszeit: domain.alarmierungszeit?.getValue() ?? null,
      einsatzort: domain.einsatzort ?? null,
      beschreibung: domain.beschreibung ?? null,
      einsatzleiter: domain.einsatzleiter ?? null,
      metadata: domain.metadata ?? null,
      createdBy: domain.createdBy,
      createdAt: domain.createdAt,
      updatedBy: domain.updatedBy ?? null,
      updatedAt: domain.updatedAt ?? null,
      archivedBy: domain.archivedBy ?? null,
      archivedAt: domain.archivedAt ?? null
    };
  }

  /**
   * Konvertiert Domain-Entity zu Prisma Update Input
   */
  static toPrismaUpdate(domain: Einsatz): Prisma.EinsatzUpdateInput {
    return {
      alarmstichwort: domain.alarmstichwort.getValue() || null,
      status: domain.status.getValue(),
      alarmierungszeit: domain.alarmierungszeit?.getValue() ?? null,
      einsatzort: domain.einsatzort ?? null,
      beschreibung: domain.beschreibung ?? null,
      einsatzleiter: domain.einsatzleiter ?? null,
      metadata: domain.metadata ?? null,
      updatedBy: domain.updatedBy ?? null,
      updatedAt: domain.updatedAt ?? null,
      archivedBy: domain.archivedBy ?? null,
      archivedAt: domain.archivedAt ?? null
    };
  }
}
```

#### Step 4: Repository Interface & Implementation

**Interface:** `domain/repositories/einsatz.repository.interface.ts`

```typescript
import { Einsatz } from '../entities/einsatz.entity';
import { EinsatzId } from '../value-objects/einsatz-id.vo';

export interface IEinsatzRepository {
  save(einsatz: Einsatz): Promise<void>;
  findById(id: EinsatzId): Promise<Einsatz | null>;
  findAll(): Promise<Einsatz[]>;
  delete(id: EinsatzId): Promise<void>;
}
```

**Implementation:** `infrastructure/persistence/einsatz.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IEinsatzRepository } from '../../domain/repositories/einsatz.repository.interface';
import { Einsatz } from '../../domain/entities/einsatz.entity';
import { EinsatzId } from '../../domain/value-objects/einsatz-id.vo';
import { EinsatzMapper } from './mappers/einsatz.mapper';

@Injectable()
export class EinsatzRepository implements IEinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(einsatz: Einsatz): Promise<void> {
    const exists = await this.prisma.einsatz.findUnique({
      where: { id: einsatz.id.getValue() }
    });

    if (exists) {
      await this.prisma.einsatz.update({
        where: { id: einsatz.id.getValue() },
        data: EinsatzMapper.toPrismaUpdate(einsatz)
      });
    } else {
      await this.prisma.einsatz.create({
        data: EinsatzMapper.toPrismaCreate(einsatz)
      });
    }
  }

  async findById(id: EinsatzId): Promise<Einsatz | null> {
    const prismaEinsatz = await this.prisma.einsatz.findUnique({
      where: { id: id.getValue() }
    });

    return prismaEinsatz ? EinsatzMapper.toDomain(prismaEinsatz) : null;
  }

  async findAll(): Promise<Einsatz[]> {
    const prismaEinsaetze = await this.prisma.einsatz.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return prismaEinsaetze.map(EinsatzMapper.toDomain);
  }

  async delete(id: EinsatzId): Promise<void> {
    await this.prisma.einsatz.delete({
      where: { id: id.getValue() }
    });
  }
}
```

#### Step 5: Application Layer (CQRS)

**Command:** `application/commands/create-einsatz/create-einsatz.command.ts`

```typescript
export class CreateEinsatzCommand {
  constructor(
    public readonly alarmstichwort: string | undefined,
    public readonly userId: string
  ) {}
}
```

**Handler:** `application/commands/create-einsatz/create-einsatz.handler.ts`

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateEinsatzCommand } from './create-einsatz.command';
import { IEinsatzRepository } from '../../../domain/repositories/einsatz.repository.interface';
import { Einsatz } from '../../../domain/entities/einsatz.entity';
import { EinsatzErstelltEvent } from '../../../domain/events/einsatz-erstellt.event';

@CommandHandler(CreateEinsatzCommand)
export class CreateEinsatzHandler implements ICommandHandler<CreateEinsatzCommand> {
  constructor(
    private readonly repository: IEinsatzRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(command: CreateEinsatzCommand): Promise<string> {
    // 1. Domain Entity erstellen (mit Business Logic)
    const einsatz = Einsatz.create(command.alarmstichwort, command.userId);

    // 2. Persistieren
    await this.repository.save(einsatz);

    // 3. Domain Event emittieren
    const event = new EinsatzErstelltEvent(einsatz.id.getValue(), command.userId);
    this.eventEmitter.emit('einsatz.erstellt', event);

    // 4. ID zurückgeben
    return einsatz.id.getValue();
  }
}
```

#### Step 6: Controller-Anpassung

**Vorher (Transaction Script):**
```typescript
@Post()
async create(@Body() dto: CreateEinsatzDto, @CurrentUser() user: User) {
  return this.einsatzService.create(dto, user.id);
}
```

**Nachher (DDD mit CQRS):**
```typescript
@Post()
async create(@Body() dto: CreateEinsatzDto, @CurrentUser() user: User) {
  const command = new CreateEinsatzCommand(dto.alarmstichwort, user.id);
  const einsatzId = await this.commandBus.execute(command);

  // Query ausführen um Response zu bauen
  const query = new GetEinsatzQuery(einsatzId);
  return this.queryBus.execute(query);
}
```

### 5.3 Migrations-Checklist

**Für jedes Modul:**

- [ ] Domain Layer
  - [ ] Entity mit Business Logic erstellen
  - [ ] Value Objects identifizieren und implementieren
  - [ ] Domain Events definieren
  - [ ] Repository Interface erstellen
  - [ ] Domain Exceptions definieren

- [ ] Application Layer
  - [ ] Commands/Queries definieren
  - [ ] Command/Query Handlers implementieren
  - [ ] Event Handlers implementieren (falls nötig)

- [ ] Infrastructure Layer
  - [ ] Mapper (Domain ↔ Prisma) implementieren
  - [ ] Repository Implementation erstellen
  - [ ] External Service Adapter (falls nötig)

- [ ] Tests
  - [ ] Unit Tests für Domain Logic (OHNE DB!)
  - [ ] Integration Tests für Repository
  - [ ] E2E Tests für Use Cases

- [ ] Migration
  - [ ] Alte Service-Methoden als deprecated markieren
  - [ ] Neue Commands/Queries parallel betreiben
  - [ ] Alte Methoden entfernen nach Übergangsphase

---

## 6. Testbarkeits-Vergleich

### 6.1 Aktuell (Transaction Script)

```typescript
// Test für EinsatzService.create()
describe('EinsatzService', () => {
  let service: EinsatzService;
  let mockRepository: DeepMocked<EinsatzRepository>;
  let mockEventEmitter: DeepMocked<EventEmitter2>;

  beforeEach(() => {
    mockRepository = createMock<EinsatzRepository>();
    mockEventEmitter = createMock<EventEmitter2>();
    service = new EinsatzService(mockRepository, mockEventEmitter);
  });

  it('should create einsatz', async () => {
    // PROBLEM: Repository-Mock erforderlich, obwohl wir Business Logic testen wollen!
    const mockEinsatz = { id: '123', status: 'ANGELEGT', /*...*/ };
    mockRepository.create.mockResolvedValue(mockEinsatz);

    const result = await service.create({ alarmstichwort: 'Brand 3' }, 'user123');

    expect(mockRepository.create).toHaveBeenCalled();
    expect(result.id).toBe('123');
  });

  it('should validate status transition', async () => {
    // PROBLEM: Externer Utility-Call schwer zu testen
    const mockEinsatz = { id: '123', status: 'ARCHIVIERT' };
    mockRepository.findOne.mockResolvedValue(mockEinsatz);

    // Wie testen wir die Transition-Logik?
    // Sie ist in EinsatzStatusTransitions.validateTransition() versteckt!
  });
});
```

**Probleme:**
- ❌ Business Logic nicht isoliert testbar
- ❌ DB-Mocks erforderlich
- ❌ Utility-Klassen schwer zu mocken
- ❌ Tests testen Infrastruktur, nicht Geschäftslogik

### 6.2 Mit DDD (Rich Domain Model)

```typescript
// Test für Einsatz Domain Entity
describe('Einsatz', () => {
  describe('create', () => {
    it('should create einsatz with status ANGELEGT', () => {
      // KEIN Mock nötig! Pure Business Logic!
      const einsatz = Einsatz.create('Brand 3', 'user123');

      expect(einsatz.status.equals(EinsatzStatus.angelegt())).toBe(true);
      expect(einsatz.alarmstichwort.getValue()).toBe('Brand 3');
      expect(einsatz.createdBy).toBe('user123');
    });
  });

  describe('status transitions', () => {
    it('should allow transition from ANGELEGT to IN_BEARBEITUNG', () => {
      const einsatz = Einsatz.create('Brand 3', 'user123');

      einsatz.markInProgress();

      expect(einsatz.status.equals(EinsatzStatus.inBearbeitung())).toBe(true);
    });

    it('should not allow transition from ARCHIVIERT to IN_BEARBEITUNG', () => {
      const einsatz = Einsatz.create('Brand 3', 'user123');
      einsatz.markInProgress();
      einsatz.complete();
      einsatz.archive('user123');

      expect(() => einsatz.markInProgress()).toThrow(InvalidStatusTransitionException);
    });
  });

  describe('completeness', () => {
    it('should not be completable without alarmstichwort', () => {
      const einsatz = Einsatz.create(undefined, 'user123');

      expect(einsatz.canBeCompleted()).toBe(false);
      expect(() => einsatz.complete()).toThrow(EinsatzCannotBeCompletedException);
    });

    it('should be completable with all required fields', () => {
      const einsatz = Einsatz.create('Brand 3', 'user123');
      einsatz.update({ alarmierungszeit: new Date() });

      expect(einsatz.canBeCompleted()).toBe(true);
      expect(() => einsatz.complete()).not.toThrow();
    });
  });

  describe('archiving', () => {
    it('should only archive completed einsaetze', () => {
      const einsatz = Einsatz.create('Brand 3', 'user123');

      expect(einsatz.canBeArchived()).toBe(false);
      expect(() => einsatz.archive('user123')).toThrow(EinsatzCannotBeArchivedException);

      einsatz.markInProgress();
      expect(einsatz.canBeArchived()).toBe(false);

      einsatz.complete();
      expect(einsatz.canBeArchived()).toBe(true);

      einsatz.archive('user123');
      expect(einsatz.status.isArchiviert()).toBe(true);
      expect(einsatz.archivedBy).toBe('user123');
    });
  });
});
```

**Vorteile:**
- ✅ Pure Unit Tests ohne Mocks
- ✅ Schnell (keine DB)
- ✅ Fokus auf Geschäftslogik
- ✅ 100% Code Coverage möglich
- ✅ Tests dokumentieren Business Rules

---

## 7. Risiken & Mitigations

### 7.1 Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| **Over-Engineering** für simple CRUD | Mittel | Mittel | Nur für komplexe Aggregates (Einsatz, ETB) verwenden |
| **Learning Curve** für Team | Hoch | Mittel | Schrittweise Migration, Dokumentation, Pair Programming |
| **Performance-Overhead** durch Mapping | Niedrig | Niedrig | Benchmarking, ggf. Optimierung |
| **Inkonsistenz** während Migration | Hoch | Hoch | Feature Flags, Strangler Pattern, klare Migration-Phasen |
| **Breaking Changes** in API | Mittel | Hoch | Versionierung, Backward Compatibility |

### 7.2 Migrations-Antipatterns (zu vermeiden!)

#### ❌ Big Bang Rewrite
**Problem:** Alles auf einmal umbauen
**Lösung:** Strangler Fig Pattern - schrittweise ersetzen

#### ❌ Premature Abstraction
**Problem:** DDD für simples CRUD
**Lösung:** Nur für Aggregates mit echter Business Logic

#### ❌ Anemic Domain Model 2.0
**Problem:** Entities ohne Verhalten erstellen
**Lösung:** Behavior > Data - Methoden in Entities!

#### ❌ Repository als DAO
**Problem:** Repository = Prisma-Wrapper
**Lösung:** Repository arbeitet mit Domain-Objekten, nicht Prisma-Types

---

## 8. Vorteile für Bluelight-Hub

### 8.1 Fachliche Vorteile

1. **Ubiquitous Language**
   ```typescript
   // Vorher (technisch)
   await service.updateStatus(id, 'ARCHIVIERT');

   // Nachher (fachlich)
   einsatz.archive(userId);
   ```

2. **Geschäftsregeln explizit**
   ```typescript
   // Vorher (verstreut)
   if (status === 'ABGESCHLOSSEN') {
     // in Service
   }
   EinsatzStatusTransitions.validate(/*...*/); // in Util

   // Nachher (gekapselt)
   if (einsatz.canBeArchived()) {
     einsatz.archive(userId);
   }
   ```

3. **Invarianten geschützt**
   ```typescript
   // Vorher (ungeschützt)
   await repository.update(id, { status: 'ARCHIVIERT' }); // Direkt möglich!

   // Nachher (geschützt)
   einsatz.archive(userId); // Throws wenn nicht ABGESCHLOSSEN
   ```

### 8.2 Technische Vorteile

1. **Testbarkeit** ohne DB
2. **Wartbarkeit** durch Kapselung
3. **Skalierbarkeit** durch klare Schichten
4. **Wiederverwendbarkeit** von Domain-Logik
5. **Refactoring-Safety** durch Type System

### 8.3 Compliance-Vorteile

- ✅ Erfüllt Architektur-Constraint "DDD für Geschäftslogik"
- ✅ Bessere Code-Dokumentation (JSDoc Coverage)
- ✅ Audit-Trail durch Domain Events
- ✅ DSGVO-Compliance durch Kapselung

---

## 9. Nächste Schritte

### 9.1 Sofortige Maßnahmen (Woche 1-2)

1. **Entscheidung treffen:**
   - [ ] Ist Migration zu DDD gewünscht?
   - [ ] Welche Module priorisieren? (Empfehlung: Einsatz)
   - [ ] Zeitrahmen definieren (Empfehlung: 3-6 Monate)

2. **Proof of Concept:**
   - [ ] Einsatz-Entity mit Rich Domain Model implementieren
   - [ ] EinsatzStatus als Value Object
   - [ ] Mapper Prisma ↔ Domain
   - [ ] Repository mit Interface
   - [ ] Tests für Domain Logic

3. **Dokumentation:**
   - [ ] ADR erstellen: "Migration zu Domain-Driven Design"
   - [ ] Architektur-Dokumentation aktualisieren
   - [ ] Team-Onboarding-Guide schreiben

### 9.2 Kurzfristig (Monat 1-2)

1. **Einsatz-Modul vollständig migrieren:**
   - [ ] Alle Use Cases auf Commands/Queries umstellen
   - [ ] Event-basierte Integration mit ETB beibehalten
   - [ ] Alte Service-Methoden deprecaten
   - [ ] Tests schreiben (Unit + Integration)

2. **Patterns etablieren:**
   - [ ] Code-Generator für neue Module (Nx Generators)
   - [ ] Linting-Rules für DDD-Patterns
   - [ ] CI/CD-Pipeline erweitern (Architecture Tests)

### 9.3 Mittelfristig (Monat 3-6)

1. **ETB-Modul migrieren**
2. **Lagekarte-Modul migrieren**
3. **Legacy-Code entfernen**
4. **Performance-Optimierung**

### 9.4 Langfristig (6-12 Monate)

1. **Restliche Module migrieren**
2. **Event Sourcing evaluieren** (für Audit-Trail)
3. **CQRS mit separaten Read-Models** (für Performance)

---

## 10. Fazit & Empfehlung

### ✅ Empfehlung: Schrittweise Migration zu DDD

**Begründung:**
1. ✅ Architektur-Compliance (erfüllt Constraint "DDD für Geschäftslogik")
2. ✅ Verbesserte Wartbarkeit für wachsende Komplexität
3. ✅ Bessere Testbarkeit (Domain Logic ohne DB)
4. ✅ Klarere Fachlichkeit (Ubiquitous Language)
5. ✅ Zukunftssicherheit (einfacher zu erweitern)

**Strategie:**
- **Start:** Einsatz-Modul als Proof of Concept (2-4 Wochen)
- **Dann:** ETB-Modul (komplexe Business Logic)
- **Später:** Lagekarte und andere Module
- **Keep:** User Management kann Transaction Script bleiben (simples CRUD)

**No-Go:**
- ❌ Kein Big Bang Rewrite
- ❌ Nicht für alle Module (nur wo es Sinn macht)
- ❌ Nicht ohne Tests

---

## Anhang

### A.1 Referenzen

- **Domain-Driven Design** (Eric Evans, 2003)
- **Implementing Domain-Driven Design** (Vaughn Vernon, 2013)
- **NestJS CQRS Module:** https://docs.nestjs.com/recipes/cqrs
- **Hexagonal Architecture:** Alistair Cockburn

### A.2 Code-Beispiele

Vollständige Code-Beispiele sind in diesem Dokument enthalten:
- Domain Entity: `Einsatz` (Abschnitt 5.2, Step 1)
- Value Object: `EinsatzStatus` (Abschnitt 5.2, Step 2)
- Mapper: `EinsatzMapper` (Abschnitt 5.2, Step 3)
- Repository: `EinsatzRepository` (Abschnitt 5.2, Step 4)
- Command Handler: `CreateEinsatzHandler` (Abschnitt 5.2, Step 5)

### A.3 Glossar

| Begriff | Definition |
|---------|-----------|
| **Aggregate** | Cluster von Domain-Objekten mit klarer Grenze und Konsistenz-Garantie |
| **Entity** | Objekt mit Identität und Lebenszyklus |
| **Value Object** | Unveränderliches Objekt ohne Identität, definiert durch Werte |
| **Domain Event** | Ereignis, das in der Domäne passiert ist (Vergangenheitsform) |
| **Repository** | Abstraktion für Persistierung von Aggregates |
| **Anemic Domain Model** | Anti-Pattern: Domain-Objekte ohne Verhalten (nur Daten) |
| **Transaction Script** | Pattern: Prozeduraler Code für Geschäftslogik in Services |
| **Ubiquitous Language** | Gemeinsame Sprache zwischen Entwicklern und Fachexperten |
| **Anti-Corruption Layer** | Mapper/Adapter zum Schutz der Domain vor externen Systemen |

---

**Ende der Analyse**
