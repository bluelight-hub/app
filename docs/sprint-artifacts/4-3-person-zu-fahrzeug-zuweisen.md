# Story 4.3: Person zu Fahrzeug zuweisen

**Status:** in-progress (Backend complete, Frontend pending)

---

## Key Files (Quick Reference)

| Kategorie | Datei |
|-----------|-------|
| **Prisma Schema** | `packages/backend/prisma/schema.prisma` |
| **EinsatzPerson Aggregate** | `packages/backend/src/domain/kraefte/aggregates/einsatz-person.aggregate.ts` |
| **EinsatzFahrzeug Aggregate** | `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts` |
| **Error Codes** | `packages/backend/src/domain/kraefte/common/einsatz-person-error-codes.ts` |
| **DI Tokens** | `packages/backend/src/infrastructure/di-tokens.ts` |
| **Event Serializer** | `packages/backend/src/infrastructure/outbox/event-serializer.ts` |
| **Event Deserializer** | `packages/backend/src/infrastructure/outbox/event-deserializer.ts` |
| **Controller** | `packages/backend/src/modules/kraefte/controllers/einsatz-personen.controller.ts` |
| **Kraefte Module** | `packages/backend/src/modules/kraefte/kraefte.module.ts` |
| **Query Keys** | `packages/frontend/src/queryKeys.ts` |

---

## Blocker / Prerequisites

| Blocker | Status | Beschreibung |
|---------|--------|--------------|
| ✅ **Story 4.1 Complete** | DONE | Manuelle Personen-Registrierung (EinsatzPerson Aggregate) |
| ✅ **Story 4.2 Complete** | DONE | QR-Code Personen-Registrierung |
| ✅ **Story 3.1 Complete** | DONE | Fahrzeug aus Stammdaten erfassen (EinsatzFahrzeug Aggregate) |
| ✅ **Prisma Schema** | DONE | `fahrzeugId` + Relation bereits vorhanden (inkl. Index + Inverse) |

---

## Quick Context

| Aspekt | Details |
|--------|---------|
| **Entities** | `EinsatzPerson` (erweitern), `EinsatzFahrzeug` (read-only) |
| **Pattern** | Bidirektionale Zuweisung: Person → Fahrzeug (1:N) |
| **API** | `PUT /api/v-alpha/einsaetze/:einsatzId/personen/:personId/fahrzeug`, `DELETE` für Aufhebung |
| **Events** | `PersonZuFahrzeugZugewiesenEvent`, `PersonVonFahrzeugEntferntEvent` → ETB Auto-Einträge |
| **Frontend** | Dropdown in Personen-Liste, Badge-Anzeige, Fahrzeug-Besatzungs-Pills |
| **Validation** | Fahrzeug MUSS im gleichen Einsatz sein |
| **Aufwand** | ~3-4 Tage |

**Task Dependencies:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7

---

## Story

**Als** FüKw (Sandra),
**möchte ich** eine registrierte Person einem Fahrzeug zuweisen,
**damit** ich nachverfolgen kann, welche Helfer in welchem Fahrzeug sind.

---

## Acceptance Criteria

### AC1: Zuweisung in Personen-Liste

**Given** ich sehe registrierte Personen in der Einsatz-Detail-Seite
**When** ich auf das Fahrzeug-Icon neben einer Person klicke
**Then** öffnet sich ein Dropdown mit allen erfassten Fahrzeugen des Einsatzes
**And** Fahrzeuge werden mit Funkrufname + FMS-Status-Badge angezeigt
**And** bereits zugewiesenes Fahrzeug ist vorselektiert (falls vorhanden)

**UI Details:**
- Icon: `TruckIcon` (Heroicons) neben Person-Name
- Dropdown: Headless UI Listbox
- Fahrzeug-Optionen: `{Funkrufname} (FMS {Status})` + Farbcode
- "Keine Zuweisung" als erste Option

### AC2: Fahrzeug zuweisen

**Given** ich wähle ein Fahrzeug aus dem Dropdown
**When** ich die Auswahl bestätige (Klick auf Fahrzeug)
**Then** wird `fahrzeugId` in `EinsatzPerson` gesetzt
**And** Domain Event `PersonZuFahrzeugZugewiesenEvent` wird emittiert
**And** ETB-Eintrag wird automatisch erstellt: "{Vorname} {Nachname} zu {Funkrufname} zugewiesen"
**And** Toast: "Person {Name} zu {Funkrufname} zugewiesen"
**And** UI wird optimistisch aktualisiert

**Backend-Validation:**
- Fahrzeug MUSS im gleichen Einsatz sein (`fahrzeug.einsatzId === person.einsatzId`)
- Person MUSS existieren und nicht bereits demselben Fahrzeug zugewiesen sein
- Bei Validation-Fehler: 400 Bad Request mit spezifischem Error Code

### AC3: Zuweisung aufheben

**Given** Person ist einem Fahrzeug zugewiesen
**When** ich "Keine Zuweisung" wähle ODER auf "Zuweisung aufheben" klicke
**Then** wird `fahrzeugId` auf `null` gesetzt
**And** Event `PersonVonFahrzeugEntferntEvent` emittiert
**And** ETB-Eintrag: "{Vorname} {Nachname} von {Funkrufname} entfernt"
**And** Toast: "Zuweisung aufgehoben"

**Idempotenz:**
- Aufheben einer nicht-existierenden Zuweisung → Success (kein Error)

### AC4: UI Personen-Liste mit Fahrzeug-Badge

**Given** Person ist einem Fahrzeug zugewiesen
**When** ich die Personen-Liste sehe
**Then** erscheint ein Badge mit dem Fahrzeug-Funkrufname neben dem Person-Namen
**And** Badge-Farbe entspricht FMS-Status (siehe FMS-Farben-Tabelle)
**And** Klick auf Badge öffnet das Zuweisungs-Dropdown

### AC5: UI Fahrzeug-Liste mit Besatzungs-Anzeige

