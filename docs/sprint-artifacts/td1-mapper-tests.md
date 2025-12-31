# Story TD1.3: RollenBesetzung Mapper Tests

Status: Ready for Review

## Story

As a **Developer**,
I want **Unit Tests für den PrismaRollenBesetzungMapper**,
so that **die bidirektionale Transformation zwischen Domain Aggregate und Prisma Entity zuverlässig validiert ist**.

## Hintergrund

Diese Story ist Teil des **Tech Debt Sprint 1** (Action Item aus Epic 5 Retrospektive).

**Aktueller Stand:**
- Query Handler Tests: ✅ DONE (8 Tests)
- Controller Tests: ✅ DONE (30 Tests)
- **Mapper Tests: 0% Coverage** ← Diese Story

**Warum wichtig:**
- Mapper sind kritische Infrastruktur-Komponenten
- Fehlerhafte NULL ↔ undefined Konvertierung führt zu Runtime-Fehlern
- Value Object Validierung (CUID2) muss fail-fast funktionieren
- Soft-Delete Pattern (Story 5.2) muss korrekt gemappt werden

**Referenz-Pattern:** `prisma-einsatz-person.mapper.spec.ts` (14 Tests)

## Acceptance Criteria

### AC1: toDomain() Success Tests
- [x] Vollständige Prisma Entity → valides RollenBesetzung Aggregate
- [x] Alle 4 Value Objects korrekt erstellt (RollenBesetzungId, EinsatzId, EinsatzPersonId, RolleId)
- [x] Snapshot-Felder korrekt gemappt (rollenName, personVorname, personNachname)
- [x] Audit-Trail Pflichtfelder korrekt (createdAt, createdBy, updatedAt) - direkt vom Aggregate übernommen
- [x] NULL → undefined Konvertierung für optionale Felder (updatedBy, freigegebenAm, freigegebenVon)
- [x] Soft-Delete Felder mit DateTime korrekt gemappt (freigegebenAm als Date, nicht null)

### AC2: toDomain() Failure Tests
- [x] Ungültige id → Result.fail mit Fehlermeldung "id: ..."
- [x] Ungültige einsatzId → Result.fail mit Fehlermeldung "einsatzId: ..."
- [x] Ungültige personId → Result.fail mit Fehlermeldung "personId: ..."
- [x] Ungültige rollenDefinitionId → Result.fail mit Fehlermeldung "rolleId: ..."

### AC3: toPersistence() Tests
- [x] RollenBesetzung Aggregate → Prisma CreateInput
- [x] Alle IDs korrekt via Value Object `.value` Getter extrahiert (id, einsatzId, personId, rolleId)
- [x] Relations korrekt via `.connect()` aufgelöst (einsatz, rollenDefinition, person, creator)
- [x] Snapshot-Felder exakt übernommen (rollenName, personVorname, personNachname)
- [x] createdAt/updatedAt NICHT im CreateInput (Prisma auto-managed via @default/@updatedAt)

### AC4: toUpdatePersistence() Tests
- [x] Soft-Delete Felder korrekt gesetzt (freigegebenAm, freigegebenVon)
- [x] undefined → null Konvertierung für Soft-Delete Felder
- [x] Conditional updater Relation (nur wenn updatedBy vorhanden)
- [x] Keine anderen Aggregate-Felder im UpdateInput (Immutability)

### AC5: Test-Pattern Compliance (CLAUDE.md AC6)
- [x] AAA Pattern mit Given-When-Then Kommentaren
- [x] `jest.clearAllMocks()` in beforeEach
- [x] Mock-Factories für Prisma Entity und Domain Aggregate
- [x] Deterministische CUID2 Test-IDs

## Tasks / Subtasks

