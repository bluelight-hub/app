# Story TD2.3: Query Handler Tests für EinsatzFahrzeuge

Status: Done

## Story

Als **Backend-Entwickler**,
möchte ich **umfassende Unit-Tests für GetEinsatzFahrzeugeHandler implementieren**,
damit **die komplexe Query-Logik mit Eager Loading und N+1-Prevention vollständig testabgedeckt ist**.

## Hintergrund

Diese Story ist Teil des **Tech Debt Sprint 2**, entstanden aus der Epic 6 Retrospektive.

**Analyse-Ergebnis:**
- `GetEinsatzFahrzeugeHandler` hat **0% Test Coverage** ❌
- `GetTaktischeStaerkeHandler` hat bereits **15 Tests** ✅ (keine Aktion erforderlich)

**Fokus dieser Story:** Nur `GetEinsatzFahrzeugeHandler` - der komplexeste Query Handler im Kräfte-Modul.

**Komplexität:** HOCH
- 3 Repository-Dependencies (EinsatzFahrzeug, Fahrzeugtyp, EinsatzPerson)
- N+1 Prevention mit Cache-Maps für Fahrzeugtypen und Besatzung
- Eager Loading Pattern für nested DTOs
- ⚠️ **AC1 Violation:** Handler verwendet `new Logger()` statt `@Inject(LOGGER)`

## Acceptance Criteria

### AC1: Success Cases implementiert (mindestens 4 Tests)

- [x] Test: Happy Path - Repository gibt Fahrzeuge mit Fahrzeugtypen und Besatzung zurück ✅
- [x] Test: Empty Result - Repository gibt `[]` zurück, Handler gibt `Result.ok([])` zurück ✅
- [x] Test: Fahrzeuge ohne Besatzung - Handler mappt mit leerer Besatzungsliste ✅
- [x] Test: Mehrere Fahrzeuge mit gleichem Fahrzeugtyp - N+1 Prevention verifizieren ✅

### AC2: Error Cases implementiert (mindestens 3 Tests)

- [x] Test: EinsatzFahrzeug Repository-Fehler → `Result.fail` mit Error-Message ✅
- [x] Test: Fahrzeugtyp Repository-Fehler → Fahrzeug wird übersprungen, Logger.warn() aufgerufen ✅
- [x] Test: EinsatzPerson Repository-Fehler → Fahrzeug mit leerer Besatzung gemappt ✅
- [x] Test: Fallback Error Message wenn Repository-Fehler null ist (Bonus) ✅
- [x] Test: Fahrzeugtyp Repository-Fehler → Fahrzeug übersprungen, Warning geloggt (Code Review) ✅

### AC3: N+1 Prevention Cases implementiert (mindestens 3 Tests)

- [x] Test: Fahrzeugtyp-Cache - Bei 3 Fahrzeugen mit 2 Fahrzeugtypen: `findById` nur 2x aufgerufen ✅
- [x] Test: Besatzung-Loading - `findByFahrzeugId` einmal pro Fahrzeug aufgerufen ✅
- [x] Test: Invalid FahrzeugtypId - Fehler geloggt, Fahrzeug übersprungen ✅

### AC4: DTO Mapping Cases implementiert (mindestens 3 Tests)

- [x] Test: Alle Fahrzeug-Felder korrekt gemappt (funkrufname, kennzeichen, fmsStatus) ✅
- [x] Test: Fahrzeugtyp nested in DTO (name, abkuerzung, icon) ✅
- [x] Test: Besatzung als Array von PersonDto (vorname, nachname) ✅

### AC5: Test-Pattern Compliance (AC6 CLAUDE.md)

- [x] AAA Pattern mit Given-When-Then Kommentaren ✅
- [x] `jest.clearAllMocks()` in beforeEach ✅
- [x] `jest.Mocked<T>` für alle 3 Repositories ✅
- [x] Mindestens 12 Unit Tests gesamt ✅ (17 Tests implementiert)