**Given** Fahrzeug hat zugewiesene Personen
**When** ich die Fahrzeug-Liste sehe
**Then** erscheint eine kompakte Personen-Liste unter dem Fahrzeug
**And** max. 3 Namen werden angezeigt + "...+X weitere" wenn mehr
**And** Hover auf "+X weitere" zeigt alle Namen im Tooltip

**UI Details:**
- Format: "Max M., Anna S., ...+2 weitere"
- Sortierung: Nach Zuweisungszeitpunkt (neueste zuerst)
- Tooltip: Native `title` Attribut oder Headless UI Tooltip
- Klick auf Person → Navigation zur Person (optional Phase 2)

---

## Lookup Tables

### Error Code → HTTP Status Mapping

| Error Code | HTTP Status | Beschreibung |
|------------|-------------|--------------|
| `FAHRZEUG_NOT_IN_SAME_EINSATZ` | 400 Bad Request | Fahrzeug gehört zu anderem Einsatz |
| `FAHRZEUG_NOT_FOUND` | 404 Not Found | Fahrzeug-ID existiert nicht |
| `PERSON_NOT_FOUND` | 404 Not Found | Person-ID existiert nicht |
| `ALREADY_ASSIGNED_TO_FAHRZEUG` | 200 OK (Idempotent) | Bereits zugewiesen, kein Event |

### FMS-Status → Tailwind Farben

| FMS | Bedeutung | Tailwind Classes |
|-----|-----------|------------------|
| 1 | Frei über Funk | `bg-gray-100 text-gray-800` |
| 2 | Einsatzbereit auf Wache | `bg-green-100 text-green-800` |
| 3 | Einsatz übernommen | `bg-blue-100 text-blue-800` |
| 4 | Am Einsatzort | `bg-indigo-100 text-indigo-800` |
| 5 | Sprechwunsch | `bg-yellow-100 text-yellow-800` |
| 6 | Nicht einsatzbereit | `bg-red-100 text-red-800` |
| 7 | Patient aufgenommen | `bg-purple-100 text-purple-800` |
| 8 | Am Zielort | `bg-teal-100 text-teal-800` |
| 9 | Handfunkgerät | `bg-orange-100 text-orange-800` |

### Query Keys (Frontend)

| Verwendung | Query Key |
|------------|-----------|
| Personen-Liste | `QUERY_KEYS.kraefte.einsatzPersonen.list(einsatzId)` |
| Fahrzeug-Liste | `QUERY_KEYS.kraefte.einsatzFahrzeuge.list(einsatzId)` |
| ETB-Liste | `['etb', 'einsatz', einsatzId]` |

---

## Tasks / Subtasks

### Task 1: Schema Verification (AC: 2, 3) ✅ BEREITS VORHANDEN

> **KEIN NEUES SCHEMA NÖTIG!** Die Prisma Relation existiert bereits:

- [x] **1.1 Schema bereits vorhanden** - Verifiziere in `packages/backend/prisma/schema.prisma`:
  ```prisma
  model EinsatzPerson {
    // ... existing fields ...
    fahrzeugId        String?            // Nullable FK zu EinsatzFahrzeug
    fahrzeug          EinsatzFahrzeug?   @relation(fields: [fahrzeugId], references: [id])
  }

  model EinsatzFahrzeug {
    // ... existing fields ...
    personen          EinsatzPerson[]    // Inverse 1:N Relation
  }
  ```

- [x] **1.2 KEINE Migration nötig** - Schema ist bereits deployed

- [x] **1.3 Prisma Client aktuell?** - Falls Zweifel:
  ```bash
  pnpm --filter @bluelight-hub/backend prisma generate
  ```

### Task 2: Domain Layer - Aggregate + Events (AC: 2, 3)

- [x] **2.1 Domain Events erstellen**
  - Datei: `packages/backend/src/domain/kraefte/events/person-zu-fahrzeug-zugewiesen.event.ts`
  ```typescript
  import { DomainEvent } from '@domain/common/domain-event';

  export class PersonZuFahrzeugZugewiesenEvent extends DomainEvent {
    static readonly EVENT_NAME = 'person.zu_fahrzeug_zugewiesen';

    constructor(
      public readonly einsatzId: string,
      public readonly personId: string,
      public readonly fahrzeugId: string,
      public readonly personVorname: string,
      public readonly personNachname: string,
      public readonly fahrzeugFunkrufname: string,
      public readonly zugewiesenVon: string,
    ) {
      super(PersonZuFahrzeugZugewiesenEvent.EVENT_NAME);
    }
  }
  ```

  - Datei: `packages/backend/src/domain/kraefte/events/person-von-fahrzeug-entfernt.event.ts`
  ```typescript
  import { DomainEvent } from '@domain/common/domain-event';

  export class PersonVonFahrzeugEntferntEvent extends DomainEvent {
    static readonly EVENT_NAME = 'person.von_fahrzeug_entfernt';

    constructor(
      public readonly einsatzId: string,
      public readonly personId: string,
      public readonly fahrzeugId: string,
      public readonly personVorname: string,
      public readonly personNachname: string,
      public readonly fahrzeugFunkrufname: string,
      public readonly entferntVon: string,
    ) {
      super(PersonVonFahrzeugEntferntEvent.EVENT_NAME);
    }
  }
  ```

