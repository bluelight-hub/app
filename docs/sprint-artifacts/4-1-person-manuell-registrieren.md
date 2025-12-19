# Story 4.1: Person manuell registrieren

**Status:** In Progress

---

## Blocker / Prerequisites

| Blocker | Status | Beschreibung |
|---------|--------|--------------|
| ⚠️ **Story 4.0 Schema Update** | REQUIRED | `funktion: String` Feld muss zu EinsatzPerson Model hinzugefügt werden (Epic 4 Requirement) |

**Action Required:** Vor Implementation muss Story 4.0 erweitert werden:
```prisma
model EinsatzPerson {
  // ... existing fields
  funktion    String  @db.VarChar(50)  // Epic 4 AC1: Pflichtfeld
}
```

---

## Quick Context

| Aspekt | Details |
|--------|---------|
| **Entities** | `EinsatzPerson` Aggregate, `EinsatzPersonId` VO |
| **Pattern** | Two Factories: `createFromStammPerson()` + `createTemporary()` |
| **API** | `POST /api/v-alpha/einsaetze/:einsatzId/personen` |
| **Events** | `EinsatzPersonHinzugefuegtEvent` → ETB Auto-Eintrag |
| **Frontend** | Combobox mit Debounce (300ms via useDebouncedValue), Multi-Select Qualifikationen |
| **Aufwand** | ~2-3 Tage |

**Task Dependencies:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## Story

**Als** FüKw (Sandra),
**möchte ich** eine Person manuell für den Einsatz registrieren,
**damit** ich auch bei defektem Scanner alle Helfer erfassen kann.

---

## Acceptance Criteria

### AC1: Manuelles Registrierungsformular

**Given** ich bin auf der Einsatz-Detail-Seite eines aktiven Einsatzes
**When** ich "Person hinzufügen" → "Manuell" klicke
**Then** öffnet sich ein Formular mit:
- Nachname (required, Text Input mit Autocomplete aus Stammdaten)
- Vorname (required, Text Input)
- Funktion (required, Select Dropdown mit vordefinierten Rollen)
- Qualifikationen (optional, Multi-Select aus aktiven Qualifikationen)

**Funktion-Optionen:** `Helfer`, `Rettungshelfer`, `Rettungssanitäter`, `Gruppenführer`, `Zugführer`, `Sonstige`

**UI Details:**
- Dialog mit Headless UI `<Dialog>` Component
- Nachname-Feld mit Combobox für Autocomplete
- Funktion als `<Listbox>` Dropdown
- Qualifikationen als Multi-Select Listbox

### AC2: Stammdaten-Autocomplete (Nachname-Feld)

**Given** ich tippe im Nachname-Feld
**When** mindestens 1 Zeichen eingegeben wurde (mit 300ms Debounce via @tanstack/pacer)
**Then**:
- werden Autocomplete-Vorschläge aus `StammPerson` Stammdaten geladen
- max. 10 Treffer angezeigt (sortiert nach Nachname)
- Vorschläge zeigen: `{nachname}, {vorname} • {qualifikationen}`

**When** ich einen Vorschlag auswähle
**Then**:
- werden folgende Felder automatisch ausgefüllt:
  - Vorname (aus Stammdaten)
  - Funktion (aus Stammdaten - primäre Funktion, User kann überschreiben)
  - Qualifikationen (als Vorschlag vorausgewählt, User kann modifizieren)
- `stammId` wird intern gesetzt

**When** ich ohne Autocomplete-Auswahl fortfahre
**Then**:
- kann ich manuell Vorname + Funktion eingeben
- `stammId` bleibt `null` (temporäre Person)

### AC3: Registrierung mit/ohne Stammdaten

**Given** ich habe Pflichtfelder (Nachname, Vorname, Funktion) ausgefüllt
**When** ich "Registrieren" klicke
**Then**:
- wird `EinsatzPerson` erstellt mit:
  - `stammId` gesetzt wenn aus Autocomplete, sonst `null`
  - `vorname`, `nachname`, `funktion` KOPIERT (Snapshot Pattern!)
  - `qualifikationen` KOPIERT (falls ausgewählt)
- Domain Event `EinsatzPersonHinzugefuegtEvent` wird emittiert
- Event wird atomar in Outbox gespeichert (TransactionalCommandHandler)
- ETB-Eintrag wird automatisch erstellt: "Person {vorname} {nachname} ({funktion}) registriert"

**Bei Duplikat (gleiche StammPerson bereits erfasst):**
- Handler gibt `Result.fail(EINSATZ_PERSON_ERRORS.DUPLICATE_PERSON)` zurück (NICHT throw!)
- Controller übersetzt zu HTTP 409 Conflict

### AC4: UI Feedback

**Given** Registrierung erfolgreich
**When** Response zurückkommt
**Then**:
- Person erscheint sofort in der Personen-Liste
- Success-Toast zeigt "Person registriert"
- Dialog schließt sich automatisch

**Given** Fehler bei Registrierung
**When** z.B. Duplikat-Fehler (409)
**Then**:
- Error-Toast zeigt Fehlermeldung
- Dialog bleibt offen zur Korrektur

---

## Tasks / Subtasks

### Task 1: Domain Layer (AC: 2, 3)

- [x] **1.1 `EinsatzPersonId` Value Object erstellen**
  - Datei: `packages/backend/src/domain/kraefte/value-objects/einsatz-person-id.ts`
  - Extends `EntityId` mit CUID Validierung (analog zu `EinsatzFahrzeugId`)

- [x] **1.2 `EINSATZ_PERSON_ERRORS` Error-Codes erstellen**
  - Datei: `packages/backend/src/domain/kraefte/common/einsatz-person-error-codes.ts`
  - Codes: `INVALID_QUALIFIKATION`, `DUPLICATE_PERSON`, `STAMM_NOT_FOUND`

