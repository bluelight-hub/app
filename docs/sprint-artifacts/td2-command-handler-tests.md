# Story TD2.2: Command Handler Tests für RollenBesetzung

Status: ❌ cancelled

## Story

Als **Backend-Entwickler**,
möchte ich **umfassende Unit-Tests für BesetzeRolleHandler und GebeRolleFreiHandler implementieren**,
damit **die kritische Rollenbesetzungs-Logik vollständig testabgedeckt ist und Regressionen frühzeitig erkannt werden**.

## Cancellation Reason

> **Story wurde gecancelt am 2026-01-01 nach SM-Validierung (4 Subagents).**
>
> **Grund:** Tests existieren bereits vollständig:
> - `besetze-rolle.handler.spec.ts` (512 Zeilen, 34+ Tests)
> - `besetze-rolle.command.spec.ts` (196 Zeilen)
> - `gebe-rolle-frei.handler.spec.ts` (~200 Zeilen)
> - `gebe-rolle-frei.command.spec.ts` (~100 Zeilen)
>
> **Alle ACs der Story 5.1 & 5.2 sind bereits test-abgedeckt:**
> - AC1 Qualifikationsprüfung ✅
> - AC3 Idempotenz ✅
> - AC4 Auto-Freigabe ✅
> - Transaction Behavior ✅
> - Error Handling ✅
>
> **Potentielles Follow-Up (optional):**
> - Deutsche Test-Beschreibungen in GebeRolleFreiHandler (aktuell englisch)
> - Mock-Pattern Vereinheitlichung

---

## Hintergrund (Original)

Die Command Handler für RollenBesetzung (Story 5.1 & 5.2) sind produktionskritisch, aber derzeit ohne vollständige Unit-Tests. Dieses Tech Debt wurde in der Epic 6 Retrospektive identifiziert. Die Handler nutzen TransactionalCommandHandler, Outbox Pattern und komplexe Validierungslogik (Qualifikationsprüfung).

**Risiko ohne Tests:**
- Regression bei Qualifikations-Validierung (AC1 Story 5.1)
- Fehlerhafte automatische Freigabe (AC4 Story 5.1)
- Idempotenz-Verletzung bei Freigabe (AC3 Story 5.2)
- Outbox-Events nicht korrekt gespeichert

---

## Acceptance Criteria

### AC1: BesetzeRolleHandler Unit Tests (14+ Tests)

- [ ] **Given** BesetzeRolleHandler mit gemockten Dependencies
- [ ] **When** Unit-Tests für alle Szenarien implementiert werden
- [ ] **Then** sind folgende Test-Cases abgedeckt:

| Test-Case | Beschreibung | Priority |
|-----------|--------------|----------|
| TC-01 | Erfolgreiche Besetzung bei qualifizierter Person | P0 |
| TC-02 | Event RolleBesetzt wird in Outbox gespeichert | P0 |
| TC-03 | PERSON_NOT_QUALIFIED wenn Pflicht-Qualifikation fehlt | P0 |
| TC-04 | Automatische Freigabe bei bestehender Besetzung (AC4) | P0 |
| TC-05 | RolleFreigegeben + RolleBesetzt Events bei AC4 | P0 |
| TC-06 | PERSON_NOT_FOUND wenn Person nicht existiert | P1 |
| TC-07 | ROLLE_NOT_FOUND wenn RollenDefinition nicht existiert | P1 |
| TC-08 | Success wenn Rolle keine Anforderungen hat | P1 |
| TC-09 | Success wenn Person nur Pflicht-Quali hat (nicht Optional) | P1 |
| TC-10 | $transaction wird aufgerufen | P1 |
| TC-11 | Alle Repos erhalten gleichen TX-Context | P1 |
| TC-12 | Snapshot-Daten (Vorname, Nachname, RollenName) im Event | P1 |
| TC-13 | Command.create() Validierung - ungültige CUID | P2 |
| TC-14 | Command.create() Validierung - fehlendes Feld | P2 |

### AC2: GebeRolleFreiHandler Unit Tests (8+ Tests)

- [ ] **Given** GebeRolleFreiHandler mit gemockten Dependencies
- [ ] **When** Unit-Tests für alle Szenarien implementiert werden
- [ ] **Then** sind folgende Test-Cases abgedeckt:

