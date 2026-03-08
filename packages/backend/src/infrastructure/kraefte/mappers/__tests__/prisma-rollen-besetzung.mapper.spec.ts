// @ts-nocheck
/**
 * Unit Tests für PrismaRollenBesetzungMapper (Infrastructure Layer).
 *
 * Diese Tests validieren die bidirektionale Transformation zwischen:
 * - Domain Layer: RollenBesetzung Aggregate
 * - Infrastructure Layer: Prisma EinsatzRollenbesetzung Entity
 *
 * **Test Coverage (TD1 - Mapper Tests):**
 * - toDomain: Basic Mapping (alle Required Fields)
 * - toDomain: null → undefined Conversion (optionale Felder)
 * - toDomain: ID Validation Failure
 * - toPersistence: Basic Mapping mit Relations
 * - toUpdatePersistence: Freigabe Mapping
 * - toUpdatePersistence: ohne Freigabe (alle null)
 * - Round-Trip Tests
 * - Edge Cases: Invalid CUID2 IDs
 *
 * **WICHTIG: NULL ↔ undefined Konvertierung!**
 * - Prisma gibt `null` für optionale Felder zurück (DB NULL)
 * - Domain Layer verwendet `undefined` (TypeScript Konvention)
 * - ALLE optionalen Felder müssen explizit konvertiert werden
 *
 * **Snapshot Pattern:**
 * Die Felder rollenName, personVorname, personNachname werden bei Erstellung
 * KOPIERT und bleiben historisch korrekt auch wenn sich die Quelldaten ändern.
 */