## Tasks / Subtasks

- [x] Task 1: Test-Datei erstellen (AC: 5) ✅
  - [x] Erstelle `__tests__/get-einsatz-fahrzeuge.handler.spec.ts`
  - [x] Mock-Factories für alle 3 Repositories
  - [x] Test-Daten Factories für EinsatzFahrzeug, Fahrzeugtyp, EinsatzPerson
  - [x] Logger-Spy Setup (Workaround für `new Logger()` Pattern)

- [x] Task 2: Success Cases (AC: 1) ✅
  - [x] Test: `should return mapped DTOs with fahrzeugtyp and besatzung`
  - [x] Test: `should return empty array when no fahrzeuge exist`
  - [x] Test: `should map fahrzeug with empty besatzung correctly`
  - [x] Test: `should handle multiple fahrzeuge with same fahrzeugtyp`

- [x] Task 3: Error Cases (AC: 2) ✅
  - [x] Test: `should return Result.fail when einsatzFahrzeugRepository fails`
  - [x] Test: `should return fallback error message when repository fails with null error`
  - [x] Test: `should skip fahrzeug and log warning when fahrzeugtyp not found`
  - [x] Test: `should use empty besatzung when einsatzPersonRepository fails`

- [x] Task 4: N+1 Prevention Cases (AC: 3) ✅
  - [x] Test: `should call fahrzeugtypRepository.findById only for unique fahrzeugtyp IDs`
  - [x] Test: `should call einsatzPersonRepository.findByFahrzeugId once per fahrzeug`
  - [x] Test: `should skip fahrzeug with invalid fahrzeugtypId`

- [x] Task 5: DTO Mapping Cases (AC: 4) ✅
  - [x] Test: `should map all EinsatzFahrzeug fields correctly`
  - [x] Test: `should include fahrzeugtyp details in DTO`
  - [x] Test: `should map besatzung as array of PersonDto`

- [x] Task 6: Verifizierung ✅
  - [x] Alle Tests grün: 17/17 Tests passed
  - [x] Keine Regression: 1321 kraefte Tests passed

## Dev Notes

### Handler-Signatur

```typescript
@Injectable()
export class GetEinsatzFahrzeugeHandler {
  // ⚠️ AC1 Violation - NICHT korrigieren in dieser Story!
  private readonly logger = new Logger(GetEinsatzFahrzeugeHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
  ) {}

  async execute(query: GetEinsatzFahrzeugeQuery): Promise<Result<EinsatzFahrzeugDto[]>>
}
```

**Pfad:** `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/`

### Handler Business Logic (4 Schritte)

```typescript
// 1. Load EinsatzFahrzeuge
const fahrzeugeResult = await this.einsatzFahrzeugRepository.findByEinsatzId(query.einsatzId);
if (fahrzeugeResult.isFailure) {
  return Result.fail(fahrzeugeResult.error ?? 'Fehler beim Laden der Fahrzeuge');
}
const fahrzeuge = fahrzeugeResult.value ?? [];
if (fahrzeuge.length === 0) return Result.ok([]);

// 2. Load unique Fahrzeugtypen (N+1 Prevention mit Cache)
const fahrzeugtypCache = new Map<string, Fahrzeugtyp>();
const uniqueFahrzeugtypIds = [...new Set(fahrzeuge.map((f) => f.fahrzeugtypId))];
for (const fahrzeugtypIdStr of uniqueFahrzeugtypIds) {
  const idResult = FahrzeugtypId.create(fahrzeugtypIdStr);
  if (idResult.isFailure) {
    this.logger.warn(`Invalid fahrzeugtypId: ${fahrzeugtypIdStr}`);
    continue;
  }
  const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(idResult.value);
  if (fahrzeugtypResult.isSuccess && fahrzeugtypResult.value) {
    fahrzeugtypCache.set(fahrzeugtypIdStr, fahrzeugtypResult.value);
  }
}

// 3. Load Besatzung für alle Fahrzeuge
const besatzungCache = new Map<string, EinsatzPerson[]>();
for (const fahrzeug of fahrzeuge) {
  const besatzungResult = await this.einsatzPersonRepository.findByFahrzeugId(fahrzeug.id.value);
  if (besatzungResult.isSuccess && besatzungResult.value) {
    besatzungCache.set(fahrzeug.id.value, besatzungResult.value);
  }
}

// 4. Map to DTOs (skip Fahrzeuge ohne Fahrzeugtyp)
const dtos: EinsatzFahrzeugDto[] = [];
for (const fahrzeug of fahrzeuge) {
  const fahrzeugtyp = fahrzeugtypCache.get(fahrzeug.fahrzeugtypId);
  if (!fahrzeugtyp) {
    this.logger.warn(`Fahrzeugtyp not found for EinsatzFahrzeug ${fahrzeug.id.value}`);
    continue;
  }
  const besatzung = besatzungCache.get(fahrzeug.id.value) ?? [];
  dtos.push(EinsatzFahrzeugQueryMapper.toDto(fahrzeug, fahrzeugtyp, besatzung));
}
return Result.ok(dtos);
```