- [x] Task 1: Test-Setup und Mock-Factories (AC: 5)
  - [x] Erstelle `__tests__/prisma-rollen-besetzung.mapper.spec.ts`
  - [x] Implementiere `createValidTestId(suffix)` Helper (CUID2 Format)
  - [x] Implementiere `createMockPrismaRollenBesetzung(overrides)` Factory
  - [x] Implementiere `createMockDomainAggregate(overrides)` Factory

- [x] Task 2: toDomain() Success Tests (AC: 1)
  - [x] Test: sollte alle required Felder korrekt mappen
  - [x] Test: sollte Snapshot-Felder korrekt mappen (AC3: Historische Korrektheit)
  - [x] Test: sollte isActive = true für aktive Besetzung (freigegebenAm = null)
  - [x] Test: sollte isActive = false für freigegebene Besetzung
  - [x] Test: sollte updatedBy null → undefined konvertieren
  - [x] Test: sollte freigegebenAm null → undefined konvertieren
  - [x] Test: sollte freigegebenVon null → undefined konvertieren
  - [x] Test: sollte updatedBy string korrekt beibehalten

- [x] Task 3: toDomain() Failure Tests (AC: 2)
  - [x] Test: sollte Result.fail bei ungültiger id zurückgeben
  - [x] Test: sollte Result.fail bei ungültiger einsatzId zurückgeben
  - [x] Test: sollte Result.fail bei ungültiger personId zurückgeben
  - [x] Test: sollte Result.fail bei ungültiger rollenDefinitionId zurückgeben

- [x] Task 4: toPersistence() Tests (AC: 3)
  - [x] Test: sollte alle Felder zu Prisma CreateInput korrekt mappen
  - [x] Test: sollte Snapshot-Felder korrekt in Persistence mappen
  - [x] Test: sollte creator Relation korrekt setzen

- [x] Task 5: toUpdatePersistence() Tests (AC: 4)
  - [x] Test: sollte Freigabe-Felder korrekt mappen wenn Aggregate freigegeben
  - [x] Test: sollte Freigabe-Felder als null mappen wenn nicht freigegeben
  - [x] Test: sollte updater Relation setzen wenn updatedBy vorhanden
  - [x] Test: sollte updater Relation NICHT setzen wenn updatedBy undefined

- [x] Bonus: Round-Trip Tests (zusätzlich)
  - [x] Test: sollte Aggregate Daten bei Round-Trip erhalten (Prisma → Domain → Prisma)
  - [x] Test: sollte Domain Events bei Rekonstruktion nicht emittieren
  - [x] Test: sollte Freigabe-Daten bei Round-Trip erhalten

- [x] Bonus: Edge Cases (zusätzlich)
  - [x] Test: sollte leeren String als rollenName akzeptieren
  - [x] Test: sollte Timestamps korrekt als Date-Objekte mappen
  - [x] Test: sollte alle 4 Value Objects korrekt typisiert zurückgeben

## Dev Notes

### Mapper-Implementierung (Source of Truth)

**Datei:** `packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts`

```typescript
export class PrismaRollenBesetzungMapper {
  // 1. toDomain(): Prisma Entity → Domain Aggregate
  static toDomain(entity: Prisma.EinsatzRollenbesetzungGetPayload<object>): Result<RollenBesetzung>

  // 2. toPersistence(): Domain Aggregate → Prisma CreateInput
  static toPersistence(aggregate: RollenBesetzung): Prisma.EinsatzRollenbesetzungCreateInput

  // 3. toUpdatePersistence(): Domain Aggregate → Prisma UpdateInput (Soft-Delete)
  static toUpdatePersistence(aggregate: RollenBesetzung): Prisma.EinsatzRollenbesetzungUpdateInput
}
```

### Field-Mapping Übersicht