- [x] **1.3 `EinsatzPerson` Aggregate erstellen**
  - Datei: `packages/backend/src/domain/kraefte/aggregates/einsatz-person.aggregate.ts`
  - Private constructor + Two Factory Pattern:
    - `createFromStammPerson()` - KOPIERT Daten, setzt `stammId`
    - `createTemporary()` - Manuelle Eingabe, `stammId = undefined`
  - `EinsatzPersonHinzugefuegtEvent` Domain Event emittieren

- [x] **1.4 `IEinsatzPersonRepository` Interface erstellen**
  - Datei: `packages/backend/src/domain/kraefte/repositories/i-einsatz-person.repository.ts`
  - Methods: `save()`, `findById()`, `findByEinsatzId()`, `existsByEinsatzIdAndStammId()`

- [x] **1.5 `EinsatzPersonHinzugefuegtEvent` Domain Event erstellen**
  - Datei: `packages/backend/src/domain/kraefte/events/einsatz-person-hinzugefuegt.event.ts`
  - Properties: `einsatzId`, `einsatzPersonId`, `stammId?`, `vorname`, `nachname`, `registriertVon`

- [x] **1.6 Unit Tests für EinsatzPerson Aggregate**
  - Datei: `packages/backend/src/domain/kraefte/aggregates/__tests__/einsatz-person.aggregate.spec.ts`
  - Tests: Two Factories, Domain Event Emission, Validation (31 Tests)
  - Pattern: AAA mit Given-When-Then Kommentaren

### Task 2: Infrastructure Layer (AC: 3)

- [ ] **2.1 `PrismaEinsatzPersonRepository` implementieren**
  - Datei: `packages/backend/src/infrastructure/kraefte/repositories/prisma-einsatz-person.repository.ts`
  - NULL → undefined Mapping für: `stammId`, `funkrufname`, `position`, `updatedBy`
  - Eager Loading: `qualifikationen` includen
  - Transaction Context Support (`tx?: TransactionContext`)

- [ ] **2.2 `PrismaEinsatzPersonMapper` erstellen**
  - Datei: `packages/backend/src/infrastructure/kraefte/mappers/prisma-einsatz-person.mapper.ts`
  - `toDomain()` und `toPersistence()` Methoden
  - Qualifikationen M:N Mapping

- [ ] **2.3 DI Token registrieren**
  - Datei: `packages/backend/src/infrastructure/di-tokens.ts`
  - Token: `DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON`
  ```typescript
  export const DI_TOKENS = {
    KRAEFTE: {
      REPOSITORIES: {
        EINSATZ_FAHRZEUG: Symbol('IEinsatzFahrzeugRepository'),
        EINSATZ_PERSON: Symbol('IEinsatzPersonRepository'), // NEU
        STAMM_PERSON: Symbol('IStammPersonRepository'),
      },
    },
    // ...
  } as const;
  ```

- [ ] **2.4 Module Provider + Export aktualisieren**
  - Datei: `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts`
  - NUR Token exportieren, NICHT konkrete Klasse!
  ```typescript
  @Module({
    providers: [
      {
        provide: DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON,
        useClass: PrismaEinsatzPersonRepository,
      },
    ],
    exports: [
      DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON, // Token exportieren
    ],
  })
  export class KraefteInfrastructureModule {}
  ```

### Task 3: Application Layer (AC: 2, 3)

- [ ] **3.1 `RegistrierePersonCommand` erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.command.ts`
  - Properties: `einsatzId`, `stammPersonId?`, `vorname`, `nachname`, `funktion`, `qualifikationIds[]`, `registriertVon`
  - **Private Constructor + Static Factory Pattern:**
  ```typescript
  export class RegistrierePersonCommand {
    private constructor(
      public readonly einsatzId: EinsatzId,
      public readonly stammPersonId: StammPersonId | undefined,
      public readonly vorname: string,
      public readonly nachname: string,
      public readonly funktion: string,
      public readonly qualifikationIds: QualifikationId[],
      public readonly registriertVon: string,
    ) {}

    public static create(props: {
      einsatzId: string;
      stammPersonId?: string;
      vorname: string;
      nachname: string;
      funktion: string;
      qualifikationIds: string[];
      registriertVon: string;
    }): Result<RegistrierePersonCommand> {
      // Validation
      if (!props.vorname?.trim()) {
        return Result.fail('Vorname darf nicht leer sein');
      }
      if (!props.nachname?.trim()) {
        return Result.fail('Nachname darf nicht leer sein');
      }
      if (!props.funktion?.trim()) {
        return Result.fail('Funktion darf nicht leer sein');
      }

      return Result.ok(new RegistrierePersonCommand(
        EinsatzId.fromString(props.einsatzId),
        props.stammPersonId ? StammPersonId.fromString(props.stammPersonId) : undefined,
        props.vorname.trim(),
        props.nachname.trim(),
        props.funktion.trim(),
        props.qualifikationIds.map(id => QualifikationId.fromString(id)),
        props.registriertVon,
      ));
    }
  }
  ```

- [ ] **3.2 `RegistrierePersonHandler` implementieren**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.handler.ts`
  - EXTENDS `TransactionalCommandHandler` für Outbox Pattern
  - **Inject Logger Port** (AC3 Compliance)
  - Lädt StammPerson (falls stammPersonId), erstellt EinsatzPerson, prüft Duplikate
  - Bei Duplikat: `return Result.fail()` statt throw