### Mock-Setup Pattern

```typescript
import { Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';

const createMockEinsatzFahrzeugRepository = (): jest.Mocked<IEinsatzFahrzeugRepository> => ({
  findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
  findById: jest.fn().mockResolvedValue(Result.ok(null)),
  save: jest.fn().mockResolvedValue(Result.ok(undefined)),
  delete: jest.fn().mockResolvedValue(Result.ok(undefined)),
});

const createMockFahrzeugtypRepository = (): jest.Mocked<IFahrzeugtypRepository> => ({
  findById: jest.fn().mockResolvedValue(Result.ok(null)),
  findAll: jest.fn().mockResolvedValue(Result.ok([])),
  save: jest.fn().mockResolvedValue(Result.ok(undefined)),
  exists: jest.fn().mockResolvedValue(Result.ok(false)),
});

const createMockEinsatzPersonRepository = (): jest.Mocked<IEinsatzPersonRepository> => ({
  findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
  findById: jest.fn().mockResolvedValue(Result.ok(null)),
  findByFahrzeugId: jest.fn().mockResolvedValue(Result.ok([])),
  save: jest.fn().mockResolvedValue(Result.ok(undefined)),
  existsByEinsatzIdAndStammId: jest.fn().mockResolvedValue(Result.ok(false)),
});
```

### Logger-Spy Workaround (KRITISCH)

Da der Handler `new Logger()` statt `@Inject(LOGGER)` nutzt, muss Logger.warn() via jest.spyOn gemockt werden:

```typescript
// In beforeEach oder describe-Block:
let loggerWarnSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();

  // Logger-Spy für AC2/AC3 Tests (warn-Verifizierung)
  loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

  // ... Rest des Setups
});

afterEach(() => {
  loggerWarnSpy.mockRestore();
});

// Dann in AC2/AC3 Tests:
it('should log warning when fahrzeugtyp not found', async () => {
  // Given: Fahrzeugtyp Repository gibt null zurück
  mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(null));

  // When
  await handler.execute(query);

  // Then
  expect(loggerWarnSpy).toHaveBeenCalledWith(
    expect.stringContaining('Fahrzeugtyp not found')
  );
});
```

### Error Mock Pattern (für AC2)

Für Error-Case Tests müssen Repositories `Result.fail()` zurückgeben:

```typescript
// Repository-Fehler simulieren:
mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(
  Result.fail('Database connection failed')
);

// Dann im Test:
it('should return Result.fail when repository fails', async () => {
  // Given
  mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(
    Result.fail('Datenbankfehler')
  );

  // When
  const result = await handler.execute(query);

  // Then
  expect(result.isFailure).toBe(true);
  expect(result.error).toContain('Fehler beim Laden der Fahrzeuge');
});
```

### Test-Daten Factories