| Prisma Feld | Domain Feld | Transformation |
|-------------|-------------|----------------|
| `id` | `RollenBesetzungId` | Value Object (CUID2 validated) |
| `einsatzId` | `EinsatzId` | Value Object (CUID2 validated) |
| `personId` | `EinsatzPersonId` | Value Object (CUID2 validated) |
| `rollenDefinitionId` | `RolleId` | Value Object (CUID2 validated) |
| `rollenName` | `rollenName` | string (Snapshot) |
| `personVorname` | `personVorname` | string (Snapshot) |
| `personNachname` | `personNachname` | string (Snapshot) |
| `createdAt` | `createdAt` | Date |
| `createdBy` | `createdBy` | string |
| `updatedAt` | `updatedAt` | Date |
| `updatedBy` | `updatedBy` | null → undefined |
| `freigegebenAm` | `freigegebenAm` | null → undefined |
| `freigegebenVon` | `freigegebenVon` | null → undefined |

### Prisma Auto-Managed Felder

Diese Felder werden **NICHT** im Mapper gesetzt, sondern automatisch durch Prisma:

| Feld | Prisma Decorator | Verhalten |
|------|------------------|-----------|
| `createdAt` | `@default(now())` | Automatisch bei INSERT gesetzt |
| `updatedAt` | `@updatedAt` | Automatisch bei UPDATE gesetzt |

**Konsequenz für toPersistence():**
- Diese Felder sind NICHT im `CreateInput` enthalten
- Der Mapper setzt sie nicht explizit
- Tests sollten verifizieren, dass diese Felder NICHT im Result sind

**Konsequenz für toUpdatePersistence():**
- `updatedAt` wird automatisch aktualisiert
- Nur `freigegebenAm`, `freigegebenVon`, `updater` werden explizit gesetzt

### Mock-Setup Pattern

```typescript
/**
 * CUID2 Test-ID Helper (25 Zeichen, Format: clw...)
 */
function createValidTestId(suffix: string): string {
  const base = 'clw3h8x9y0000qwertyui';
  return `${base}${suffix.padStart(5, '0')}`;
}

/**
 * Type-Alias für Prisma Entity (analog zu prisma-einsatz-person.mapper.spec.ts)
 */
type PrismaRollenBesetzungEntity = {
  id: string;
  einsatzId: string;
  personId: string;
  rollenDefinitionId: string;
  rollenName: string;
  personVorname: string;
  personNachname: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string | null;
  freigegebenAm: Date | null;
  freigegebenVon: string | null;
};

/**
 * Mock Prisma EinsatzRollenbesetzung Entity
 *
 * Hinweis: Prisma gibt NULL für optionale Felder zurück (nicht undefined)
 */
function createMockPrismaRollenBesetzung(
  overrides: Partial<PrismaRollenBesetzungEntity> = {}
): PrismaRollenBesetzungEntity {
  return {
    id: createValidTestId('bestz'),
    einsatzId: createValidTestId('eins1'),
    personId: createValidTestId('pers1'),
    rollenDefinitionId: createValidTestId('rolle'),
    rollenName: 'Einsatzleiter',
    personVorname: 'Max',
    personNachname: 'Mustermann',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    createdBy: createValidTestId('user1'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    updatedBy: null,        // ← Prisma: null für optionale Felder
    freigegebenAm: null,    // ← Prisma: null = aktiv besetzt
    freigegebenVon: null,
    ...overrides,
  };
}

/**
 * Type-Alias für Aggregate Test Double (Value Objects als { value: string })
 */
interface RollenBesetzungAggregateTestDouble {
  id: { value: string };
  einsatzId: { value: string };
  einsatzPersonId: { value: string };
  rolleId: { value: string };
  rollenName: string;
  personVorname: string;
  personNachname: string;
  createdBy: string;
  updatedBy?: string;       // ← Domain: undefined für optionale Felder
  freigegebenAm?: Date;
  freigegebenVon?: string;
}

/**
 * Mock RollenBesetzung Aggregate (für toPersistence Tests)
 *
 * Hinweis: Domain Layer nutzt undefined für optionale Felder (nicht null)
 */
function createMockRollenBesetzungAggregate(
  overrides: Partial<{
    id: string;
    einsatzId: string;
    einsatzPersonId: string;
    rolleId: string;
    rollenName: string;
    personVorname: string;
    personNachname: string;
    createdBy: string;
    updatedBy?: string;
    freigegebenAm?: Date;
    freigegebenVon?: string;
  }> = {}
): RollenBesetzungAggregateTestDouble {
  return {
    id: { value: overrides.id ?? createValidTestId('bestz') },
    einsatzId: { value: overrides.einsatzId ?? createValidTestId('eins1') },
    einsatzPersonId: { value: overrides.einsatzPersonId ?? createValidTestId('pers1') },
    rolleId: { value: overrides.rolleId ?? createValidTestId('rolle') },
    rollenName: overrides.rollenName ?? 'Einsatzleiter',
    personVorname: overrides.personVorname ?? 'Max',
    personNachname: overrides.personNachname ?? 'Mustermann',
    createdBy: overrides.createdBy ?? createValidTestId('user1'),
    updatedBy: overrides.updatedBy,       // ← undefined wenn nicht gesetzt
    freigegebenAm: overrides.freigegebenAm,
    freigegebenVon: overrides.freigegebenVon,
  };
}
```