| Test-Case | Beschreibung | Priority |
|-----------|--------------|----------|
| TC-15 | Erfolgreiche Freigabe, RolleFreigegeben Event | P0 |
| TC-16 | BEREITS_FREIGEGEBEN bei doppelter Freigabe (AC3) | P0 |
| TC-17 | ROLLEN_BESETZUNG_NOT_FOUND wenn nicht gefunden | P0 |
| TC-18 | Soft-Delete: freigegebenAm wird gesetzt | P0 |
| TC-19 | freigegebenVon wird korrekt gespeichert | P1 |
| TC-20 | $transaction wird aufgerufen | P1 |
| TC-21 | Command.create() Validierung - ungültige ID | P2 |
| TC-22 | Command.create() Validierung - fehlendes freigegebenVon | P2 |

### AC3: Test-Pattern Compliance (AC6)

- [ ] **Given** alle Test-Dateien
- [ ] **When** Code Review durchgeführt wird
- [ ] **Then** erfüllen alle Tests diese Kriterien:
  - [ ] AAA Pattern mit `// Given`, `// When`, `// Then` Kommentaren
  - [ ] `jest.Mocked<T>` für type-sichere Mocks
  - [ ] `jest.clearAllMocks()` in `afterEach` (nicht beforeEach!)
  - [ ] Deutsche Test-Beschreibungen (it('sollte...'))
  - [ ] Result Pattern Testing (`isSuccess`, `isFailure`, `error`)
  - [ ] Keine `expect().toThrow()` für Business-Logik

### AC4: TypeScript & Lint Check

- [ ] **Given** alle Tests implementiert
- [ ] **When** `pnpm --filter @bluelight-hub/backend exec tsc --noEmit` ausgeführt wird
- [ ] **Then** keine TypeScript-Fehler
- [ ] **And** `pnpm lint:check` zeigt keine neuen Violations

### AC5: Test Execution

- [ ] **Given** alle Tests implementiert
- [ ] **When** `pnpm --filter @bluelight-hub/backend test besetze-rolle.handler.spec.ts gebe-rolle-frei.handler.spec.ts` ausgeführt wird
- [ ] **Then** alle Tests grün
- [ ] **And** Coverage für Handler ≥80%

---

## Implementation Checklist

### Task 1: Test-Infrastruktur vorbereiten

- [ ] **1.1** Öffne: `packages/backend/src/application/kraefte/rollen-besetzung/commands/besetze-rolle/__tests__/besetze-rolle.handler.spec.ts`
- [ ] **1.2** Verifiziere/ergänze Imports:
  ```typescript
  import { Test, TestingModule } from '@nestjs/testing';
  import { PrismaService } from '@infrastructure/database/prisma.service';
  import { OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
  import { KRAEFTE_REPOSITORIES } from '@infrastructure/kraefte/di-tokens';
  import { LOGGER } from '@infrastructure/common/adapters/logger.adapter';
  import { BesetzeRolleHandler } from '../besetze-rolle.handler';
  import { BesetzeRolleCommand } from '../besetze-rolle.command';
  import { Result } from '@domain/common/result';
  import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';
  import { RolleBesetzt } from '@domain/kraefte/events/rolle-besetzt.event';
  import { RolleFreigegeben } from '@domain/kraefte/events/rolle-freigegeben.event';
  import { createId } from '@paralleldrive/cuid2';
  ```
- [ ] **1.3** Definiere Mock-Typen (AC6: jest.Mocked<T>):
  ```typescript
  let handler: BesetzeRolleHandler;
  let mockPrismaService: jest.Mocked<{ $transaction: jest.Mock }>;
  let mockOutboxRepository: jest.Mocked<{ save: jest.Mock }>;
  let mockRollenBesetzungRepository: jest.Mocked<{
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzIdAndRolleId: jest.Mock;
    delete: jest.Mock;
  }>;
  let mockEinsatzPersonRepository: jest.Mocked<{
    findById: jest.Mock;
  }>;
  let mockRollenDefinitionRepository: jest.Mocked<{
    findById: jest.Mock;
  }>;
  let mockLogger: jest.Mocked<{ log: jest.Mock; error: jest.Mock; warn: jest.Mock }>;
  ```

### Task 2: Mock-Factories erstellen

- [ ] **2.1** Erstelle Test-Konstanten:
  ```typescript
  const validEinsatzId = createId();
  const validEinsatzPersonId = createId();
  const validRollenDefinitionId = createId();
  const validQualifikationId = createId();
  const validBesetztVon = createId();
  ```
- [ ] **2.2** Erstelle `createMockEinsatzPerson()` Factory:
  ```typescript
  function createMockEinsatzPerson(overrides?: {
    id?: string;
    vorname?: string;
    nachname?: string;
    qualifikationIds?: string[];
  }) {
    return {
      id: { value: overrides?.id ?? validEinsatzPersonId },
      vorname: overrides?.vorname ?? 'Max',
      nachname: overrides?.nachname ?? 'Mustermann',
      qualifikationIds: overrides?.qualifikationIds ?? [validQualifikationId],
    };
  }
  ```