```typescript
import { createId } from '@paralleldrive/cuid2';

// Gültige CUID2 IDs für deterministische Tests
const VALID_EINSATZ_ID = 'z3h5idy36i9aqgkh7st81q57';
const VALID_FAHRZEUG_ID_1 = 'y0k4xvqhkidfhdhvtqey3lik';
const VALID_FAHRZEUG_ID_2 = 'xfohqq7skz5muyqialxel8ic';
const VALID_FAHRZEUGTYP_ID = 'wbgl9sk2h8z4f5jrmtne7opq';
const VALID_PERSON_ID_1 = 'vjcm2lr8g7y3e4iqsnud6klp';
const VALID_PERSON_ID_2 = 'uiad1kq7f6x2d3hprmtc5jko';

const createMockEinsatzFahrzeug = (overrides: Partial<{
  id: string;
  fahrzeugtypId: string;
  funkrufname: string;
  kennzeichen: string;
  fmsStatus: string;
}> = {}) => ({
  id: { value: overrides.id ?? VALID_FAHRZEUG_ID_1 },
  fahrzeugtypId: overrides.fahrzeugtypId ?? VALID_FAHRZEUGTYP_ID,
  funkrufname: overrides.funkrufname ?? 'Florian Test 1',
  kennzeichen: overrides.kennzeichen ?? 'AB-CD 1234',
  fmsStatus: overrides.fmsStatus ?? 'STATUS_1',
});

const createMockFahrzeugtyp = (overrides: Partial<{
  id: string;
  name: string;
  abkuerzung: string;
  icon: string;
}> = {}) => ({
  id: { value: overrides.id ?? VALID_FAHRZEUGTYP_ID },
  name: overrides.name ?? 'Rettungswagen',
  abkuerzung: overrides.abkuerzung ?? 'RTW',
  icon: overrides.icon ?? '🚑',
});

const createMockEinsatzPerson = (overrides: Partial<{
  id: string;
  vorname: string;
  nachname: string;
}> = {}) => ({
  id: { value: overrides.id ?? VALID_PERSON_ID_1 },
  vorname: overrides.vorname ?? 'Max',
  nachname: overrides.nachname ?? 'Mustermann',
});
```

### Test-Struktur Vorlage