### Test-Struktur Vorlage

```typescript
import { PrismaRollenBesetzungMapper } from '../prisma-rollen-besetzung.mapper';
import type { Prisma } from '@prisma/client';

describe('PrismaRollenBesetzungMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // toDomain() SUCCESS TESTS (AC1)
  // ============================================================================

  describe('toDomain() - Success Cases', () => {
    it('sollte vollständige Prisma Entity zu Domain Aggregate mappen', () => {
      // Given: Valide Prisma Entity
      const prismaEntity = createMockPrismaRollenBesetzung();

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Success mit korrekten Werten
      expect(result.isSuccess).toBe(true);
      expect(result.value?.id.value).toBe(prismaEntity.id);
      expect(result.value?.einsatzId.value).toBe(prismaEntity.einsatzId);
      expect(result.value?.einsatzPersonId.value).toBe(prismaEntity.personId);
      expect(result.value?.rolleId.value).toBe(prismaEntity.rollenDefinitionId);
    });

    it('sollte Snapshot-Felder korrekt mappen', () => {
      // Given: Prisma Entity mit Snapshot-Daten
      const prismaEntity = createMockPrismaRollenBesetzung({
        rollenName: 'Gruppenführer',
        personVorname: 'Anna',
        personNachname: 'Schmidt',
      });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Snapshot-Felder korrekt übernommen
      expect(result.isSuccess).toBe(true);
      expect(result.value?.rollenName).toBe('Gruppenführer');
      expect(result.value?.personVorname).toBe('Anna');
      expect(result.value?.personNachname).toBe('Schmidt');
    });

    it('sollte Audit-Trail Felder korrekt mappen', () => {
      // Given: Prisma Entity mit Audit-Daten
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const updatedAt = new Date('2024-01-15T12:00:00Z');
      const prismaEntity = createMockPrismaRollenBesetzung({
        createdAt,
        updatedAt,
        createdBy: createValidTestId('user1'),
      });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Audit-Felder korrekt übernommen
      expect(result.isSuccess).toBe(true);
      expect(result.value?.createdAt).toEqual(createdAt);
      expect(result.value?.updatedAt).toEqual(updatedAt);
      expect(result.value?.createdBy).toBe(prismaEntity.createdBy);
    });

    it('sollte updatedBy null → undefined konvertieren', () => {
      // Given: Prisma Entity mit updatedBy = null
      const prismaEntity = createMockPrismaRollenBesetzung({ updatedBy: null });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: updatedBy ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.updatedBy).toBeUndefined();
    });
  });

  // ============================================================================
  // toDomain() FAILURE TESTS (AC2)
  // ============================================================================

  describe('toDomain() - Failure Cases', () => {
    it('sollte Result.fail bei ungültiger id zurückgeben', () => {
      // Given: Prisma Entity mit ungültiger ID
      const prismaEntity = createMockPrismaRollenBesetzung({ id: 'invalid-id' });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Failure mit spezifischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('id:');
    });
  });

  // ============================================================================
  // toPersistence() TESTS (AC3)
  // ============================================================================

  describe('toPersistence()', () => {
    it('sollte Aggregate zu CreateInput mit Relations mappen', () => {
      // Given: Mock Aggregate
      const aggregate = createMockRollenBesetzungAggregate();

      // When: toPersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toPersistence(
        aggregate as unknown as RollenBesetzung
      );

      // Then: CreateInput hat korrekte Relations
      expect(result.einsatz).toEqual({ connect: { id: aggregate.einsatzId.value } });
      expect(result.rollenDefinition).toEqual({ connect: { id: aggregate.rolleId.value } });
      expect(result.person).toEqual({ connect: { id: aggregate.einsatzPersonId.value } });
      expect(result.creator).toEqual({ connect: { id: aggregate.createdBy } });
    });

    it('sollte alle IDs via Value Object .value Getter extrahieren', () => {
      // Given: Mock Aggregate mit bekannten IDs
      const aggregate = createMockRollenBesetzungAggregate({
        id: createValidTestId('myid1'),
        einsatzId: createValidTestId('eins2'),
        einsatzPersonId: createValidTestId('pers2'),
        rolleId: createValidTestId('roll2'),
      });

      // When: toPersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toPersistence(
        aggregate as unknown as RollenBesetzung
      );

      // Then: Alle IDs korrekt extrahiert
      expect(result.id).toBe(aggregate.id.value);
      expect(result.einsatz.connect.id).toBe(aggregate.einsatzId.value);
      expect(result.person.connect.id).toBe(aggregate.einsatzPersonId.value);
      expect(result.rollenDefinition.connect.id).toBe(aggregate.rolleId.value);
    });

    it('sollte Snapshot-Felder korrekt übernehmen', () => {
      // Given: Aggregate mit Snapshot-Daten
      const aggregate = createMockRollenBesetzungAggregate({
        rollenName: 'Zugführer',
        personVorname: 'Peter',
        personNachname: 'Meyer',
      });

      // When: toPersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toPersistence(
        aggregate as unknown as RollenBesetzung
      );

      // Then: Snapshot-Felder exakt übernommen
      expect(result.rollenName).toBe('Zugführer');
      expect(result.personVorname).toBe('Peter');
      expect(result.personNachname).toBe('Meyer');
    });
  });

  // ============================================================================
  // toUpdatePersistence() TESTS (AC4)
  // ============================================================================

  describe('toUpdatePersistence()', () => {
    it('sollte Soft-Delete Felder korrekt setzen', () => {
      // Given: Aggregate mit Freigabe-Daten
      const freigegebenAm = new Date('2024-01-20T15:00:00Z');
      const aggregate = createMockRollenBesetzungAggregate({
        freigegebenAm,
        freigegebenVon: createValidTestId('user2'),
        updatedBy: createValidTestId('user2'),
      });

      // When: toUpdatePersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate as any);

      // Then: Soft-Delete Felder sind gesetzt
      expect(result.freigegebenAm).toEqual(freigegebenAm);
      expect(result.freigegebenVon).toBe(aggregate.freigegebenVon);
      expect(result.updater).toEqual({ connect: { id: aggregate.updatedBy } });
    });

    it('sollte updater Relation NICHT setzen wenn updatedBy undefined', () => {
      // Given: Aggregate ohne updatedBy
      const aggregate = createMockRollenBesetzungAggregate({
        updatedBy: undefined,
      });

      // When: toUpdatePersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate as any);

      // Then: updater ist NICHT im Result
      expect(result.updater).toBeUndefined();
    });
  });
});
```

