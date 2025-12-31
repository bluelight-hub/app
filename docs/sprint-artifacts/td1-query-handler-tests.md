# Story TD1.1: Query Handler Tests für RollenBesetzung

Status: Ready for Review

## Story

As a **Developer**,
I want **comprehensive unit tests for FindAllRollenBesetzungQueryHandler**,
so that **query behavior is validated and regressions are prevented**.

## Hintergrund

Diese Story ist Teil des **Tech Debt Sprint 1**, entstanden aus der Epic 5 Retrospektive.
Der `FindAllRollenBesetzungQueryHandler` hat aktuell **0% Test Coverage**.

**Referenz:** Story 5.1 und 5.2 haben AC-Tests für Command Handler, aber Query Handler wurden ausgelassen.

**Wichtig:** Der Handler ist ein reiner Query-Handler mit einfacher Logik:
1. Repository aufrufen (Repository filtert bereits freigegebene Rollen)
2. Bei Fehler: Error loggen und zurückgeben
3. Bei Erfolg: Domain-Objekte zu DTOs mappen

## Acceptance Criteria

### AC1: Success Cases implementiert
- [x] Test: Happy Path - Repository gibt aktive Besetzungen zurück, Handler mappt zu DTOs
- [x] Test: Empty Result - Repository gibt `[]` zurück, Handler gibt `Result.ok([])` zurück

**Hinweis:** AC4 (Filtering freigegebener Rollen) wird durch Repository implementiert, nicht Handler.

### AC2: Error Cases implementiert
- [x] Test: Repository-Fehler → `Result.fail` mit Error-Message, Logger.error() aufgerufen
- [x] Test: Repository gibt `Result.ok(null)` zurück → Handler behandelt mit `?? []` Operator

**Hinweis:** Der Handler empfängt bereits validierte Query-Objekte. Query-Validierung passiert VOR Handler-Aufruf.

### AC3: DTO Mapping Cases implementiert
- [x] Test: Snapshot-Daten korrekt in DTO gemappt (rollenName, personVorname, personNachname)
- [x] Test: personName wird als `${personVorname} ${personNachname}` konstruiert
- [x] Test: DTO-Struktur vollständig (id, rollenName, personName, rollenDefinitionId, einsatzPersonId)

### AC4: Test-Pattern Compliance (AC6 CLAUDE.md)
- [x] AAA Pattern mit Given-When-Then Kommentaren
- [x] `jest.clearAllMocks()` in beforeEach
- [x] `jest.Mocked<T>` für Repository und Logger Mocks
- [x] Mindestens 6 Unit Tests gesamt (8 Tests implementiert)

## Tasks / Subtasks

- [x] Task 1: Test-Datei erstellen (AC: 4)
  - [x] Erstelle `__tests__/find-all-rollen-besetzung.handler.spec.ts` neben Handler
  - [x] Test-Setup mit vollständiger Mock-Factory für Repository und Logger

- [x] Task 2: Success Cases (AC: 1)
  - [x] Test: `should return mapped DTOs when repository returns active RollenBesetzungen`
  - [x] Test: `should return empty array when repository returns empty list`

- [x] Task 3: Error Cases (AC: 2)
  - [x] Test: `should return Result.fail and log error when repository returns failure`
  - [x] Test: `should handle null result from repository with nullish coalescing`

- [x] Task 4: DTO Mapping Cases (AC: 3)
  - [x] Test: `should correctly concatenate personVorname and personNachname to personName`
  - [x] Test: `should map all required DTO fields from domain aggregate`
  - [x] Test: `should map multiple RollenBesetzungen correctly` (Bonus)

- [x] Task 5: Verifizierung
  - [x] Alle Tests grün: `pnpm --filter @bluelight-hub/backend exec jest find-all-rollen-besetzung.handler.spec.ts`
  - [x] Alle 75 RollenBesetzung-Tests grün (7 Test Suites)

## Dev Notes

### Handler-Signatur

```typescript
class FindAllRollenBesetzungQueryHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(
    query: FindAllRollenBesetzungQuery
  ): Promise<Result<RollenBesetzungListItemDto[]>>
}
```