- [x] **2.2 Events in Outbox Serializer/Deserializer registrieren** ✅ ERLEDIGT
  - Datei: `packages/backend/src/infrastructure/outbox/event-serializer.ts`
  - Datei: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`
  - Beide Events MÜSSEN registriert werden, sonst werden sie nicht aus der Outbox gepublished!

- [x] **2.3 EinsatzPerson Aggregate erweitern**
  - Datei: `packages/backend/src/domain/kraefte/aggregates/einsatz-person.aggregate.ts`
  - **NEUE Felder im Constructor + Props:**
  ```typescript
  private _fahrzeugId?: string;  // NEU: Nullable Fahrzeug-Referenz

  get fahrzeugId(): string | undefined {
    return this._fahrzeugId;
  }
  ```

  - **NEUE Business Methods:**
  ```typescript
  /**
   * Weist die Person einem Fahrzeug zu.
   *
   * Emittiert PersonZuFahrzeugZugewiesenEvent für ETB-Eintrag.
   * Idempotent: Zuweisung zum gleichen Fahrzeug erzeugt kein Event.
   *
   * @param fahrzeugId - EinsatzFahrzeug-ID (CUID2)
   * @param fahrzeugFunkrufname - Für Event/ETB (denormalisiert)
   * @param updatedBy - User-ID für Audit
   * @returns Result<void>
   */
  assignToFahrzeug(
    fahrzeugId: string,
    fahrzeugFunkrufname: string,
    updatedBy: string,
  ): Result<void> {
    if (!isCuid(fahrzeugId)) {
      return Result.fail(EinsatzPersonError.format(
        EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR,
        'fahrzeugId muss ein gültiger CUID2-Identifier sein'
      ));
    }
    if (!isCuid(updatedBy)) {
      return Result.fail(EinsatzPersonError.format(
        EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR,
        'updatedBy muss ein gültiger CUID2-Identifier sein'
      ));
    }

    // Idempotenz: Bereits zugewiesen → kein Event
    if (this._fahrzeugId === fahrzeugId) {
      return Result.ok();
    }

    // State Update
    this._fahrzeugId = fahrzeugId;
    this._updatedBy = updatedBy;
    this.updateTimestamp();

    // Domain Event
    this.addDomainEvent(new PersonZuFahrzeugZugewiesenEvent(
      this._einsatzId,
      this._id.value,
      fahrzeugId,
      this._vorname,
      this._nachname,
      fahrzeugFunkrufname,
      updatedBy,
    ));

    return Result.ok();
  }

  /**
   * Entfernt die Fahrzeug-Zuweisung.
   *
   * Emittiert PersonVonFahrzeugEntferntEvent für ETB-Eintrag.
   * Idempotent: Entfernen ohne Zuweisung erzeugt kein Event.
   *
   * @param fahrzeugFunkrufname - Für Event/ETB (denormalisiert)
   * @param updatedBy - User-ID für Audit
   * @returns Result<void>
   */
  removeFromFahrzeug(
    fahrzeugFunkrufname: string,
    updatedBy: string,
  ): Result<void> {
    if (!isCuid(updatedBy)) {
      return Result.fail(EinsatzPersonError.format(
        EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR,
        'updatedBy muss ein gültiger CUID2-Identifier sein'
      ));
    }

    // Idempotenz: Nicht zugewiesen → Success (kein Event)
    if (!this._fahrzeugId) {
      return Result.ok();
    }

    const previousFahrzeugId = this._fahrzeugId;

    // State Update
    this._fahrzeugId = undefined;
    this._updatedBy = updatedBy;
    this.updateTimestamp();

    // Domain Event
    this.addDomainEvent(new PersonVonFahrzeugEntferntEvent(
      this._einsatzId,
      this._id.value,
      previousFahrzeugId,
      this._vorname,
      this._nachname,
      fahrzeugFunkrufname,
      updatedBy,
    ));

    return Result.ok();
  }
  ```

  - **Reconstitute Props erweitern:**
  ```typescript
  export interface ReconstituteEinsatzPersonProps {
    // ... existing fields ...
    fahrzeugId?: string;  // NEU
  }
  ```

- [x] **2.4 Error Codes erweitern**
  - Datei: `packages/backend/src/domain/kraefte/common/einsatz-person-error-codes.ts`
  ```typescript
  export const EINSATZ_PERSON_ERROR_CODES = {
    // ... existing codes ...
    FAHRZEUG_NOT_IN_SAME_EINSATZ: 'EINSATZ_PERSON_FAHRZEUG_NOT_IN_SAME_EINSATZ',
    FAHRZEUG_NOT_FOUND: 'EINSATZ_PERSON_FAHRZEUG_NOT_FOUND',
    ALREADY_ASSIGNED_TO_FAHRZEUG: 'EINSATZ_PERSON_ALREADY_ASSIGNED_TO_FAHRZEUG',
  } as const;
  ```

- [x] **2.5 Events Index exportieren**
  - Datei: `packages/backend/src/domain/kraefte/events/index.ts`
  ```typescript
  export * from './person-zu-fahrzeug-zugewiesen.event';
  export * from './person-von-fahrzeug-entfernt.event';
  ```

### Task 3: Application Layer - Commands + Handlers (AC: 2, 3) ✅ COMPLETE

- [x] **3.1 WeisePersonZuFahrzeugZuCommand erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.command.ts`
  ```typescript
  import { Result } from '@domain/common/result';
  import { isCuid } from '@paralleldrive/cuid2';

  export class WeisePersonZuFahrzeugZuCommand {
    private constructor(
      public readonly einsatzId: string,
      public readonly personId: string,
      public readonly fahrzeugId: string,
      public readonly updatedBy: string,
    ) {}

    public static create(props: {
      einsatzId: string;
      personId: string;
      fahrzeugId: string;
      updatedBy: string;
    }): Result<WeisePersonZuFahrzeugZuCommand> {
      if (!props.einsatzId?.trim()) {
        return Result.fail('einsatzId ist erforderlich');
      }
      if (!props.personId?.trim() || !isCuid(props.personId.trim())) {
        return Result.fail('personId muss ein gültiger CUID2-Identifier sein');
      }
      if (!props.fahrzeugId?.trim() || !isCuid(props.fahrzeugId.trim())) {
        return Result.fail('fahrzeugId muss ein gültiger CUID2-Identifier sein');
      }
      if (!props.updatedBy?.trim() || !isCuid(props.updatedBy.trim())) {
        return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
      }

      return Result.ok(new WeisePersonZuFahrzeugZuCommand(
        props.einsatzId.trim(),
        props.personId.trim(),
        props.fahrzeugId.trim(),
        props.updatedBy.trim(),
      ));
    }
  }
  ```