- [ ] **2.3** Erstelle `createMockRollenDefinition()` Factory:
  ```typescript
  function createMockRollenDefinition(overrides?: {
    id?: string;
    name?: string;
    erforderlicheQualifikationen?: Array<{ qualifikationId: string; istPflicht: boolean }>;
  }) {
    return {
      id: { value: overrides?.id ?? validRollenDefinitionId },
      name: overrides?.name ?? 'Gruppenführer',
      erforderlicheQualifikationen: overrides?.erforderlicheQualifikationen ?? [
        { qualifikationId: validQualifikationId, istPflicht: true },
      ],
    };
  }
  ```
- [ ] **2.4** Erstelle `createMockRollenBesetzung()` Factory für AC4-Tests:
  ```typescript
  function createMockRollenBesetzung(overrides?: {
    id?: string;
    einsatzId?: string;
    personVorname?: string;
    personNachname?: string;
    rollenName?: string;
  }) {
    return {
      id: { value: overrides?.id ?? createId() },
      einsatzId: { value: overrides?.einsatzId ?? validEinsatzId },
      personVorname: overrides?.personVorname ?? 'Alt',
      personNachname: overrides?.personNachname ?? 'Person',
      rollenName: overrides?.rollenName ?? 'Gruppenführer',
      freigeben: jest.fn().mockReturnValue(Result.ok(undefined)),
      getDomainEvents: jest.fn().mockReturnValue([]),
      clearDomainEvents: jest.fn(),
    };
  }
  ```

### Task 3: BesetzeRolleHandler Test-Setup (beforeEach)

- [ ] **3.1** Implementiere beforeEach mit NestJS TestingModule:
  ```typescript
  beforeEach(async () => {
    // Mocks initialisieren
    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = { txMarker: 'test-tx' };
        return callback(txMock);
      }),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockRollenBesetzungRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzIdAndRolleId: jest.fn().mockResolvedValue(Result.ok(null)),
      delete: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    mockEinsatzPersonRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok(createMockEinsatzPerson())),
    };

    mockRollenDefinitionRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok(createMockRollenDefinition())),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BesetzeRolleHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG, useValue: mockRollenBesetzungRepository },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockEinsatzPersonRepository },
        { provide: KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION, useValue: mockRollenDefinitionRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<BesetzeRolleHandler>(BesetzeRolleHandler);
  });

  afterEach(() => {
    jest.clearAllMocks(); // AC6: KRITISCH!
  });
  ```

### Task 4: BesetzeRolleHandler Tests implementieren (TC-01 bis TC-14)

- [ ] **4.1** TC-01: Erfolgreiche Besetzung
  ```typescript
  describe('execute', () => {
    it('sollte Rolle erfolgreich besetzen wenn Person qualifiziert ist (TC-01)', async () => {
      // Given (Arrange)
      const command = BesetzeRolleCommand.create({
        einsatzId: validEinsatzId,
        einsatzPersonId: validEinsatzPersonId,
        rollenDefinitionId: validRollenDefinitionId,
        besetztVon: validBesetztVon,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(mockRollenBesetzungRepository.save).toHaveBeenCalledTimes(1);
    });
  });
  ```
- [ ] **4.2** TC-02: Event in Outbox
  ```typescript
  it('sollte RolleBesetzt Event in Outbox speichern (TC-02)', async () => {
    // Given
    const command = BesetzeRolleCommand.create({ /* ... */ }).value!;

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

    const events = mockOutboxRepository.save.mock.calls[0][0];
    expect(Array.isArray(events)).toBe(true);
    expect(events.some((e: unknown) => e instanceof RolleBesetzt)).toBe(true);
  });
  ```
- [ ] **4.3** TC-03: PERSON_NOT_QUALIFIED
  ```typescript
  it('sollte PERSON_NOT_QUALIFIED zurückgeben wenn Pflicht-Qualifikation fehlt (TC-03)', async () => {
    // Given - Person hat KEINE Qualifikationen
    mockEinsatzPersonRepository.findById.mockResolvedValue(
      Result.ok(createMockEinsatzPerson({ qualifikationIds: [] }))
    );
    const command = BesetzeRolleCommand.create({ /* ... */ }).value!;

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED);
    expect(mockRollenBesetzungRepository.save).not.toHaveBeenCalled();
  });
  ```