import { PrismaRollenBesetzungMapper } from '../prisma-rollen-besetzung.mapper';
import type { Prisma } from '@/generated/prisma/client';
import { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Erstellt eine valide CUID2-Format Test-ID.
 * Format: 20-30 Zeichen, lowercase a-z0-9, beginnt mit Kleinbuchstabe.
 */
function createValidTestId(suffix = ''): string {
  const base = 'clw3h8x9y0000qwertyui'; // 20 chars
  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(5, '0')
    .slice(0, 5);
  return base + safeSuffix; // Total: 25 chars
}

/**
 * Erstellt Mock Prisma EinsatzRollenbesetzung Entity.
 *
 * @param overrides - Optionale Überschreibungen für einzelne Felder
 * @returns Vollständiges Prisma Entity für Tests
 */
function createMockPrismaRollenBesetzung(overrides: Partial<Prisma.EinsatzRollenbesetzungGetPayload<object>> = {}): Prisma.EinsatzRollenbesetzungGetPayload<object> {
  return {
    id: createValidTestId('rb001'),
    einsatzId: createValidTestId('ein01'),
    personId: createValidTestId('per01'),
    rollenDefinitionId: createValidTestId('rol01'),
    rollenName: 'Einsatzleiter',
    personVorname: 'Max',
    personNachname: 'Mustermann',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    createdBy: createValidTestId('usr01'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    updatedBy: null,
    freigegebenAm: null,
    freigegebenVon: null,
    ...overrides,
  };
}

/**
 * Erstellt ein rekonstituiertes RollenBesetzung Domain Aggregate für Tests.
 *
 * @param overrides - Optionale Überschreibungen für einzelne Felder
 * @returns RollenBesetzung Aggregate oder wirft Error bei Fehlschlag
 */
function createMockDomainAggregate(
  overrides: {
    id?: string;
    einsatzId?: string;
    einsatzPersonId?: string;
    rolleId?: string;
    rollenName?: string;
    personVorname?: string;
    personNachname?: string;
    createdAt?: Date;
    createdBy?: string;
    updatedAt?: Date;
    updatedBy?: string;
    freigegebenAm?: Date;
    freigegebenVon?: string;
  } = {},
): RollenBesetzung {
  const idResult = RollenBesetzungId.create(overrides.id ?? createValidTestId('rb001'));
  const einsatzIdResult = EinsatzId.create(overrides.einsatzId ?? createValidTestId('ein01'));
  const personIdResult = EinsatzPersonId.create(overrides.einsatzPersonId ?? createValidTestId('per01'));
  const rolleIdResult = RolleId.create(overrides.rolleId ?? createValidTestId('rol01'));

  if (idResult.isFailure || einsatzIdResult.isFailure || personIdResult.isFailure || rolleIdResult.isFailure) {
    throw new Error('Failed to create test Value Objects');
  }

  const result = RollenBesetzung.reconstitute({
    id: idResult.value!,
    einsatzId: einsatzIdResult.value!,
    einsatzPersonId: personIdResult.value!,
    rolleId: rolleIdResult.value!,
    rollenName: overrides.rollenName ?? 'Einsatzleiter',
    personVorname: overrides.personVorname ?? 'Max',
    personNachname: overrides.personNachname ?? 'Mustermann',
    createdAt: overrides.createdAt ?? new Date('2024-01-15T10:00:00Z'),
    createdBy: overrides.createdBy ?? createValidTestId('usr01'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-15T10:00:00Z'),
    updatedBy: overrides.updatedBy,
    freigegebenAm: overrides.freigegebenAm,
    freigegebenVon: overrides.freigegebenVon,
  });

  if (result.isFailure || !result.value) {
    throw new Error(`Failed to create test aggregate: ${result.error}`);
  }

  return result.value;
}

// ============================================================================
// PRISMA ROLLEN BESETZUNG MAPPER TESTS
// ============================================================================

describe('PrismaRollenBesetzungMapper', () => {
  beforeEach(() => {
    // Given: Reset all mocks
    jest.clearAllMocks();
  });

  // ============================================================================
  // toDomain() TESTS
  // ============================================================================

  describe('toDomain() - Basic Mapping', () => {
    it('sollte alle required Felder korrekt mappen', () => {
      // Given: Prisma EinsatzRollenbesetzung mit allen Feldern
      const prismaEntity = createMockPrismaRollenBesetzung();

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Success mit korrekt gemappten Feldern
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const aggregate = result.value!;
      expect(aggregate.id.value).toBe(prismaEntity.id);
      expect(aggregate.einsatzId.value).toBe(prismaEntity.einsatzId);
      expect(aggregate.einsatzPersonId.value).toBe(prismaEntity.personId);
      expect(aggregate.rolleId.value).toBe(prismaEntity.rollenDefinitionId);
      expect(aggregate.rollenName).toBe(prismaEntity.rollenName);
      expect(aggregate.personVorname).toBe(prismaEntity.personVorname);
      expect(aggregate.personNachname).toBe(prismaEntity.personNachname);
      expect(aggregate.createdBy).toBe(prismaEntity.createdBy);
      expect(aggregate.createdAt).toEqual(prismaEntity.createdAt);
      expect(aggregate.updatedAt).toEqual(prismaEntity.updatedAt);
    });

    it('sollte Snapshot-Felder korrekt mappen (AC3: Historische Korrektheit)', () => {
      // Given: Prisma Entity mit spezifischen Snapshot-Werten
      const prismaEntity = createMockPrismaRollenBesetzung({
        rollenName: 'Zugführer',
        personVorname: 'Anna',
        personNachname: 'Schmidt',
      });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Snapshot-Felder sind korrekt übernommen
      expect(result.isSuccess).toBe(true);
      expect(result.value?.rollenName).toBe('Zugführer');
      expect(result.value?.personVorname).toBe('Anna');
      expect(result.value?.personNachname).toBe('Schmidt');
    });

    it('sollte isActive = true für aktive Besetzung (freigegebenAm = null)', () => {
      // Given: Prisma Entity ohne Freigabe
      const prismaEntity = createMockPrismaRollenBesetzung({
        freigegebenAm: null,
        freigegebenVon: null,
      });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: isActive ist true
      expect(result.isSuccess).toBe(true);
      expect(result.value?.isActive).toBe(true);
    });

    it('sollte isActive = false für freigegebene Besetzung', () => {
      // Given: Prisma Entity mit Freigabe (Soft-Delete)
      const freigegebenAm = new Date('2024-01-20T15:30:00Z');
      const freigegebenVon = createValidTestId('usr02');
      const prismaEntity = createMockPrismaRollenBesetzung({
        freigegebenAm,
        freigegebenVon,
      });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: isActive ist false, Freigabe-Daten sind korrekt
      expect(result.isSuccess).toBe(true);
      expect(result.value?.isActive).toBe(false);
      expect(result.value?.freigegebenAm).toEqual(freigegebenAm);
      expect(result.value?.freigegebenVon).toBe(freigegebenVon);
    });
  });

  describe('toDomain() - Optional Fields undefined Conversion', () => {
    it('sollte updatedBy null → undefined konvertieren', () => {
      // Given: Prisma Entity mit updatedBy = null
      const prismaEntity = createMockPrismaRollenBesetzung({ updatedBy: null });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: updatedBy ist undefined (nicht null)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.updatedBy).toBeUndefined();
    });

    it('sollte freigegebenAm null → undefined konvertieren', () => {
      // Given: Prisma Entity mit freigegebenAm = null (aktive Besetzung)
      const prismaEntity = createMockPrismaRollenBesetzung({ freigegebenAm: null });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: freigegebenAm ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.freigegebenAm).toBeUndefined();
    });

    it('sollte freigegebenVon null → undefined konvertieren', () => {
      // Given: Prisma Entity mit freigegebenVon = null
      const prismaEntity = createMockPrismaRollenBesetzung({ freigegebenVon: null });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: freigegebenVon ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.freigegebenVon).toBeUndefined();
    });

    it('sollte updatedBy string korrekt beibehalten', () => {
      // Given: Prisma Entity mit updatedBy = valide User ID
      const updatedBy = createValidTestId('usr02');
      const prismaEntity = createMockPrismaRollenBesetzung({ updatedBy });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: updatedBy ist korrekt gemappt
      expect(result.isSuccess).toBe(true);
      expect(result.value?.updatedBy).toBe(updatedBy);
    });
  });

  describe('toDomain() - ID Validation Failure', () => {
    it('sollte Result.fail bei ungültiger id zurückgeben', () => {
      // Given: Prisma Entity mit ungültiger ID (nicht CUID2 Format)
      const prismaEntity = createMockPrismaRollenBesetzung({ id: 'invalid-id!' });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Failure mit spezifischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('id:');
    });

    it('sollte Result.fail bei ungültiger einsatzId zurückgeben', () => {
      // Given: Prisma Entity mit ungültiger einsatzId
      const prismaEntity = createMockPrismaRollenBesetzung({ einsatzId: '123' });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Failure mit spezifischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId:');
    });

    it('sollte Result.fail bei ungültiger personId zurückgeben', () => {
      // Given: Prisma Entity mit ungültiger personId
      const prismaEntity = createMockPrismaRollenBesetzung({ personId: 'ABC' });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Failure mit spezifischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('personId:');
    });

    it('sollte Result.fail bei ungültiger rollenDefinitionId zurückgeben', () => {
      // Given: Prisma Entity mit ungültiger rollenDefinitionId
      const prismaEntity = createMockPrismaRollenBesetzung({ rollenDefinitionId: 'INVALID' });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Result ist Failure mit spezifischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('rolleId:');
    });
  });

  // ============================================================================
  // toPersistence() TESTS
  // ============================================================================

  describe('toPersistence() - Basic Mapping', () => {
    it('sollte alle Felder zu Prisma CreateInput korrekt mappen', () => {
      // Given: Domain Aggregate
      const aggregate = createMockDomainAggregate();

      // When: toPersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toPersistence(aggregate);

      // Then: CreateInput enthält alle Felder mit korrekten Relations
      expect(result.id).toBe(aggregate.id.value);
      expect(result.einsatz).toEqual({ connect: { id: aggregate.einsatzId.value } });
      expect(result.rollenDefinition).toEqual({ connect: { id: aggregate.rolleId.value } });
      expect(result.person).toEqual({ connect: { id: aggregate.einsatzPersonId.value } });
      expect(result.rollenName).toBe(aggregate.rollenName);
      expect(result.personVorname).toBe(aggregate.personVorname);
      expect(result.personNachname).toBe(aggregate.personNachname);
      expect(result.creator).toEqual({ connect: { id: aggregate.createdBy } });
    });

    it('sollte Snapshot-Felder korrekt in Persistence mappen', () => {
      // Given: Domain Aggregate mit spezifischen Snapshot-Werten
      const aggregate = createMockDomainAggregate({
        rollenName: 'Abschnittsleiter',
        personVorname: 'Klaus',
        personNachname: 'Müller',
      });

      // When: toPersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toPersistence(aggregate);

      // Then: Snapshot-Felder sind korrekt
      expect(result.rollenName).toBe('Abschnittsleiter');
      expect(result.personVorname).toBe('Klaus');
      expect(result.personNachname).toBe('Müller');
    });

    it('sollte creator Relation korrekt setzen', () => {
      // Given: Domain Aggregate mit createdBy
      const createdBy = createValidTestId('usr99');
      const aggregate = createMockDomainAggregate({ createdBy });

      // When: toPersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toPersistence(aggregate);

      // Then: creator Relation ist korrekt gesetzt
      expect(result.creator).toEqual({ connect: { id: createdBy } });
    });
  });

  // ============================================================================
  // toUpdatePersistence() TESTS
  // ============================================================================

  describe('toUpdatePersistence() - Freigabe Mapping', () => {
    it('sollte Freigabe-Felder korrekt mappen wenn Aggregate freigegeben', () => {
      // Given: Domain Aggregate das freigegeben wurde
      const freigegebenAm = new Date('2024-01-20T16:00:00Z');
      const freigegebenVon = createValidTestId('usr03');
      const aggregate = createMockDomainAggregate({
        freigegebenAm,
        freigegebenVon,
      });

      // When: toUpdatePersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate);

      // Then: Freigabe-Felder sind korrekt gesetzt
      expect(result.freigegebenAm).toEqual(freigegebenAm);
      expect(result.freigegebenVon).toBe(freigegebenVon);
    });

    it('sollte Freigabe-Felder als null mappen wenn nicht freigegeben', () => {
      // Given: Domain Aggregate ohne Freigabe (aktiv)
      const aggregate = createMockDomainAggregate({
        freigegebenAm: undefined,
        freigegebenVon: undefined,
      });

      // When: toUpdatePersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate);

      // Then: Freigabe-Felder sind null
      expect(result.freigegebenAm).toBeNull();
      expect(result.freigegebenVon).toBeNull();
    });

    it('sollte updater Relation setzen wenn updatedBy vorhanden', () => {
      // Given: Domain Aggregate mit updatedBy
      const updatedBy = createValidTestId('usr04');
      const aggregate = createMockDomainAggregate({ updatedBy });

      // When: toUpdatePersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate);

      // Then: updater Relation ist gesetzt
      expect(result.updater).toEqual({ connect: { id: updatedBy } });
    });

    it('sollte updater Relation NICHT setzen wenn updatedBy undefined', () => {
      // Given: Domain Aggregate ohne updatedBy
      const aggregate = createMockDomainAggregate({ updatedBy: undefined });

      // When: toUpdatePersistence() aufgerufen
      const result = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate);

      // Then: updater ist nicht im Result (conditional spread)
      expect(result.updater).toBeUndefined();
    });
  });

  // ============================================================================
  // ROUND-TRIP TESTS
  // ============================================================================

  describe('Round-Trip Tests', () => {
    it('sollte Aggregate Daten bei Round-Trip erhalten (Prisma → Domain → Prisma)', () => {
      // Given: Original Prisma Entity
      const originalPrismaEntity = createMockPrismaRollenBesetzung({
        rollenName: 'Gruppenführer',
        personVorname: 'Lisa',
        personNachname: 'Weber',
      });

      // When: Prisma → Domain
      const domainResult = PrismaRollenBesetzungMapper.toDomain(originalPrismaEntity);
      expect(domainResult.isSuccess).toBe(true);
      const aggregate = domainResult.value!;

      // When: Domain → Prisma (CreateInput)
      const persistenceResult = PrismaRollenBesetzungMapper.toPersistence(aggregate);

      // Then: Alle Felder sind erhalten geblieben
      expect(persistenceResult.id).toBe(originalPrismaEntity.id);
      expect(persistenceResult.rollenName).toBe(originalPrismaEntity.rollenName);
      expect(persistenceResult.personVorname).toBe(originalPrismaEntity.personVorname);
      expect(persistenceResult.personNachname).toBe(originalPrismaEntity.personNachname);
    });

    it('sollte Domain Events bei Rekonstruktion nicht emittieren', () => {
      // Given: Prisma Entity
      const prismaEntity = createMockPrismaRollenBesetzung();

      // When: toDomain() aufgerufen (Rekonstruktion)
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Keine Domain Events (reconstitute emittiert nicht)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.getDomainEvents()).toHaveLength(0);
    });

    it('sollte Freigabe-Daten bei Round-Trip erhalten', () => {
      // Given: Prisma Entity mit Freigabe
      const freigegebenAm = new Date('2024-02-01T12:00:00Z');
      const freigegebenVon = createValidTestId('usr05');
      const originalPrismaEntity = createMockPrismaRollenBesetzung({
        freigegebenAm,
        freigegebenVon,
      });

      // When: Prisma → Domain → Prisma (UpdateInput)
      const domainResult = PrismaRollenBesetzungMapper.toDomain(originalPrismaEntity);
      expect(domainResult.isSuccess).toBe(true);
      const aggregate = domainResult.value!;
      const updateResult = PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate);

      // Then: Freigabe-Daten sind erhalten
      expect(updateResult.freigegebenAm).toEqual(freigegebenAm);
      expect(updateResult.freigegebenVon).toBe(freigegebenVon);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('sollte leeren String als rollenName akzeptieren', () => {
      // Given: Prisma Entity mit leerem rollenName (sollte eigentlich nicht vorkommen)
      const prismaEntity = createMockPrismaRollenBesetzung({ rollenName: '' });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Mapping funktioniert (Validierung ist Aggregate-Verantwortung)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.rollenName).toBe('');
    });

    it('sollte Timestamps korrekt als Date-Objekte mappen', () => {
      // Given: Prisma Entity mit spezifischen Timestamps
      const createdAt = new Date('2024-03-15T08:30:00.000Z');
      const updatedAt = new Date('2024-03-15T09:45:00.000Z');
      const prismaEntity = createMockPrismaRollenBesetzung({ createdAt, updatedAt });

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Timestamps sind Date-Objekte mit korrekten Werten
      expect(result.isSuccess).toBe(true);
      expect(result.value?.createdAt).toBeInstanceOf(Date);
      expect(result.value?.updatedAt).toBeInstanceOf(Date);
      expect(result.value?.createdAt.toISOString()).toBe('2024-03-15T08:30:00.000Z');
      expect(result.value?.updatedAt.toISOString()).toBe('2024-03-15T09:45:00.000Z');
    });

    it('sollte alle 4 Value Objects korrekt typisiert zurückgeben', () => {
      // Given: Valides Prisma Entity
      const prismaEntity = createMockPrismaRollenBesetzung();

      // When: toDomain() aufgerufen
      const result = PrismaRollenBesetzungMapper.toDomain(prismaEntity);

      // Then: Alle IDs sind korrekt typisierte Value Objects
      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;

      // Type-safe: value property existiert auf allen ID Value Objects
      expect(typeof aggregate.id.value).toBe('string');
      expect(typeof aggregate.einsatzId.value).toBe('string');
      expect(typeof aggregate.einsatzPersonId.value).toBe('string');
      expect(typeof aggregate.rolleId.value).toBe('string');
    });
  });
});