- [ ] **3.3 DTOs erstellen mit vollständiger Validation**
  - `RegistrierePersonDto`: { stammPersonId?, vorname, nachname, funktion, qualifikationIds[] }
  - `EinsatzPersonDto`: Response DTO mit allen Feldern
  ```typescript
  export class RegistrierePersonDto {
    @ApiProperty({ description: 'StammPerson ID (optional für Autocomplete)' })
    @IsOptional()
    @IsString()
    stammPersonId?: string;

    @ApiProperty({ description: 'Vorname der Person' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    vorname: string;

    @ApiProperty({ description: 'Nachname der Person' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    nachname: string;

    @ApiProperty({ description: 'Funktion/Rolle im Einsatz' })
    @IsString()
    @IsNotEmpty()
    funktion: string;

    @ApiProperty({ description: 'Qualifikation IDs', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    qualifikationIds?: string[];
  }
  ```

- [ ] **3.4 `GetEinsatzPersonenQuery` + Handler erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/queries/get-einsatz-personen/`
  - Liste aller EinsatzPersonen für einen Einsatz

- [ ] **3.5 `SucheStammPersonenQuery` + Handler erstellen**
  - Datei: `packages/backend/src/application/kraefte/stamm-personen/queries/suche-stamm-personen/`
  - Autocomplete-Suche: `nachname LIKE '%{query}%'`, max 10 Treffer
  - Returns: `StammPersonSucheDto[]` mit id, vorname, nachname, qualifikationen

- [ ] **3.6 ETB Auto-Creation Handler erweitern**
  - Datei: `packages/backend/src/application/etb/event-handlers/einsatz-person-hinzugefuegt.handler.ts`
  - `EinsatzPersonHinzugefuegtEvent` subscriben
  - ETB-Eintrag erstellen: "Person {vorname} {nachname} registriert"

- [ ] **3.7 Unit Tests für Handler**
  - Success Case (mit/ohne StammPerson)
  - Duplikat-Fehler Case
  - StammPerson nicht gefunden Case
  - Transaction Behavior Tests

### Task 4: API Layer (AC: 1, 2, 4)

- [ ] **4.1 `EinsatzPersonenController` erstellen**
  - Datei: `packages/backend/src/modules/kraefte/controllers/einsatz-personen.controller.ts`
  - Path: `einsaetze/:einsatzId/personen`
  - `POST /` - Person registrieren
  - `GET /` - Alle EinsatzPersonen für Einsatz

- [ ] **4.2 `StammPersonenController` erweitern (Autocomplete)**
  - Path: `stammdaten/personen/suche`
  - `GET /?query={nachname}` - Autocomplete-Suche

- [ ] **4.3 OpenAPI Decorators**
  - `@ApiTags('einsatz-personen')`
  - `@ApiOperation`, `@ApiParam`, `@ApiCreatedResponse`, `@ApiBadRequestResponse`

### Task 5: Frontend (AC: 1, 2, 4)

- [ ] **5.1 API Client regenerieren**
  - `pnpm run generate-api`
  - Verifizieren: `EinsatzPersonenApi` in `packages/shared/client/apis/`

- [ ] **5.2 TanStack Query Hooks erstellen**
  - Datei: `packages/frontend/src/features/einsatz/api/use-einsatz-personen.ts`
  - `useEinsatzPersonen(einsatzId: string)` - Liste
  - `useRegistrierePerson()` - Mutation mit Invalidierung + Toast
  - Datei: `packages/frontend/src/features/einsatz/api/use-stamm-personen-suche.ts`
  - `useStammPersonenSuche(query: string)` - Autocomplete Query mit `enabled: query.length >= 1`

  **Query Keys in `queryKeys.ts` ergänzen:**
  ```typescript
  export const QUERY_KEYS = {
    // ... existing keys
    kraefte: {
      all: () => ['kraefte'] as const,
      personen: {
        all: () => [...QUERY_KEYS.kraefte.all(), 'personen'] as const,
        byEinsatz: (einsatzId: string) =>
          [...QUERY_KEYS.kraefte.personen.all(), 'byEinsatz', einsatzId] as const,
        suche: (query: string) =>
          [...QUERY_KEYS.kraefte.personen.all(), 'suche', query] as const,
      },
      stammPersonen: {
        all: () => [...QUERY_KEYS.kraefte.all(), 'stammPersonen'] as const,
        suche: (query: string) =>
          [...QUERY_KEYS.kraefte.stammPersonen.all(), 'suche', query] as const,
      },
    },
  } as const;
  ```

  **Cache Invalidation in Mutation:**
  ```typescript
  export const useRegistrierePerson = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (data: RegistrierePersonDto & { einsatzId: string }) =>
        api.einsatzPersonen.registriere(data.einsatzId, data),
      onSuccess: (_, variables) => {
        // Invalidate alle relevanten Queries
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.kraefte.personen.byEinsatz(variables.einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.einsatz.detail(variables.einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.etb.byEinsatz(variables.einsatzId),
        });
      },
    });
  };
  ```

- [ ] **5.3 "Person hinzufügen" Dialog erstellen**
  - Datei: `packages/frontend/src/features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism.tsx`
  - **Nachname Combobox:** Headless UI `<Combobox>` mit Debounce (300ms)
  - **Autocomplete Rendering:** `{nachname}, {vorname} • {funktion} • {qualifikationen.join(', ')}`
  - **Funktion Dropdown:** Headless UI `<Listbox>`
  - **Multi-Select Qualifikationen:** Headless UI `<Listbox multiple>`
  - **Form:** @tanstack/react-form mit Zod Validation
  - **Loading States:**
    - `query.length < 1`: "Bitte mindestens 1 Zeichen eingeben"
    - `isLoading`: "Suche läuft..."
    - `data.length === 0`: "Keine Personen gefunden"
  - **Error State:** Toast bei Fehler, Dialog bleibt offen
  - **Success State:** Toast "Person registriert", Dialog schließt automatisch

  **Debounce Pattern (KRITISCH):**
  ```typescript
  import { useDebouncedValue } from '@react-hookz/web'; // oder custom hook

  const PersonHinzufuegenDialog = ({ isOpen, onClose, einsatzId }: Props) => {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query, 300); // 300ms Debounce

    // Server-Side Suche mit debounced Query
    const { data: suggestions, isLoading } = useStammPersonenSuche(
      debouncedQuery,
      isOpen && debouncedQuery.length >= 1 // Nur wenn Dialog offen + min 1 Zeichen
    );

    return (
      <Combobox value={selectedPerson} onChange={handleSelect}>
        <ComboboxInput
          placeholder="Person suchen..."
          onChange={(e) => setQuery(e.target.value)}
        />
        <ComboboxOptions>
          {query.length < 1 ? (
            <div className="px-3 py-2 text-gray-500">
              Bitte mindestens 1 Zeichen eingeben
            </div>
          ) : isLoading ? (
            <div className="px-3 py-2 text-gray-500">
              Suche läuft...
            </div>
          ) : suggestions?.data.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">
              Keine Personen gefunden
            </div>
          ) : (
            suggestions?.data.map((person) => (
              <ComboboxOption key={person.id} value={person}>
                {person.nachname}, {person.vorname} • {person.funktion}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>
    );
  };
  ```

- [ ] **5.4 UI Integration**
  - `PersonHinzufuegenDialog` in SingleEinsatzDashboard einbinden
  - "Hinzufügen" Button im Kräfte-Widget mit Dropdown (Manuell / QR-Code)

### Task 6: Testing (AC: 1-4)

- [ ] **6.1 Unit Tests für EinsatzPerson Aggregate**
  - Two Factories Pattern Tests
  - Domain Event Emission Tests
  - Validation Tests
  - 20+ Test Cases, AAA Pattern
  - **KRITISCH:** `jest.clearAllMocks()` in `beforeEach()`

- [ ] **6.2 Unit Tests für Handler**
  - Success Case (mit/ohne StammPerson)
  - Duplikat-Fehler Case (Result.fail, NICHT throw)
  - StammPerson nicht gefunden Case
  - Transaction Behavior Tests
  - **KRITISCH:** `jest.clearAllMocks()` in `beforeEach()`

- [ ] **6.3 Unit Tests für ETB Event Handler**
  - Datei: `packages/backend/src/application/etb/event-handlers/__tests__/einsatz-person-hinzugefuegt.handler.spec.ts`
  - Success Case: ETB-Eintrag wird erstellt
  - Error Case: Handler fängt Fehler, wirft nicht (Fire-and-Forget)
  - **KRITISCH:** `jest.clearAllMocks()` in `beforeEach()`

- [ ] **6.4 Manuelle E2E Tests**
  - Person manuell erfassen Flow
  - Person aus Autocomplete erfassen Flow
  - ETB-Eintrag Erstellung prüfen
  - Duplikat-Validierung prüfen

---

## Dev Notes

### KRITISCHE REGELN (Anti-Patterns vermeiden!)

| Regel | Richtig | Falsch |
|-------|---------|--------|
| **Snapshot Pattern** | `vorname`, `nachname`, `qualifikationen` **KOPIEREN** | Referenz auf StammPerson |
| **Two Factories** | `createFromStammPerson()` + `createTemporary()` | Single Factory mit Conditional |
| **DI Export** | Nur `DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON` Token | Konkrete Klasse exportieren |
| **DI Import** | `import { ... }` für Injectable | `import type { ... }` |
| **Fehler** | `Result.fail()` im Handler | `throw Exception` im Handler |
| **Nullable** | `(entity.x as T \| null) ?? undefined` | Direktes `entity.x` |
| **Autocomplete** | `@tanstack/pacer` Debounce + `enabled: query.length >= 1` | Manuelles setTimeout |

### Two Factories Pattern (aus Story 4.0 Learning)

```typescript
// EinsatzPerson Aggregate - Private Constructor erzwingt Factory-Nutzung
export class EinsatzPerson extends AggregateRoot<EinsatzPersonId> {
  private constructor(props: EinsatzPersonProps) {
    super(props);
  }

  // Factory 1: Person aus Stammdaten (KOPIERT Daten!)
  public static createFromStammPerson(params: {
    einsatzId: EinsatzId;
    stammPerson: StammPerson; // Aggregate oder DTO
    qualifikationen: Qualifikation[];
    createdBy: string;
  }): Result<EinsatzPerson> {
    const person = new EinsatzPerson({
      id: EinsatzPersonId.create(),
      einsatzId: params.einsatzId,
      stammId: params.stammPerson.id, // Referenz für Lookup
      vorname: params.stammPerson.vorname, // KOPIE!
      nachname: params.stammPerson.nachname, // KOPIE!
      funkrufname: params.stammPerson.funkkenungBOS, // KOPIE!
      createdBy: params.createdBy,
    });

    person.addDomainEvent(
      new EinsatzPersonHinzugefuegtEvent(/* ... */)
    );

    return Result.ok(person);
  }

  // Factory 2: Temporäre Person (manuell erfasst)
  public static createTemporary(params: {
    einsatzId: EinsatzId;
    vorname: string;
    nachname: string;
    qualifikationen?: Qualifikation[];
    createdBy: string;
  }): Result<EinsatzPerson> {
    const person = new EinsatzPerson({
      id: EinsatzPersonId.create(),
      einsatzId: params.einsatzId,
      stammId: undefined, // KEINE Referenz!
      vorname: params.vorname,
      nachname: params.nachname,
      funkrufname: undefined,
      createdBy: params.createdBy,
    });

    person.addDomainEvent(
      new EinsatzPersonHinzugefuegtEvent(/* ... */)
    );

    return Result.ok(person);
  }
}
```

### TransactionalCommandHandler Pattern (aus Story 3.1)

```typescript
@Injectable()
export class RegistrierePersonHandler extends TransactionalCommandHandler<
  RegistrierePersonCommand,
  string
> {
  constructor(
    @Inject(DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON)
    private readonly personRepository: IEinsatzPersonRepository,
    @Inject(DI_TOKENS.KRAEFTE.REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(DI_TOKENS.PORTS.LOGGER)
    private readonly logger: ILoggerPort, // KRITISCH: Logger Port injizieren!
    prismaService: PrismaService,
  ) {
    super(prismaService, logger, 'RegistrierePersonHandler');
  }

  protected async executeInTransaction(
    command: RegistrierePersonCommand,
    tx: TransactionContext,
  ): Promise<{ result: string; events: DomainEvent[] }> {
    this.logger.log(
      `Registriere Person für Einsatz ${command.einsatzId.value}`,
      'RegistrierePersonHandler',
    );

    // 1. Prüfe Duplikat (falls stammPersonId vorhanden)
    if (command.stammPersonId) {
      const exists = await this.personRepository.existsByEinsatzIdAndStammId(
        command.einsatzId,
        command.stammPersonId,
        tx,
      );
      if (exists) {
        // KRITISCH: Result.fail() statt throw! (AC4 Compliance)
        this.logger.warn(
          `Duplikat: StammPerson ${command.stammPersonId.value} bereits in Einsatz`,
          'RegistrierePersonHandler',
        );
        return {
          result: '',
          events: [],
          // Handler muss Result.fail() in execute() zurückgeben
        };
        // Alternative: throw nur für unerwartete Fehler
      }
    }

    // 2. Erstelle EinsatzPerson (Two Factories Pattern)
    let person: EinsatzPerson;
    if (command.stammPersonId) {
      const stammPerson = await this.stammPersonRepository.findById(
        command.stammPersonId,
        tx,
      );
      if (!stammPerson) {
        this.logger.warn(
          `StammPerson ${command.stammPersonId.value} nicht gefunden`,
          'RegistrierePersonHandler',
        );
        return { result: '', events: [] };
      }
      const personResult = EinsatzPerson.createFromStammPerson({
        einsatzId: command.einsatzId,
        stammPerson,
        funktion: command.funktion,
        qualifikationen: command.qualifikationen,
        createdBy: command.registriertVon,
      });
      if (personResult.isFailure) {
        return { result: '', events: [] };
      }
      person = personResult.value!;
    } else {
      const personResult = EinsatzPerson.createTemporary({
        einsatzId: command.einsatzId,
        vorname: command.vorname,
        nachname: command.nachname,
        funktion: command.funktion,
        qualifikationen: command.qualifikationen,
        createdBy: command.registriertVon,
      });
      if (personResult.isFailure) {
        return { result: '', events: [] };
      }
      person = personResult.value!;
    }

    // 3. Speichern mit Transaction Context
    await this.personRepository.save(person, tx);

    // 4. Events extrahieren für Outbox (NICHT eventEmitter.emit()!)
    const events = person.getDomainEvents();
    person.clearDomainEvents();

    this.logger.log(
      `Person ${person.id.value} erfolgreich registriert`,
      'RegistrierePersonHandler',
    );

    // Base class speichert Events atomar in Outbox
    return { result: person.id.value, events };
  }
}
```

### Autocomplete Pattern (Frontend)

```typescript
// packages/frontend/src/features/einsatz/api/use-stamm-personen-suche.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

export const useStammPersonenSuche = (query: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.kraefte.stammPersonen.suche(query),
    queryFn: () => api.stammPersonen.suche({ query }),
    enabled: query.length >= 1, // Nur wenn min. 1 Zeichen
    staleTime: 30_000, // 30s Cache für Autocomplete
  });
};

// Combobox mit Debounce
import { debounce } from '@tanstack/pacer';
import { useState } from 'react';

const PersonHinzufuegenDialog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 300ms Debounce für Autocomplete
  const debouncedSetQuery = useMemo(
    () => debounce((q: string) => setDebouncedQuery(q), { wait: 300 }),
    []
  );

  const { data: suggestions } = useStammPersonenSuche(debouncedQuery);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSetQuery(query);
  };

  return (
    <Combobox value={selectedPerson} onChange={handleSelect}>
      <Combobox.Input
        onChange={(e) => handleSearchChange(e.target.value)}
        displayValue={(p) => p?.nachname ?? ''}
      />
      <Combobox.Options>
        {suggestions?.map((person) => (
          <Combobox.Option key={person.id} value={person}>
            {person.nachname}, {person.vorname} • {person.qualifikationen.join(', ')}
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </Combobox>
  );
};
```

### Mapper Pattern (NULL → undefined)

```typescript
// PrismaEinsatzPersonMapper
export class PrismaEinsatzPersonMapper {
  static toDomain(
    raw: PrismaEinsatzPerson & { qualifikationen?: PrismaQualifikation[] },
  ): EinsatzPerson {
    return new EinsatzPerson({
      id: EinsatzPersonId.fromString(raw.id),
      einsatzId: EinsatzId.fromString(raw.einsatzId),
      // NULL → undefined Mapping (KRITISCH!)
      stammId: (raw.stammId as string | null) ?? undefined,
      vorname: raw.vorname,
      nachname: raw.nachname,
      funkrufname: (raw.funkrufname as string | null) ?? undefined,
      position: raw.position
        ? Position.fromJson(raw.position as PositionJson)
        : undefined,
      qualifikationen: raw.qualifikationen?.map(q =>
        Qualifikation.fromPersistence(q)
      ) ?? [],
    });
  }

  static toPersistence(person: EinsatzPerson): PrismaCreateInput {
    return {
      id: person.id.value,
      einsatzId: person.einsatzId.value,
      // undefined → NULL Mapping
      stammId: person.stammId ?? null,
      vorname: person.vorname,
      nachname: person.nachname,
      funkrufname: person.funkrufname ?? null,
      position: person.position?.toJson() ?? null,
      createdBy: person.createdBy,
    };
  }
}
```

---

## Project Structure Notes

### Neue Dateien (CREATE)

```
packages/backend/src/
├── domain/kraefte/
│   ├── value-objects/
│   │   └── einsatz-person-id.ts                    # EntityId für Aggregate
│   ├── common/
│   │   └── einsatz-person-error-codes.ts           # Error Codes
│   ├── aggregates/
│   │   ├── einsatz-person.aggregate.ts
│   │   └── __tests__/
│   │       └── einsatz-person.aggregate.spec.ts
│   ├── repositories/
│   │   └── i-einsatz-person.repository.ts
│   └── events/
│       └── einsatz-person-hinzugefuegt.event.ts
├── application/kraefte/
│   └── einsatz-personen/
│       ├── commands/
│       │   └── registriere-person/
│       │       ├── registriere-person.command.ts
│       │       ├── registriere-person.handler.ts
│       │       └── __tests__/
│       │           └── registriere-person.handler.spec.ts
│       ├── queries/
│       │   └── get-einsatz-personen/
│       │       ├── get-einsatz-personen.query.ts
│       │       └── get-einsatz-personen.handler.ts
│       └── dto/
│           ├── registriere-person.dto.ts
│           └── einsatz-person.dto.ts
├── application/kraefte/
│   └── stamm-personen/
│       └── queries/
│           └── suche-stamm-personen/
│               ├── suche-stamm-personen.query.ts
│               ├── suche-stamm-personen.handler.ts
│               └── stamm-person-suche.dto.ts
├── application/etb/
│   └── event-handlers/
│       └── einsatz-person-hinzugefuegt.handler.ts
├── infrastructure/kraefte/
│   ├── repositories/
│   │   └── prisma-einsatz-person.repository.ts
│   └── mappers/
│       └── prisma-einsatz-person.mapper.ts
└── modules/kraefte/
    └── controllers/
        └── einsatz-personen.controller.ts

packages/frontend/src/
├── features/einsatz/
│   ├── api/
│   │   ├── use-einsatz-personen.ts
│   │   ├── use-registriere-person.ts
│   │   └── use-stamm-personen-suche.ts
│   └── ui/
│       └── organisms/
│           └── PersonHinzufuegenDialog.organism.tsx
```

### Zu modifizierende Dateien (MODIFY)

| Datei | Änderung |
|-------|----------|
| `packages/backend/src/infrastructure/di-tokens.ts` | `EINSATZ_PERSON` Token hinzufügen |
| `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts` | Provider + Export hinzufügen |
| `packages/backend/src/modules/kraefte/kraefte.module.ts` | Controller + Handlers registrieren |
| `packages/backend/src/application/etb/etb-application.module.ts` | Event Handler registrieren |
| `packages/frontend/src/features/einsatz/api/index.ts` | Exports hinzufügen |
| `packages/frontend/src/features/einsatz/ui/organisms/index.ts` | Dialog Export |
| `packages/frontend/src/features/einsatz/ui/organisms/SingleEinsatzDashboard.tsx` | Button + Dialog Integration |

---

## Implementation Checklist

**VOR Implementation prüfen:**
- [ ] ⚠️ **BLOCKER:** Story 4-0 Schema erweitern mit `funktion: String` Feld
- [ ] Story 4-0 Schema korrekt? (`EinsatzPerson`, `EinsatzPersonQualifikation` existiert)
- [ ] `StammPerson` Repository existiert? (für Autocomplete)
- [ ] `EinsatzFahrzeug` Aggregate Pattern studiert?

**WÄHREND Implementation:**
- [ ] `EinsatzPersonId` VO erstellt (analog zu `EinsatzFahrzeugId`)
- [ ] Two Factories: `createFromStammPerson()` KOPIERT Daten inkl. `funktion`, `createTemporary()` ohne stammId
- [ ] Command: Private Constructor + Static Factory `create(): Result<Command>`
- [ ] Handler: `extends TransactionalCommandHandler`, `tx` Parameter nutzen
- [ ] Handler: **Logger Port injizieren** (`@Inject(DI_TOKENS.PORTS.LOGGER)`)
- [ ] Handler: **Result.fail() statt throw** für erwartete Fehler (Duplikat, Not Found)
- [ ] Repository: NULL→undefined Mapper, Eager Loading `qualifikationen`
- [ ] DI Token: `Symbol('IEinsatzPersonRepository')` in `di-tokens.ts`
- [ ] Module: Provider mit `{ provide: TOKEN, useClass: Impl }`, NUR Token exportieren
- [ ] Controller: Result→HTTP Translation, OpenAPI Decorators
- [ ] Frontend: Combobox mit 300ms Debounce via `useDebouncedValue()`
- [ ] Frontend: Query Keys in `queryKeys.ts` definieren
- [ ] Frontend: Mutation mit Cache Invalidation (3 Queries)

**NACH Implementation:**
- [ ] Unit Tests: AAA Pattern mit Given-When-Then Kommentaren
- [ ] Unit Tests: **`jest.clearAllMocks()` in JEDEM beforeEach()**
- [ ] Unit Tests: `jest.Mocked<T>` für Repository/Logger Mocks
- [ ] ETB Handler Tests: Fire-and-Forget Error Handling
- [ ] Manual E2E: Happy Path (Autocomplete + Manual), Duplikat-Test
- [ ] `pnpm run generate-api` + Frontend Hooks

---

## References

| Dokument | Pfad | Relevanz |
|----------|------|----------|
| **Epic Definition** | `docs/epics.md` (Lines 979-1020) | AC1-AC4, Technical Notes |
| **Schema Story** | `docs/sprint-artifacts/4-0-prisma-schema-einsatz-personen.md` | Prisma Model, Learnings |
| **Retro Learnings** | `docs/sprint-artifacts/epic-3-retrospective.md` | Two Factories, Snapshot |
| **Project Rules** | `docs/project-context.md` | AC1-AC6 Code Review |
| **Pattern: Aggregate** | `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts` | Factory, Events |
| **Pattern: Handler** | `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/update-fms-status/update-fms-status.handler.ts` | TransactionalCommandHandler |
| **Pattern: Repository** | `packages/backend/src/infrastructure/kraefte/repositories/prisma-einsatz-fahrzeug.repository.ts` | NULL Mapping, Transaction |
| **Pattern: Frontend Dialog** | `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx` | Combobox, Debounce |

---

## Domain Events (ETB Integration)

### EinsatzPersonHinzugefuegtEvent

```typescript
export class EinsatzPersonHinzugefuegtEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly einsatzPersonId: EinsatzPersonId,
    public readonly stammId: StammPersonId | undefined,
    public readonly vorname: string,
    public readonly nachname: string,
    public readonly registriertVon: string,
    public readonly timestamp: Date = new Date(),
  ) {
    super();
  }
}
```

### ETB Event Handler

```typescript
@Injectable()
export class EinsatzPersonHinzugefuegtHandler
  implements IEventHandler<EinsatzPersonHinzugefuegtEvent> {

  constructor(
    @Inject(DI_TOKENS.REPOSITORIES.ETB)
    private readonly etbRepository: IEtbRepository,
  ) {}

  async handle(event: EinsatzPersonHinzugefuegtEvent): Promise<void> {
    const beschreibung = `Person ${event.vorname} ${event.nachname} registriert`;

    await this.etbRepository.addEintrag({
      einsatzId: event.einsatzId,
      kategorie: 'MASSNAHME',
      beschreibung,
      timestampEreignis: event.timestamp,
      createdBy: event.registriertVon,
    });
  }
}
```

---

## Out of Scope (für spätere Stories)

| Thema | Ziel-Story | Beschreibung |
|-------|-----------|--------------|
| QR-Code Registrierung | 4.2 | DRK-App QR-Format dekodieren |
| Fahrzeug-Zuweisung | 4.3 | Person → Fahrzeug Mapping |
| Position Tracking | TBD | GPS-Positionen für Personen |
| Optimistic Locking | 4.1+ | `updatedAt` für Concurrency-Checks (bei Updates) |

---

## Architecture Compliance

### Hexagonal Architecture Layers

| Layer | Komponente | Pfad |
|-------|-----------|------|
| **Domain** | `EinsatzPerson` Aggregate | `src/domain/kraefte/aggregates/einsatz-person.aggregate.ts` |
| **Domain** | `EinsatzPersonId` Value Object | `src/domain/kraefte/value-objects/einsatz-person-id.ts` |
| **Domain** | `IEinsatzPersonRepository` Interface | `src/domain/kraefte/repositories/i-einsatz-person.repository.ts` |
| **Domain** | Domain Events | `src/domain/kraefte/events/einsatz-person-hinzugefuegt.event.ts` |
| **Infrastructure** | `PrismaEinsatzPersonRepository` | `src/infrastructure/kraefte/repositories/prisma-einsatz-person.repository.ts` |
| **Infrastructure** | `PrismaEinsatzPersonMapper` | `src/infrastructure/kraefte/mappers/prisma-einsatz-person.mapper.ts` |
| **Application** | Command Handlers | `src/application/kraefte/einsatz-personen/commands/*.handler.ts` |
| **Application** | Event Handlers | `src/application/etb/event-handlers/einsatz-person-*.handler.ts` |
| **Module** | REST Controller | `src/modules/kraefte/controllers/einsatz-personen.controller.ts` |

### Code Review Checklist Relevanz

| Check | Relevant für Story 4.1? | Details |
|-------|-------------------------|---------|
| AC1 (DI Import) | ✅ JA | `import { ... }` für Injectable Classes |
| AC2 (DI Tokens) | ✅ JA | `DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON` |
| AC3 (Framework-Agnostik) | ✅ JA | Domain Layer ohne NestJS (außer @Injectable) |
| AC4 (Result Pattern) | ✅ JA | `Result.fail()` statt Exceptions |
| AC5 (Outbox Pattern) | ✅ JA | TransactionalCommandHandler |
| AC6 (Test Pattern) | ✅ JA | AAA Pattern, jest.clearAllMocks() |

---

## Testing Requirements

### Unit Tests (Domain Layer)

```typescript
describe('EinsatzPerson Aggregate', () => {
  // KRITISCH: Mocks zwischen Tests zurücksetzen!
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFromStammPerson', () => {
    it('should create EinsatzPerson with copied data from StammPerson', () => {
      // Given (Arrange)
      const stammPerson = createTestStammPerson();
      const params = {
        einsatzId: EinsatzId.create(),
        stammPerson,
        funktion: 'Rettungshelfer',
        qualifikationen: [createTestQualifikation()],
        createdBy: 'user-123',
      };

      // When (Act)
      const result = EinsatzPerson.createFromStammPerson(params);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stammId?.value).toBe(stammPerson.id.value);
      expect(result.value!.vorname).toBe(stammPerson.vorname); // KOPIE
      expect(result.value!.nachname).toBe(stammPerson.nachname); // KOPIE
      expect(result.value!.funktion).toBe('Rettungshelfer');

      const events = result.value!.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(EinsatzPersonHinzugefuegtEvent);
    });
  });

  describe('createTemporary', () => {
    it('should create temporary EinsatzPerson without stammId', () => {
      // Given (Arrange)
      const params = {
        einsatzId: EinsatzId.create(),
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        createdBy: 'user-123',
      };

      // When (Act)
      const result = EinsatzPerson.createTemporary(params);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stammId).toBeUndefined();
      expect(result.value!.vorname).toBe('Max');
      expect(result.value!.nachname).toBe('Mustermann');
      expect(result.value!.funktion).toBe('Helfer');
    });
  });
});
```

### Unit Tests (Handler mit Mocks)

```typescript
describe('RegistrierePersonHandler', () => {
  let handler: RegistrierePersonHandler;
  let mockPersonRepository: jest.Mocked<IEinsatzPersonRepository>;
  let mockStammPersonRepository: jest.Mocked<IStammPersonRepository>;
  let mockLogger: jest.Mocked<ILoggerPort>;

  // KRITISCH: Mocks zwischen Tests zurücksetzen!
  beforeEach(() => {
    jest.clearAllMocks();

    mockPersonRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByEinsatzIdAndStammId: jest.fn(),
    } as unknown as jest.Mocked<IEinsatzPersonRepository>;

    mockStammPersonRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IStammPersonRepository>;

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILoggerPort>;

    handler = new RegistrierePersonHandler(
      mockPersonRepository,
      mockStammPersonRepository,
      mockLogger,
      {} as PrismaService, // Mock PrismaService
    );
  });

  it('should return empty result for duplicate person', async () => {
    // Given (Arrange)
    const command = RegistrierePersonCommand.create({
      einsatzId: 'einsatz-123',
      stammPersonId: 'stamm-456',
      vorname: 'Max',
      nachname: 'Mustermann',
      funktion: 'Helfer',
      qualifikationIds: [],
      registriertVon: 'user-789',
    }).value!;

    mockPersonRepository.existsByEinsatzIdAndStammId.mockResolvedValue(true);

    // When (Act)
    const result = await handler.executeInTransaction(command, {} as TransactionContext);

    // Then (Assert)
    expect(result.result).toBe('');
    expect(result.events).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Duplikat'),
      'RegistrierePersonHandler',
    );
    expect(mockPersonRepository.save).not.toHaveBeenCalled();
  });
});
```

### Manual E2E Test Checklist

| Test | Beschreibung |
|------|--------------|
| Person aus Autocomplete | Nachname eingeben → Vorschlag auswählen → Registrieren |
| Temporäre Person | Manuell Vorname/Nachname eingeben → Registrieren |
| ETB-Eintrag | Nach Registrierung ETB prüfen auf "Person X Y registriert" |
| Duplikat-Check | Gleiche StammPerson erneut registrieren → Fehler |
| UI Feedback | Success Toast, Dialog schließt, Person in Liste |

---

## Estimation

**Aufwand:** ~2-3 Tage

| Task | Zeit |
|------|------|
| Task 1: Domain Layer | 4h |
| Task 2: Infrastructure | 2h |
| Task 3: Application | 4h |
| Task 4: API Layer | 2h |
| Task 5: Frontend | 4h |
| Task 6: Testing | 3h |
| **Gesamt** | ~19h |

---

## Dev Agent Record

### Context Reference

- Epic: 4 - Helfer-Registrierung
- Story Key: 4-1-person-manuell-registrieren
- Dependencies: Story 4-0 (EinsatzPerson Schema + Funktion-Feld), Story 2-x (StammPerson)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) - Scrum Master Agent (Bob)

### Subagents Used (Story Creation)

1. **Pattern Detector Agent** - EinsatzFahrzeug implementation patterns
2. **Codebase Analyzer Agent** - Story 3.1 template structure
3. **Explore Agent** - Frontend patterns (Combobox, Dialog, Hooks)

### Subagents Used (Validation - 2025-12-18)

1. **Epic 4 Analyzer Agent** - Cross-story requirements alignment
2. **Pattern Detector Agent (Backend)** - EinsatzFahrzeug pattern compliance
3. **Learnings Extractor Agent** - Epic 3 + Story 4.0 learnings
4. **Pattern Detector Agent (Frontend)** - FahrzeugHinzufuegenDialog patterns
5. **Architecture Reviewer Agent** - AC1-AC6 compliance check

### Validation Results (2025-12-18)

**Score:** 62/100 → 85/100 (nach Fixes)

**Critical Fixes Applied:**
1. ✅ Funktion-Feld zu AC1/AC2/AC3 hinzugefügt
2. ✅ Schema-Blocker dokumentiert (Story 4.0 Update required)
3. ✅ Result.fail() statt throw für Duplikat-Check
4. ✅ jest.clearAllMocks() in Test-Beispielen
5. ✅ Logger Port Injection in Handler
6. ✅ Module Provider Registration dokumentiert
7. ✅ Command Private Constructor Pattern
8. ✅ Frontend Debounce Pattern (useDebouncedValue)

**High Priority Fixes Applied:**
1. ✅ DI Token Symbol syntax dokumentiert
2. ✅ DTO Validation Decorators vollständig
3. ✅ Query Keys Struktur definiert
4. ✅ Cache Invalidation Strategy dokumentiert
5. ✅ ETB Handler Tests hinzugefügt
6. ✅ Loading/Empty States für Combobox

### Completion Notes

- Story generated via `*create-story` workflow in YOLO mode
- Parallel subagent analysis für umfassende Pattern-Extraktion
- Integriert alle Learnings aus Epic 3 und Story 4-0
- Two Factories Pattern aus Story 4-0 Dev Notes übernommen
- **Validation Report:** `docs/sprint-artifacts/validation-report-4-1-2025-12-18.md`