- [x] **3.2 WeisePersonZuFahrzeugZuHandler implementieren**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.handler.ts`
  ```typescript
  import { Injectable, Inject } from '@nestjs/common';
  import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
  import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
  import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
  import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
  import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
  import { ILogger } from '@domain/ports/i-logger.port';
  import { PrismaService } from '@infrastructure/database/prisma.service';
  import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';
  import { Result } from '@domain/common/result';
  import type { TransactionContext, DomainEvent } from '@domain/common/types';

  @Injectable()
  export class WeisePersonZuFahrzeugZuHandler extends TransactionalCommandHandler<
    WeisePersonZuFahrzeugZuCommand,
    void
  > {
    constructor(
      @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
      private readonly personRepository: IEinsatzPersonRepository,
      @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
      private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
      @Inject(OUTBOX_REPOSITORY)
      outboxRepository: IOutboxRepository,
      @Inject(LOGGER)
      private readonly logger: ILogger,
      prisma: PrismaService,
    ) {
      super(prisma, outboxRepository);
    }

    protected async executeInTransaction(
      command: WeisePersonZuFahrzeugZuCommand,
      tx: TransactionContext,
    ): Promise<{ result: void; events: DomainEvent[] }> {
      // 1. Person laden
      const personResult = await this.personRepository.findById(command.personId, tx);
      if (personResult.isFailure) {
        this.logger.error(`Person laden fehlgeschlagen: ${personResult.error}`, 'WeisePersonZuFahrzeugZuHandler');
        throw new Error(EinsatzPersonError.format(
          EINSATZ_PERSON_ERROR_CODES.NOT_FOUND,
          `Person ${command.personId} nicht gefunden`
        ));
      }

      const person = personResult.value;
      if (!person) {
        throw new Error(EinsatzPersonError.format(
          EINSATZ_PERSON_ERROR_CODES.NOT_FOUND,
          `Person ${command.personId} nicht gefunden`
        ));
      }

      // 2. Fahrzeug laden
      const fahrzeugResult = await this.fahrzeugRepository.findById(command.fahrzeugId, tx);
      if (fahrzeugResult.isFailure || !fahrzeugResult.value) {
        throw new Error(EinsatzPersonError.format(
          EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND,
          `Fahrzeug ${command.fahrzeugId} nicht gefunden`
        ));
      }

      const fahrzeug = fahrzeugResult.value;

      // 3. Validierung: Fahrzeug MUSS im gleichen Einsatz sein
      if (fahrzeug.einsatzId !== person.einsatzId) {
        throw new Error(EinsatzPersonError.format(
          EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_IN_SAME_EINSATZ,
          `Fahrzeug ${command.fahrzeugId} gehört nicht zum Einsatz ${command.einsatzId}`
        ));
      }

      // 4. Person zu Fahrzeug zuweisen (Domain Logic)
      const assignResult = person.assignToFahrzeug(
        fahrzeug.id.value,
        fahrzeug.funkrufname,
        command.updatedBy,
      );

      if (assignResult.isFailure) {
        throw new Error(assignResult.error);
      }

      // 5. Speichern
      const saveResult = await this.personRepository.save(person, tx);
      if (saveResult.isFailure) {
        throw new Error(saveResult.error);
      }

      // 6. Events extrahieren (für Outbox)
      const events = person.getDomainEvents();
      person.clearDomainEvents();

      // Logging ohne PII (GDPR)
      this.logger.log(
        `Person ${person.id.value} zu Fahrzeug ${fahrzeug.id.value} zugewiesen`,
        'WeisePersonZuFahrzeugZuHandler',
      );

      return { result: undefined, events };
    }
  }
  ```

- [x] **3.3 EntfernePersonVonFahrzeugCommand erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.command.ts`
  - Ähnliche Struktur wie WeisePersonZuFahrzeugZuCommand (ohne fahrzeugId)

- [x] **3.4 EntfernePersonVonFahrzeugHandler implementieren**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.handler.ts`
  - Lädt Person + aktuelles Fahrzeug (für Funkrufname), ruft `person.removeFromFahrzeug()` auf

- [x] **3.5 DTOs erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/dto/weise-person-zu-fahrzeug.dto.ts`
  ```typescript
  import { ApiProperty } from '@nestjs/swagger';
  import { IsString, IsNotEmpty } from 'class-validator';

  export class WeisePersonZuFahrzeugZuDto {
    @ApiProperty({
      description: 'ID des Fahrzeugs (CUID2)',
      example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    @IsString()
    @IsNotEmpty()
    fahrzeugId: string;
  }
  ```

- [x] **3.6 ETB Event Handler erstellen**
  - Datei: `packages/backend/src/application/etb/event-handlers/person-fahrzeug-zuweisung.handler.ts`
  ```typescript
  import { Injectable, Inject } from '@nestjs/common';
  import { OnEvent } from '@nestjs/event-emitter';
  import { ETB_REPOSITORY } from '@infrastructure/di-tokens';
  import { IEtbRepository } from '@domain/etb/repositories/i-etb.repository';
  import { PersonZuFahrzeugZugewiesenEvent, PersonVonFahrzeugEntferntEvent } from '@domain/kraefte/events';

  @Injectable()
  export class PersonFahrzeugZuweisungHandler {
    constructor(
      @Inject(ETB_REPOSITORY) private readonly etbRepository: IEtbRepository,
    ) {}

    @OnEvent(PersonZuFahrzeugZugewiesenEvent.EVENT_NAME)
    async handleZugewiesen(event: PersonZuFahrzeugZugewiesenEvent): Promise<void> {
      try {
        await this.etbRepository.addEintrag({
          einsatzId: event.einsatzId,
          kategorie: 'MASSNAHME',
          beschreibung: `${event.personVorname} ${event.personNachname} zu ${event.fahrzeugFunkrufname} zugewiesen`,
          timestampEreignis: event.occurredOn,
          createdBy: event.zugewiesenVon,
        });
      } catch (error) {
        // Fire-and-forget: Log but don't propagate
        console.error('ETB Eintrag fehlgeschlagen:', error);
      }
    }

    @OnEvent(PersonVonFahrzeugEntferntEvent.EVENT_NAME)
    async handleEntfernt(event: PersonVonFahrzeugEntferntEvent): Promise<void> {
      try {
        await this.etbRepository.addEintrag({
          einsatzId: event.einsatzId,
          kategorie: 'MASSNAHME',
          beschreibung: `${event.personVorname} ${event.personNachname} von ${event.fahrzeugFunkrufname} entfernt`,
          timestampEreignis: event.occurredOn,
          createdBy: event.entferntVon,
        });
      } catch (error) {
        // Fire-and-forget: Log but don't propagate
        console.error('ETB Eintrag fehlgeschlagen:', error);
      }
    }
  }
  ```