- [ ] **4.4** TC-04: Automatische Freigabe bei bestehender Besetzung
  ```typescript
  it('sollte bestehende Besetzung automatisch freigeben vor neuer Besetzung (TC-04)', async () => {
    // Given - Bestehende Besetzung existiert
    const existingBesetzung = createMockRollenBesetzung();
    mockRollenBesetzungRepository.findByEinsatzIdAndRolleId.mockResolvedValue(
      Result.ok(existingBesetzung)
    );
    const command = BesetzeRolleCommand.create({ /* ... */ }).value!;

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(existingBesetzung.freigeben).toHaveBeenCalledWith(validBesetztVon);
    expect(mockRollenBesetzungRepository.delete).toHaveBeenCalledWith(
      existingBesetzung.id,
      expect.any(Object) // TX Context
    );
  });
  ```
- [ ] **4.5** TC-05 bis TC-14: Implementiere restliche Tests nach Muster

### Task 5: GebeRolleFreiHandler Tests implementieren (TC-15 bis TC-22)

- [ ] **5.1** Erstelle Test-Datei: `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/__tests__/gebe-rolle-frei.handler.spec.ts`
- [ ] **5.2** Implementiere ähnliches Setup wie Task 3 (weniger Dependencies)
- [ ] **5.3** TC-15: Erfolgreiche Freigabe
  ```typescript
  it('sollte Rolle erfolgreich freigeben und Event emittieren (TC-15)', async () => {
    // Given
    const besetzung = createMockRollenBesetzung({ id: validRollenBesetzungId });
    mockRollenBesetzungRepository.findById.mockResolvedValue(Result.ok(besetzung));
    const command = GebeRolleFreiCommand.create({
      rollenBesetzungId: validRollenBesetzungId,
      freigegebenVon: validFreigegebenVon,
    }).value!;

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(besetzung.freigeben).toHaveBeenCalledWith(validFreigegebenVon);
    expect(mockRollenBesetzungRepository.save).toHaveBeenCalledTimes(1);
  });
  ```
- [ ] **5.4** TC-16: BEREITS_FREIGEGEBEN
  ```typescript
  it('sollte BEREITS_FREIGEGEBEN zurückgeben bei doppelter Freigabe (TC-16)', async () => {
    // Given - Besetzung bereits freigegeben
    const besetzung = createMockRollenBesetzung();
    besetzung.freigeben.mockReturnValue(
      Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN)
    );
    mockRollenBesetzungRepository.findById.mockResolvedValue(Result.ok(besetzung));

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
  });
  ```
- [ ] **5.5** TC-17 bis TC-22: Implementiere restliche Tests

### Task 6: Command Validation Tests

- [ ] **6.1** Erstelle/erweitere: `besetze-rolle.command.spec.ts`
  ```typescript
  describe('BesetzeRolleCommand', () => {
    describe('create', () => {
      it('sollte Result.ok bei gültigen Daten zurückgeben', () => {
        // Given
        const props = {
          einsatzId: createId(),
          einsatzPersonId: createId(),
          rollenDefinitionId: createId(),
          besetztVon: createId(),
        };

        // When
        const result = BesetzeRolleCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeInstanceOf(BesetzeRolleCommand);
      });

      it('sollte Result.fail bei ungültiger CUID zurückgeben (TC-13)', () => {
        // Given
        const props = {
          einsatzId: 'invalid-cuid',
          einsatzPersonId: createId(),
          rollenDefinitionId: createId(),
          besetztVon: createId(),
        };

        // When
        const result = BesetzeRolleCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid Cuid');
      });
    });
  });
  ```
- [ ] **6.2** Erstelle ähnliche Tests für `gebe-rolle-frei.command.spec.ts`

### Task 7: Verifizierung

- [ ] **7.1** TypeScript Check: `pnpm --filter @bluelight-hub/backend exec tsc --noEmit`
- [ ] **7.2** Lint Check: `pnpm lint:check`
- [ ] **7.3** Tests ausführen:
  ```bash
  DATABASE_URL="" pnpm --filter @bluelight-hub/backend exec jest \
    besetze-rolle.handler.spec.ts \
    gebe-rolle-frei.handler.spec.ts \
    --no-coverage
  ```
- [ ] **7.4** Coverage verifizieren: `--coverage --collectCoverageFrom="**/besetze-rolle.handler.ts,**/gebe-rolle-frei.handler.ts"`

---

## Dev Notes

### Handler-Analyse (Kritische Details)