### Erwartete Test-Anzahl

| Kategorie | Tests | Beschreibung |
|-----------|-------|--------------|
| toDomain() Success | 7 | Vollständig, Snapshots, Audit-Trail, 3x NULL→undefined, DateTime |
| toDomain() Failure | 4 | 4x ungültige CUID2 IDs |
| toPersistence() | 4 | Relations, ID-Getter, Snapshots, Creator |
| toUpdatePersistence() | 4 | Soft-Delete, undefined→null, updater conditional |
| **Gesamt** | **~19 Tests** |

### Project Structure Notes

- **Test-Datei:** `packages/backend/src/infrastructure/kraefte/mappers/__tests__/prisma-rollen-besetzung.mapper.spec.ts`
- **Pattern-Referenz:** `prisma-einsatz-person.mapper.spec.ts` im selben `__tests__/` Ordner
- **Import-Pfad:** `import { PrismaRollenBesetzungMapper } from '../prisma-rollen-besetzung.mapper';`

### References

- [Source: packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts] - Mapper Implementierung
- [Source: packages/backend/src/infrastructure/kraefte/mappers/__tests__/prisma-einsatz-person.mapper.spec.ts] - Referenz-Tests
- [Source: packages/backend/src/domain/kraefte/aggregates/rollen-besetzung.aggregate.ts] - Domain Aggregate
- [Source: CLAUDE.md#AC6] - Test-Pattern Compliance

## Dev Agent Record

### Context Reference

Subagent-Analysen durchgeführt:
- Mapper-Code Analyse (agentId: a2d9aa8)
- Referenz-Tests Analyse (agentId: a159018)
- TD1 Story Format Analyse (agentId: a4e1fe0)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Validation Notes

Story erstellt im YOLO-Modus basierend auf:
- Existierender Mapper-Implementierung
- Referenz-Tests aus demselben Modul
- TD1 Story Format aus bisherigen Tech Debt Stories

**Validiert:** 2025-12-28 via 5-fach Subagent-Analyse:
- Mapper-Code Analyse (toDomain, toPersistence, toUpdatePersistence)
- Referenz-Tests Analyse (prisma-einsatz-person.mapper.spec.ts)
- Domain Aggregate Analyse (RollenBesetzung Properties, Factory-Methoden)
- Prisma Schema Analyse (EinsatzRollenbesetzung Model, Relations)
- CLAUDE.md AC6 Compliance (AAA Pattern, jest.clearAllMocks)

**Verbesserungen angewandt (6):**
1. AC1 erweitert: +2 Tests (Snapshot-Felder, Audit-Trail)
2. AC3 erweitert: +1 Test (Value Object ID Getter)
3. Mock-Factory Type-Safety verbessert (Type-Aliases statt `as any`)
4. Test-Anzahl aktualisiert: 16 → 19 Tests
5. Prisma Auto-Managed Felder dokumentiert
6. Test-Struktur Vorlage erweitert

### Completion Notes List

**Implementiert am:** 2025-12-28

**Test-Ergebnis:** 25 Tests PASSED ✅

**Implementierte Tests:**
- toDomain() Basic Mapping: 4 Tests
- toDomain() Optional Fields: 4 Tests
- toDomain() ID Validation: 4 Tests
- toPersistence() Basic: 3 Tests
- toUpdatePersistence() Freigabe: 4 Tests
- Round-Trip Tests: 3 Tests
- Edge Cases: 3 Tests

**Besonderheiten:**
- Tests verwenden echte Domain Aggregate Rekonstruktion (nicht nur Mocks)
- CUID2-validierte Test-IDs über `createValidTestId()` Helper
- Vollständige NULL↔undefined Konvertierung getestet
- Round-Trip Tests für Datenintegrität

### File List

**Neue Dateien:**
- `packages/backend/src/infrastructure/kraefte/mappers/__tests__/prisma-rollen-besetzung.mapper.spec.ts`