- [x] **3.7 Unit Tests für Handler**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/__tests__/weise-person-zu-fahrzeug.handler.spec.ts`
  - Test Cases:
    - Success: Person zu Fahrzeug zugewiesen
    - Validation: Fahrzeug nicht im gleichen Einsatz → Failure
    - Validation: Person nicht gefunden → Failure
    - Validation: Fahrzeug nicht gefunden → Failure
    - Idempotenz: Bereits zugewiesen → Success ohne Event
  - **KRITISCH:**
    - `jest.clearAllMocks()` in `beforeEach()`
    - `jest.Mocked<T>` für Repository Mocks
    - Given-When-Then Kommentare (AAA Pattern)

### Task 4: API Layer - Controller Endpoints (AC: 2, 3) ✅ COMPLETE

- [x] **4.1 EinsatzPersonenController erweitern**
  - Datei: `packages/backend/src/modules/kraefte/controllers/einsatz-personen.controller.ts`
  ```typescript
  @Put(':personId/fahrzeug')
  @ApiOperation({ summary: 'Person zu Fahrzeug zuweisen' })
  @ApiParam({ name: 'einsatzId', description: 'Einsatz ID' })
  @ApiParam({ name: 'personId', description: 'Person ID' })
  @ApiWrappedResponse(EinsatzPersonDto, { description: 'Person erfolgreich zugewiesen' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder Fahrzeug nicht im gleichen Einsatz' })
  @ApiNotFoundResponse({ description: 'Person oder Fahrzeug nicht gefunden' })
  async weiseZuFahrzeugZu(
    @Param('einsatzId') einsatzId: string,
    @Param('personId') personId: string,
    @Body() dto: WeisePersonZuFahrzeugZuDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WrappedResponse<EinsatzPersonDto>> {
    const commandResult = WeisePersonZuFahrzeugZuCommand.create({
      einsatzId,
      personId,
      fahrzeugId: dto.fahrzeugId,
      updatedBy: user.sub,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    try {
      await this.weiseZuFahrzeugHandler.execute(commandResult.value!);
    } catch (error) {
      // Map Error Codes to HTTP Status
      if (EinsatzPersonError.hasCode(error.message, EINSATZ_PERSON_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(error.message);
      }
      if (EinsatzPersonError.hasCode(error.message, EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND)) {
        throw new NotFoundException(error.message);
      }
      if (EinsatzPersonError.hasCode(error.message, EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_IN_SAME_EINSATZ)) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message);
    }

    // Reload Person für Response
    const personResult = await this.getHandler.execute({ personId });
    if (personResult.isFailure) {
      throw new BadRequestException(personResult.error);
    }

    return { data: personResult.value! };
  }

  @Delete(':personId/fahrzeug')
  @ApiOperation({ summary: 'Fahrzeug-Zuweisung aufheben' })
  @ApiParam({ name: 'einsatzId', description: 'Einsatz ID' })
  @ApiParam({ name: 'personId', description: 'Person ID' })
  @ApiWrappedResponse(EinsatzPersonDto, { description: 'Zuweisung erfolgreich aufgehoben' })
  async entferneVonFahrzeug(
    @Param('einsatzId') einsatzId: string,
    @Param('personId') personId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<WrappedResponse<EinsatzPersonDto>> {
    // ... ähnliche Implementierung mit EntfernePersonVonFahrzeugCommand
  }
  ```

- [x] **4.2 Handler DI Registration** ✅ ERLEDIGT
  - Datei: `packages/backend/src/modules/kraefte/kraefte.module.ts`
  - `WeisePersonZuFahrzeugZuHandler` und `EntfernePersonVonFahrzeugHandler` zu `providers` hinzufügen
  - `PersonFahrzeugZuweisungHandler` (ETB Event Handler) zu `providers` hinzufügen

- [x] **4.3 EinsatzPersonDto erweitern**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/dto/einsatz-person.dto.ts`
  ```typescript
  @ApiPropertyOptional({ description: 'Zugewiesenes Fahrzeug ID' })
  fahrzeugId?: string;

  @ApiPropertyOptional({ description: 'Zugewiesenes Fahrzeug Funkrufname (denormalisiert)' })
  fahrzeugFunkrufname?: string;

  @ApiPropertyOptional({ description: 'FMS Status des zugewiesenen Fahrzeugs' })
  fahrzeugFmsStatus?: number;
  ```

- [x] **4.4 API Client regenerieren**
  ```bash
  pnpm run generate-api
  ```
  - Verifiziert: `EinsatzPersonenApi.weiseZuFahrzeugZuVAlpha()` und `entferneVonFahrzeugVAlpha()` in `packages/shared/client/`

### Task 5: Frontend - UI Components (AC: 1, 4, 5) ✅ COMPLETE

- [x] **5.1 Hooks erstellen**
  - Datei: `packages/frontend/src/features/einsatz/api/use-weise-person-zu-fahrzeug.ts`
  ```typescript
  import { useMutation, useQueryClient } from '@tanstack/react-query';
  import { api } from '@/shared/api/api';
  import { QUERY_KEYS } from '@/queryKeys';
  import { toast } from '@/shared/ui/atoms/toast';

  export const useWeisePersonZuFahrzeugZu = (einsatzId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: { personId: string; fahrzeugId: string }) => {
        return api.einsatzPersonen().weiseZuFahrzeugZuVAlpha(
          einsatzId,
          data.personId,
          { fahrzeugId: data.fahrzeugId },
        );
      },
      // Optimistic Update
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: QUERY_KEYS.kraefte.einsatzPersonen.list(einsatzId),
        });
        // Store previous value for rollback
        const previousPersonen = queryClient.getQueryData(
          QUERY_KEYS.kraefte.einsatzPersonen.list(einsatzId)
        );
        return { previousPersonen };
      },
      onSuccess: (response) => {
        // Beide Listen invalidieren
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.kraefte.einsatzPersonen.list(einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.kraefte.einsatzFahrzeuge.list(einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: ['etb', 'einsatz', einsatzId],
        });
        toast.success(`Person zu ${response.data.fahrzeugFunkrufname} zugewiesen`);
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (context?.previousPersonen) {
          queryClient.setQueryData(
            QUERY_KEYS.kraefte.einsatzPersonen.list(einsatzId),
            context.previousPersonen
          );
        }
        toast.error(`Zuweisung fehlgeschlagen: ${error.message}`);
      },
    });
  };

  export const useEntfernePersonVonFahrzeug = (einsatzId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (personId: string) => {
        return api.einsatzPersonen().entferneVonFahrzeugVAlpha(einsatzId, personId);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.kraefte.einsatzPersonen.list(einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.kraefte.einsatzFahrzeuge.list(einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: ['etb', 'einsatz', einsatzId],
        });
        toast.success('Zuweisung aufgehoben');
      },
      onError: (error) => {
        toast.error(`Fehler: ${error.message}`);
      },
    });
  };
  ```

- [x] **5.2 FMS Status Badge Component**
  - Datei: `packages/frontend/src/features/einsatz/ui/atoms/FmsStatusBadge.tsx`
  ```typescript
  import { cn } from '@/shared/ui/cn';

  const FMS_COLOR_MAP: Record<number, string> = {
    1: 'bg-gray-100 text-gray-800',
    2: 'bg-green-100 text-green-800',
    3: 'bg-blue-100 text-blue-800',
    4: 'bg-indigo-100 text-indigo-800',
    5: 'bg-yellow-100 text-yellow-800',
    6: 'bg-red-100 text-red-800',
    7: 'bg-purple-100 text-purple-800',
    8: 'bg-teal-100 text-teal-800',
    9: 'bg-orange-100 text-orange-800',
  };

  export const FmsStatusBadge = ({ status }: { status: number }) => (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      FMS_COLOR_MAP[status] ?? 'bg-gray-100 text-gray-800'
    )}>
      FMS {status}
    </span>
  );
  ```

- [x] **5.3 FahrzeugZuweisungsDropdown Component**
  - Datei: `packages/frontend/src/features/einsatz/ui/molecules/FahrzeugZuweisungsDropdown.tsx`
  ```typescript
  import { Listbox } from '@headlessui/react';
  import { TruckIcon, CheckIcon } from '@heroicons/react/24/outline';
  import { cn } from '@/shared/ui/cn';
  import { FmsStatusBadge } from '../atoms/FmsStatusBadge';

  interface FahrzeugZuweisungsDropdownProps {
    einsatzId: string;
    personId: string;
    currentFahrzeugId?: string;
    fahrzeuge: Array<{ id: string; funkrufname: string; fmsStatus: number }>;
    onAssign: (fahrzeugId: string | null) => void;
    isLoading?: boolean;
  }

  export const FahrzeugZuweisungsDropdown: React.FC<FahrzeugZuweisungsDropdownProps> = ({
    currentFahrzeugId,
    fahrzeuge,
    onAssign,
    isLoading,
  }) => {
    const selectedFahrzeug = fahrzeuge.find(f => f.id === currentFahrzeugId);

    return (
      <Listbox
        value={currentFahrzeugId ?? null}
        onChange={(value) => onAssign(value)}
        disabled={isLoading}
      >
        <div className="relative">
          <Listbox.Button className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
            selectedFahrzeug ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            isLoading && "opacity-50 cursor-not-allowed",
          )}>
            <TruckIcon className="h-4 w-4" />
            {isLoading ? (
              <span className="animate-pulse">...</span>
            ) : (
              selectedFahrzeug?.funkrufname ?? 'Zuweisen'
            )}
          </Listbox.Button>

          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-56 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {/* "Keine Zuweisung" Option */}
            <Listbox.Option
              value={null}
              className={({ active }) => cn(
                "cursor-pointer select-none relative py-2 pl-10 pr-4",
                active ? "bg-blue-100 text-blue-900" : "text-gray-900",
              )}
            >
              Keine Zuweisung
            </Listbox.Option>

            {fahrzeuge.map((fahrzeug) => (
              <Listbox.Option
                key={fahrzeug.id}
                value={fahrzeug.id}
                className={({ active }) => cn(
                  "cursor-pointer select-none relative py-2 pl-10 pr-4",
                  active ? "bg-blue-100 text-blue-900" : "text-gray-900",
                )}
              >
                {({ selected }) => (
                  <>
                    {selected && <CheckIcon className="absolute left-3 h-4 w-4 text-blue-600" />}
                    <span className="flex items-center gap-2">
                      {fahrzeug.funkrufname}
                      <FmsStatusBadge status={fahrzeug.fmsStatus} />
                    </span>
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    );
  };
  ```

- [x] **5.4 PersonenListe erweitern mit Fahrzeug-Badge**
  - Datei: `packages/frontend/src/features/einsatz/ui/organisms/PersonenListe.tsx`
  - Integration des FahrzeugZuweisungsDropdown in jede Person-Zeile

- [x] **5.5 FahrzeugeListe erweitern mit Besatzungs-Anzeige**
  - Datei: `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugeListe.tsx`
  - Zeige zugewiesene Personen als Pills unter Fahrzeug-Name
  - Tooltip für "+X weitere" via `title` Attribut:
  ```typescript
  {besatzung.length > 3 && (
    <span
      className="text-gray-500 cursor-help"
      title={besatzung.slice(3).map(p => `${p.vorname} ${p.nachname}`).join(', ')}
    >
      ...+{besatzung.length - 3} weitere
    </span>
  )}
  ```

- [x] **5.6 Tauri Compatibility Check**
  - Prüfen ob Headless UI Listbox in Tauri Desktop korrekt funktioniert
  - Falls nicht: Fallback mit nativen `<select>` Element

### Task 6: Infrastructure Layer Updates ✅ COMPLETE

- [x] **6.1 Repository erweitern: fahrzeugId Update**
  - Datei: `packages/backend/src/infrastructure/kraefte/repositories/prisma-einsatz-person.repository.ts`
  - `save()` Methode: `fahrzeugId` ins Upsert aufnehmen (nullable → null in DB)

- [x] **6.2 Mapper erweitern**
  - Datei: `packages/backend/src/infrastructure/kraefte/mappers/prisma-einsatz-person.mapper.ts`
  - `toDomain()`: `fahrzeugId` aus DB lesen (null → undefined)
  - `toPersistence()`: `fahrzeugId` in DB schreiben (undefined → null)

- [ ] **6.3 Query erweitern: Fahrzeuge mit Besatzung** (Frontend Task)
  - Datei: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.handler.ts`
  - Erweitern mit `include: { besatzung: { select: { id: true, vorname: true, nachname: true } } }`
  - Oder: Neuer Query Handler `GetEinsatzFahrzeugeMitBesatzungHandler`

- [ ] **6.4 EinsatzPersonDto Mapper für fahrzeugFunkrufname** (Frontend Task)
  - Beim Laden der Person: Fahrzeug-Daten denormalisiert mitlesen
  - Query: `include: { einsatzFahrzeug: { select: { funkrufname: true, fmsStatus: true } } }`

### Task 7: Testing & Validation

- [ ] **7.1 Unit Tests: Commands**
  - Command Validation Tests (CUID2 Format, Pflichtfelder)

- [ ] **7.2 Unit Tests: Handlers**
  - WeisePersonZuFahrzeugZuHandler (AAA Pattern)
  - EntfernePersonVonFahrzeugHandler (AAA Pattern)

- [ ] **7.3 Unit Tests: Domain Aggregate**
  - `EinsatzPerson.assignToFahrzeug()` Tests
  - `EinsatzPerson.removeFromFahrzeug()` Tests
  - Idempotenz-Tests

- [ ] **7.4 Integration Tests: Repository**
  - Save/Load mit fahrzeugId
  - Null-Handling (undefined → null in DB)

- [ ] **7.5 E2E Tests (Claude-in-Chrome)**
  - Login: `rubeen` / `MyPass123*`
  - Vollständiger Flow: Person → Dropdown → Auswahl → Toast
  - Prüfen: ETB-Eintrag wurde erstellt

---

## Dev Notes

### Architektur-Patterns

- **Hexagonal Architecture:** Domain ← Application ← Infrastructure
- **TransactionalCommandHandler:** Atomare Event-Persistierung mit Outbox Pattern
- **Snapshot Pattern:** Fahrzeug-Funkrufname wird im Event denormalisiert (für ETB-Eintrag ohne Join)
- **Idempotenz:** Doppelte Zuweisung → Success ohne Event (kein ETB-Spam)
- **Fire-and-Forget:** ETB Event Handler fängt Fehler, propagiert sie nicht

### Kritische Design-Entscheidungen

1. **fahrzeugId auf EinsatzPerson (1:N):** Einfachste Lösung, Person kann nur einem Fahrzeug zugewiesen sein
2. **OnDelete: SetNull:** Wenn Fahrzeug gelöscht → Zuweisung automatisch entfernt
3. **Denormalisierter Funkrufname im Event:** Für ETB-Eintrag ohne zusätzlichen Join
4. **Keine separate Zuweisungs-Tabelle:** Keine Historie nötig, Komplexität vermeiden

### Testing Standards

- **AAA Pattern:** Given-When-Then mit Kommentaren
- **jest.clearAllMocks()** in beforeEach
- **jest.Mocked<T>** für Type-Safe Mocks
- **Result Pattern:** Test auf `isSuccess`/`isFailure`

### GDPR Compliance

- **Keine PII in Logs:** Nur technische IDs loggen (personId, fahrzeugId)
- **ETB-Einträge enthalten Namen:** Das ist gewollt (Einsatzdokumentation)

### Project Structure Notes

| Layer | Pfad | Neue Dateien |
|-------|------|--------------|
| Domain | `src/domain/kraefte/` | `events/person-zu-fahrzeug-*.ts`, Aggregate erweitert |
| Application | `src/application/kraefte/einsatz-personen/commands/` | `weise-person-zu-fahrzeug/`, `entferne-person-von-fahrzeug/` |
| Application | `src/application/etb/event-handlers/` | `person-fahrzeug-zuweisung.handler.ts` |
| Infrastructure | `src/infrastructure/kraefte/` | Repository + Mapper erweitert |
| Infrastructure | `src/infrastructure/outbox/` | Serializer/Deserializer erweitert |
| Modules | `src/modules/kraefte/controllers/` | Controller erweitert |
| Frontend | `src/features/einsatz/` | `api/use-weise-person-*.ts`, `ui/molecules/FahrzeugZuweisungsDropdown.tsx` |

### References

- [Source: docs/epics.md#Story-4.3] - Original Story Definition
- [Source: docs/architecture/3-backend-architecture.md] - Hexagonal Architecture
- [Source: docs/adr/ADR-028-transactional-outbox-pattern.md] - Outbox Pattern
- [Source: packages/backend/src/domain/kraefte/aggregates/einsatz-person.aggregate.ts] - Bestehendes Aggregate
- [Source: packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts] - Fahrzeug Aggregate Pattern

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Learnings from Previous Stories

**Story 4.2 (QR-Code Registrierung):**
- TransactionalCommandHandler Pattern funktioniert zuverlässig
- Tauri Barcode Scanner mit html5-qrcode Fallback
- Memory Leak Prevention: Cleanup in useEffect
- Race Condition: Video play() interrupted fix
- GDPR: Keine PII in Logs
- Fire-and-Forget: ETB Handler fängt Fehler ab

**Story 4.1 (Manuelle Registrierung):**
- Two-Factory Pattern: `createFromStammPerson()` + `createTemporary()`
- Snapshot Pattern: Daten KOPIEREN, nicht referenzieren
- Autocomplete mit 300ms Debounce
- Optimistic Updates für bessere UX

**Story 3.1 (Fahrzeug aus Stammdaten):**
- EinsatzFahrzeug Aggregate als Referenz-Pattern
- FMS-Status Handling
- Funkrufname als primärer Identifier

### Git Intelligence (Recent Commits)

```
73732508 🐛(kraefte): Fix critical memory leaks and race condition in QR scanner
bcff96fe 🐛(kraefte): Fix barcode-scanner for desktop Tauri
72d1719c ✨(kraefte): Add Tauri barcode-scanner support and improve QR detection
57362bd1 🐛(kraefte): Fix QrScannerTab infinite loop and Tauri compatibility
50aba091 🐛(kraefte): Fix video play() interrupted error in QrScannerTab
49e3f254 ✨(kraefte): Implement QR code person registration (Story 4-2)
```

**Patterns aus Commits:**
- Emoji Commit Format: `<emoji>(<context>): <title>`
- Memory Leak Awareness: Cleanup Hooks
- Tauri Compatibility: Fallback-Strategien

### Completion Notes List

- [ ] Schema Migration ausgeführt
- [ ] Domain Events registriert in Outbox Deserializer/Serializer ⚠️
- [ ] Handler in KraefteModule registriert ⚠️
- [ ] ETB Event Handler registriert
- [ ] API Client regeneriert
- [ ] Frontend Hooks getestet
- [ ] FMS-Farben-Mapping implementiert
- [ ] Optimistic Updates funktionieren
- [ ] Tauri Compatibility geprüft
- [ ] Unit Tests grün
- [ ] E2E Test (optional)

### File List

_Wird vom Dev Agent während Implementierung gefüllt_

---

## ⚠️ CRITICAL Anti-Patterns (Story 4.2 Learnings)

### Memory Leak Prevention

```typescript
// ❌ FALSCH - Story 4.2 hatte Memory Leaks:
useEffect(() => {
  someAsyncOperation();
  // Kein Cleanup!
}, []);

// ✅ RICHTIG - IMMER Cleanup:
useEffect(() => {
  let mounted = true;
  someAsyncOperation().then(result => {
    if (mounted) setState(result);
  });
  return () => { mounted = false; };
}, []);
```

### Race Condition Prevention

```typescript
// ❌ FALSCH - Race Condition möglich:
const handleAssign = async (fahrzeugId: string) => {
  await mutation.mutateAsync({ fahrzeugId }); // Mehrfach-Klick möglich!
};

// ✅ RICHTIG - Guard mit isPending:
const handleAssign = async (fahrzeugId: string) => {
  if (mutation.isPending) return; // Guard!
  await mutation.mutateAsync({ fahrzeugId });
};
```

### AAA Test Pattern (AC6)

```typescript
// ✅ RICHTIG - Given-When-Then:
describe('WeisePersonZuFahrzeugZuHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // POSITION 1: VOR Mock Setup!
  });

  it('should assign person to fahrzeug', async () => {
    // Given (Arrange)
    const command = WeisePersonZuFahrzeugZuCommand.create({...}).value!;
    mockPersonRepository.findById.mockResolvedValue(Result.ok(person));

    // When (Act)
    const result = await handler.execute(command);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockPersonRepository.save).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object) // TransactionContext
    );
  });
});
```

### DI Import Check (AC1)

```typescript
// ❌ FALSCH - bricht NestJS DI zur Laufzeit:
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories';