**BesetzeRolleHandler** (`packages/backend/src/application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler.ts`):
- Extends `TransactionalCommandHandler<BesetzeRolleCommand, string>`
- 4 Repository Dependencies + Logger
- 8-Schritt Ausführungslogik:
  1. Value Objects erstellen (EinsatzId, EinsatzPersonId, RolleId)
  2. Person laden + Existenz prüfen
  3. RollenDefinition laden + Existenz prüfen
  4. **AC1: Pflicht-Qualifikationen validieren** - Array-Filter auf `istPflicht: true`
  5. **AC4: Bestehende Besetzung freigeben** - `findByEinsatzIdAndRolleId()` + `delete()`
  6. Neue RollenBesetzung mit Snapshots erstellen
  7. `save()` aufrufen
  8. Events extrahieren und zurückgeben

**GebeRolleFreiHandler** (`packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler.ts`):
- Extends `TransactionalCommandHandler<GebeRolleFreiCommand, void>`
- 2 Repository Dependencies + Logger
- 4-Schritt Ausführungslogik:
  1. RollenBesetzung laden + Existenz prüfen
  2. **AC3: Idempotenz** - `aggregate.freigeben()` prüft `freigegebenAm`
  3. `save()` mit Update-Persistence
  4. Events extrahieren und zurückgeben

### Test-Pattern Reference (AC6)

```typescript
// AAA Pattern mit Given-When-Then
it('sollte erfolgreich sein bei gültigen Daten', async () => {
  // Given (Arrange)
  const command = Command.create({ ... }).value!;
  mockRepository.findById.mockResolvedValue(Result.ok(entity));

  // When (Act)
  const result = await handler.execute(command);

  // Then (Assert)
  expect(result.isSuccess).toBe(true);
});

// jest.Mocked<T> für Type-Safe Mocks
let mockRepo: jest.Mocked<{ save: jest.Mock; findById: jest.Mock }>;

// KRITISCH: afterEach mit clearAllMocks
afterEach(() => {
  jest.clearAllMocks();
});

// Result Pattern - NIEMALS expect().toThrow()
expect(result.isFailure).toBe(true);
expect(result.error).toBe(ERROR_CODE);
```

### DI Token Constants

```typescript
// Von: packages/backend/src/infrastructure/di-tokens.ts
import { OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

// Von: packages/backend/src/infrastructure/kraefte/di-tokens.ts
import { KRAEFTE_REPOSITORIES } from '@infrastructure/kraefte/di-tokens';
// → KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG
// → KRAEFTE_REPOSITORIES.EINSATZ_PERSON
// → KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION
```

### Error Codes

```typescript
// Von: packages/backend/src/domain/kraefte/common/rollen-besetzung-error-codes.ts
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';

// Verfügbare Codes:
// PERSON_NOT_FOUND, ROLLE_NOT_FOUND, PERSON_NOT_QUALIFIED
// ROLLEN_BESETZUNG_NOT_FOUND, BEREITS_FREIGEGEBEN
```

### TransactionContext Mocking Pattern

```typescript
mockPrismaService = {
  $transaction: jest.fn().mockImplementation(async (callback) => {
    const txMock = { txMarker: 'test-tx' };
    return callback(txMock);
  }),
};

// Verifizierung
expect(mockRepository.save).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ txMarker: 'test-tx' }) // TX-Context
);
```

### References

- Handler Source: `packages/backend/src/application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler.ts`
- Handler Source: `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler.ts`
- Test-Pattern Referenz: `packages/backend/src/application/einsatz/commands/create-einsatz/__tests__/create-einsatz.handler.spec.ts`
- AC6 Standards: `CLAUDE.md#code-review-checklist`, Zeile 178-212
- Story 5.1: `docs/sprint-artifacts/5-1-rolle-besetzen-mit-qualifikationsvalidierung.md`
- Story 5.2: `docs/sprint-artifacts/5-2-rolle-freigeben.md`

---

## Dev Agent Record

### Context Reference

- Story Context generiert via BMad create-story Workflow (YOLO Mode)
- 4 parallele Subagents für Artefakt-Analyse verwendet

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) via BMad SM Agent

### Debug Log References

N/A

### Completion Notes List

N/A

### File List

**Zu erstellen/erweitern:**
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/besetze-rolle/__tests__/besetze-rolle.handler.spec.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/besetze-rolle/__tests__/besetze-rolle.command.spec.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/__tests__/gebe-rolle-frei.handler.spec.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/__tests__/gebe-rolle-frei.command.spec.ts`

---

## Change Log

| Datum | Änderung |
|-------|----------|
| 2026-01-01 | Story TD2.2 Draft erstellt via BMad create-story YOLO (4 Subagents) |
| 2026-01-01 | **SM Validation (4 Subagents):** Story CANCELLED - Tests existieren bereits vollständig |