**Pfad:** `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/`

### Handler Business Logic

```typescript
// 1. Repository aufrufen
const result = await this.rollenBesetzungRepository.findByEinsatzId(query.einsatzId);

// 2. Error Handling
if (result.isFailure) {
  this.logger.error(result.error, 'FindAllRollenBesetzungQueryHandler');
  return Result.fail(result.error);
}

// 3. Null-safe Array extraction
const besetzungen = result.value ?? [];

// 4. Domain → DTO Mapping
const dtos: RollenBesetzungListItemDto[] = besetzungen.map((b) => ({
  id: b.id.value,
  rollenName: b.rollenName,
  personName: `${b.personVorname} ${b.personNachname}`,  // Template-Literal!
  rollenDefinitionId: b.rolleId.value,  // Intern "rolleId", exponiert als "rollenDefinitionId"
  einsatzPersonId: b.einsatzPersonId.value,
}));

return Result.ok(dtos);
```

### Mock-Setup Pattern

```typescript
import { Result } from '@domain/common/result';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';

// Vollständige Mock-Factory mit Default-Werten
const createMockRepository = (): jest.Mocked<IRollenBesetzungRepository> => ({
  findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
  findById: jest.fn().mockResolvedValue(Result.ok(null)),
  save: jest.fn().mockResolvedValue(Result.ok(undefined)),
  findByEinsatzIdAndRolleId: jest.fn().mockResolvedValue(Result.ok(null)),
  delete: jest.fn().mockResolvedValue(Result.ok(undefined)),
});

const createMockLogger = (): jest.Mocked<ILogger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});
```

### Test-Daten Factory

```typescript
import { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { createId } from '@paralleldrive/cuid2';

const createTestRollenBesetzung = (overrides: Partial<{
  id: string;
  einsatzId: string;
  rollenName: string;
  personVorname: string;
  personNachname: string;
  freigegebenAm: Date | undefined;
}> = {}): RollenBesetzung => {
  const result = RollenBesetzung.reconstitute({
    id: RollenBesetzungId.create(overrides.id ?? createId()).value!,
    einsatzId: EinsatzId.create(overrides.einsatzId ?? createId()).value!,
    rolleId: RolleId.create(createId()).value!,
    einsatzPersonId: EinsatzPersonId.create(createId()).value!,
    rollenName: overrides.rollenName ?? 'Einsatzleiter',
    personVorname: overrides.personVorname ?? 'Max',
    personNachname: overrides.personNachname ?? 'Mustermann',
    createdAt: new Date(),
    createdBy: 'test-user-id',
    updatedAt: new Date(),
    updatedBy: undefined,
    freigegebenAm: overrides.freigegebenAm,
    freigegebenVon: undefined,
  });

  if (result.isFailure) {
    throw new Error(`Test setup failed: ${result.error}`);
  }
  return result.value!;
};
```

### DTO-Struktur

```typescript
// RollenBesetzungListItemDto - alle Felder Pflicht
{
  id: string;                    // RollenBesetzung.id.value (CUID2)
  rollenName: string;            // Snapshot: RollenBesetzung.rollenName
  personName: string;            // Konstruiert: `${personVorname} ${personNachname}`
  rollenDefinitionId: string;    // RollenBesetzung.rolleId.value (NICHT rollenDefinitionId!)
  einsatzPersonId: string;       // RollenBesetzung.einsatzPersonId.value
}
```

### Wichtige Architektur-Details

| Aspekt | Detail |
|--------|--------|
| **Filtering (AC4 Story 5.2)** | Passiert im Repository (`freigegebenAm: null`), NICHT im Handler |
| **Sortierung** | Passiert im Repository (`orderBy: createdAt asc`), NICHT im Handler |
| **Query-Validierung** | Passiert VOR Handler-Aufruf in `Query.create()` |
| **Error bei leerer Liste** | KEIN Error! Handler gibt `Result.ok([])` zurück |

### Test-Struktur Vorlage