```typescript
describe('GetEinsatzFahrzeugeHandler', () => {
  let handler: GetEinsatzFahrzeugeHandler;
  let mockEinsatzFahrzeugRepository: jest.Mocked<IEinsatzFahrzeugRepository>;
  let mockFahrzeugtypRepository: jest.Mocked<IFahrzeugtypRepository>;
  let mockEinsatzPersonRepository: jest.Mocked<IEinsatzPersonRepository>;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Logger-Spy für AC2/AC3 Tests (warn-Verifizierung)
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    mockEinsatzFahrzeugRepository = createMockEinsatzFahrzeugRepository();
    mockFahrzeugtypRepository = createMockFahrzeugtypRepository();
    mockEinsatzPersonRepository = createMockEinsatzPersonRepository();

    handler = new GetEinsatzFahrzeugeHandler(
      mockEinsatzFahrzeugRepository,
      mockFahrzeugtypRepository,
      mockEinsatzPersonRepository,
    );
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
  });

  describe('execute - Success Cases (AC1)', () => {
    it('should return mapped DTOs with fahrzeugtyp and besatzung', async () => {
      // Given (Arrange)
      const mockFahrzeug = createMockEinsatzFahrzeug();
      const mockFahrzeugtyp = createMockFahrzeugtyp();
      const mockPerson = createMockEinsatzPerson();

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(
        Result.ok([mockFahrzeug])
      );
      mockFahrzeugtypRepository.findById.mockResolvedValue(
        Result.ok(mockFahrzeugtyp)
      );
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(
        Result.ok([mockPerson])
      );

      const query = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].funkrufname).toBe('Florian Test 1');
      expect(result.value![0].fahrzeugtyp.name).toBe('Rettungswagen');
      expect(result.value![0].besatzung).toHaveLength(1);
    });

    // KRITISCH: Expliziter Test für leere Liste (Result.ok([]) NICHT undefined!)
    it('should return Result.ok([]) NOT Result.ok(undefined) when no fahrzeuge exist', async () => {
      // Given
      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));

      const query = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID).value!;

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]); // NICHT undefined!
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).not.toBeUndefined();
    });
  });

  describe('execute - N+1 Prevention Cases (AC3)', () => {
    it('should call fahrzeugtypRepository.findById only for unique IDs', async () => {
      // Given: 3 Fahrzeuge mit 2 verschiedenen Fahrzeugtypen
      const fahrzeugtyp1Id = VALID_FAHRZEUGTYP_ID;
      const fahrzeugtyp2Id = 'qbgl9sk2h8z4f5jrmtne7abc';

      const mockFahrzeuge = [
        createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_1, fahrzeugtypId: fahrzeugtyp1Id }),
        createMockEinsatzFahrzeug({ id: VALID_FAHRZEUG_ID_2, fahrzeugtypId: fahrzeugtyp1Id }), // Gleicher Typ!
        createMockEinsatzFahrzeug({ id: 'abc123', fahrzeugtypId: fahrzeugtyp2Id }),
      ];

      mockEinsatzFahrzeugRepository.findByEinsatzId.mockResolvedValue(Result.ok(mockFahrzeuge));
      mockFahrzeugtypRepository.findById.mockResolvedValue(Result.ok(createMockFahrzeugtyp()));
      mockEinsatzPersonRepository.findByFahrzeugId.mockResolvedValue(Result.ok([]));

      const query = GetEinsatzFahrzeugeQuery.create(VALID_EINSATZ_ID).value!;

      // When
      await handler.execute(query);

      // Then: Nur 2 Calls (nicht 3!)
      expect(mockFahrzeugtypRepository.findById).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Wichtige Architektur-Details

| Aspekt | Detail |
|--------|--------|
| **N+1 Prevention** | Handler cached Fahrzeugtypen nach unique IDs |
| **Fehlertoleranz** | Fahrzeug ohne Fahrzeugtyp wird übersprungen (nicht Error) |
| **Besatzung Loading** | `findByFahrzeugId` für jedes Fahrzeug einzeln |
| **Logger Pattern** | ⚠️ Verwendet `new Logger()` - AC1 Violation (nicht fixen!) → Nutze `jest.spyOn(Logger.prototype, 'warn')` |
| **Query Validation** | Passiert VOR Handler-Aufruf in `Query.create()` |
| **Transaction Context** | Query Handler nutzt KEIN TX - alle Repository-Calls ohne tx Parameter |
| **Mapper Default** | `EinsatzFahrzeugQueryMapper.toDto()` hat `besatzung = []` Default - leerer Array kann weggelassen werden |
| **Return Type** | Handler gibt IMMER `Result.ok([])` zurück bei leerer Liste (NICHT `undefined`) |

### DTO-Struktur (zu verifizieren)

```typescript
interface EinsatzFahrzeugDto {
  id: string;
  funkrufname: string;
  kennzeichen?: string;
  fmsStatus: string;
  fahrzeugtyp: {
    id: string;
    name: string;
    abkuerzung: string;
    icon?: string;
  };
  besatzung: Array<{
    id: string;
    vorname: string;
    nachname: string;
  }>;
}
```

### Referenz: GetTaktischeStaerkeHandler Tests

Die existierenden Tests für `GetTaktischeStaerkeHandler` (`__tests__/get-taktische-staerke.handler.spec.ts`) können als Vorlage dienen:

- **15 Tests** in 6 describe-Blöcken
- Mock-Factories für `IEinsatzPersonRepository` und `IQualifikationRepository`
- AAA Pattern mit Given-When-Then Kommentaren
- Edge Cases: Empty State, Case-Insensitive Matching, Graceful Error Handling

### References

- [Handler: get-einsatz-fahrzeuge.handler.ts](packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.handler.ts)
- [Query: get-einsatz-fahrzeuge.query.ts](packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.query.ts)
- [Mapper: einsatz-fahrzeug-query.mapper.ts](packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/einsatz-fahrzeug-query.mapper.ts)
- [Referenz Tests: get-taktische-staerke.handler.spec.ts](packages/backend/src/application/kraefte/queries/get-taktische-staerke/__tests__/get-taktische-staerke.handler.spec.ts)
- [TD1 Story: td1-query-handler-tests.md](docs/sprint-artifacts/td1-query-handler-tests.md)
- [CLAUDE.md#AC6 - Test Pattern Requirements](CLAUDE.md)
- [Epic 6 Retrospektive](docs/sprint-artifacts/epic-6-retro-2025-12-31.md)

## Dev Agent Record

### Context Reference

Story erstellt basierend auf:
- Epic 6 Retrospektive Action Items (TD2-3)
- 3-facher Subagent-Analyse:
  - Tech Debt Dokumentation und Epic-Context
  - Query Handler Codebase-Analyse (alle kraefte Query Handler)
  - Test-Pattern Extraktion aus TD1 und existierenden Tests
- **Validiert:** 2026-01-01 mit umfassender Handler-Code-Analyse

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Validation Notes

- Handler-Signatur und Business Logic aus Quellcode verifiziert
- N+1 Prevention Pattern identifiziert (Fahrzeugtyp-Cache)
- AC1 Violation (`new Logger()`) dokumentiert, aber nicht zu fixen in dieser Story
- GetTaktischeStaerkeHandler bereits vollständig getestet (15 Tests) - kein Handlungsbedarf
- Mock-Patterns aus existierenden Tests extrahiert

**Validierung 2026-01-01 (4-Subagent-Analyse):**
- ✅ Logger-Spy Workaround Pattern hinzugefügt
- ✅ Error Mock Pattern für AC2 dokumentiert
- ✅ Expliziter Empty-List Test hinzugefügt
- ✅ Mapper Default Parameter dokumentiert
- ✅ Transaction Context Hinweis ergänzt
- ✅ Return Type Klarstellung (Result.ok([]) vs undefined)
- Validierungsreport: `docs/sprint-artifacts/validation-report-td2-2026-01-01.md`

### Completion Notes List

**2026-01-01 - Implementierung abgeschlossen (Dev Agent Amelia)**

- ✅ Test-Datei erstellt mit 17 Unit Tests (AC5 fordert 12 → übererfüllt)
- ✅ Mock-Factories für alle 3 Repositories implementiert
- ✅ Test-Daten Factories mit validen CUID2 IDs
- ✅ Logger-Spy Workaround für `new Logger()` Pattern implementiert
- ✅ Alle 5 ACs vollständig erfüllt
- ✅ Alle Tests grün: 18/18 passed (nach Code Review +1 Test)
- ✅ Keine Regression: 1321 kraefte Tests passed (52 Test Suites)
- ✅ TypeScript Check: No errors
- ✅ Bonus: Query Validation Tests für `GetEinsatzFahrzeugeQuery.create()` (3 Tests)

**Test-Übersicht:**
- AC1 Success Cases: 4 Tests
- AC2 Error Cases: 5 Tests (inkl. Bonus fallback error + Fahrzeugtyp Repo Fail)
- AC3 N+1 Prevention: 3 Tests
- AC4 DTO Mapping: 3 Tests
- Query Validation: 3 Tests
- **Gesamt: 18 Tests**

### File List

**Erstellt:**
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/__tests__/get-einsatz-fahrzeuge.handler.spec.ts` ✅

**Modifiziert:**
- `docs/sprint-artifacts/td2-query-handler-tests.md` (diese Story-Datei) ✅
- `docs/sprint-artifacts/sprint-status.yaml` (Status-Update) ✅