// ✅ RICHTIG - Runtime Symbol erhalten:
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories';
```

### Controller Response Decorator (AC7)

```typescript
// ❌ FALSCH - Falsches OpenAPI Schema:
@ApiOkResponse({ type: EinsatzPersonDto })

// ✅ RICHTIG - Wrapper mit data/meta:
@ApiWrappedResponse(EinsatzPersonDto, { description: '...' })
```

---

## 🔧 Critical Infrastructure Checklist

Diese Schritte werden oft vergessen und führen zu Runtime-Fehlern:

| # | Schritt | Datei | Warum kritisch |
|---|---------|-------|----------------|
| 1 | **Events in Serializer registrieren** | `event-serializer.ts` | Sonst werden Events NICHT aus Outbox gepublished |
| 2 | **Events in Deserializer registrieren** | `event-deserializer.ts` | Sonst werden Events beim Replay nicht erkannt |
| 3 | **Handler in Module registrieren** | `kraefte.module.ts` | Sonst 500 Error: "No provider for Handler" |
| 4 | **ETB Handler registrieren** | `kraefte.module.ts` | Sonst keine ETB-Einträge |
| 5 | **API Client regenerieren** | Terminal | Sonst TypeScript-Fehler im Frontend |
| 6 | **Query Keys prüfen** | `queryKeys.ts` | Sonst Cache-Invalidierung funktioniert nicht |

---

**Story validated and enhanced by SM agent with 4 parallel subagents - comprehensive developer guide created**