```typescript
describe('FindAllRollenBesetzungQueryHandler', () => {
  let handler: FindAllRollenBesetzungQueryHandler;
  let mockRepository: jest.Mocked<IRollenBesetzungRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = createMockRepository();
    mockLogger = createMockLogger();

    handler = new FindAllRollenBesetzungQueryHandler(
      mockRepository,
      mockLogger,
    );
  });

  describe('execute - Success Cases', () => {
    it('should return mapped DTOs when repository returns active RollenBesetzungen', async () => {
      // Given (Arrange)
      const testBesetzung = createTestRollenBesetzung({
        personVorname: 'Anna',
        personNachname: 'Schmidt',
        rollenName: 'LNA',
      });
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([testBesetzung]));

      const query = FindAllRollenBesetzungQuery.create(createId()).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].personName).toBe('Anna Schmidt');
      expect(result.value![0].rollenName).toBe('LNA');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return empty array when repository returns empty list', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));
      const query = FindAllRollenBesetzungQuery.create(createId()).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });
  });

  describe('execute - Error Cases', () => {
    it('should return Result.fail and log error when repository returns failure', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue(
        Result.fail('Database connection error')
      );
      const query = FindAllRollenBesetzungQuery.create(createId()).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database connection error',
        'FindAllRollenBesetzungQueryHandler'
      );
    });
  });

  describe('execute - DTO Mapping', () => {
    it('should correctly map all domain fields to DTO', async () => {
      // Given (Arrange)
      const testBesetzung = createTestRollenBesetzung();
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([testBesetzung]));
      const query = FindAllRollenBesetzungQuery.create(createId()).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value![0];
      expect(dto.id).toBe(testBesetzung.id.value);
      expect(dto.rollenName).toBe(testBesetzung.rollenName);
      expect(dto.rollenDefinitionId).toBe(testBesetzung.rolleId.value);
      expect(dto.einsatzPersonId).toBe(testBesetzung.einsatzPersonId.value);
    });
  });
});
```

### References

- [Handler: find-all-rollen-besetzung.handler.ts]
- [DTO: rollen-besetzung.dto.ts - RollenBesetzungListItemDto]
- [Repository Interface: i-rollen-besetzung.repository.ts]
- [Test Pattern: besetze-rolle.handler.spec.ts]
- [Test Pattern: gebe-rolle-frei.handler.spec.ts]
- [CLAUDE.md#AC6 - Test Pattern Requirements]

## Dev Agent Record

### Context Reference

Story erstellt basierend auf:
- Epic 5 Retrospektive Action Items
- Subagent-Analyse von Query Handler, Controller und Mapper
- **Validiert:** 2025-12-28 mit 4-facher Subagent-Analyse

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Validation Notes

- Handler-Signatur und Business Logic verifiziert
- Mock-Patterns aus existierenden Tests extrahiert (besetze-rolle, gebe-rolle-frei)
- DTO-Mapping Details aus Handler-Code validiert
- Architektur-Verantwortlichkeiten klargestellt (Repository vs Handler)

### Completion Notes List

**Story TD1.1 vollständig implementiert am 2025-12-28:**

- ✅ 8 Unit Tests für `FindAllRollenBesetzungQueryHandler` implementiert
- ✅ Alle ACs erfüllt (Success Cases, Error Cases, DTO Mapping, Test-Pattern Compliance)
- ✅ AAA Pattern mit Given-When-Then Kommentaren durchgehend verwendet
- ✅ Vollständige Mock-Factories für Repository und Logger erstellt
- ✅ Keine Regression eingeführt (alle 75 RollenBesetzung-Tests grün)
- ✅ Bonus-Test für multiple RollenBesetzungen hinzugefügt

**Test-Zusammenfassung:**
- Success Cases: 2 Tests (AC1)
- Error Cases: 2 Tests (AC2)
- DTO Mapping: 3 Tests (AC3)
- Repository Interaction: 1 Test

### File List

**Neue Dateien:**
- `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/__tests__/find-all-rollen-besetzung.handler.spec.ts`

**Modifizierte Dateien:**
- `docs/sprint-artifacts/td1-query-handler-tests.md` (diese Story-Datei)
- `docs/sprint-artifacts/sprint-status.yaml` (Status-Update)
