// @ts-nocheck
/**
 * Unit Tests für PrismaEinsatzPersonMapper (Infrastructure Layer).
 *
 * Diese Tests validieren die bidirektionale Transformation zwischen:
 * - Domain Layer: EinsatzPerson Aggregate
 * - Infrastructure Layer: Prisma EinsatzPerson Entity
 *
 * **Test Coverage (HIGH Priority I3 - fahrzeugId Mapping):**
 * - toPersistence: undefined → null
 * - toPersistence: "cuid123" → "cuid123"
 * - toDomain: null → undefined
 * - toDomain: "cuid123" → "cuid123"
 *
 * **WICHTIG: NULL ↔ undefined Konvertierung!**
 * - Prisma gibt `null` für optionale Felder zurück (DB NULL)
 * - Domain Layer verwendet `undefined` (TypeScript Konvention)
 * - ALLE optionalen Felder müssen explizit konvertiert werden
 */

import { PrismaEinsatzPersonMapper, type PrismaEinsatzPersonWithRelations } from '../prisma-einsatz-person.mapper';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Erstellt Mock Prisma EinsatzPerson Entity.
 */
function createMockPrismaEinsatzPerson(overrides: Partial<PrismaEinsatzPersonWithRelations> = {}): PrismaEinsatzPersonWithRelations {
  return {
    id: 'clw3h8x9y0000qwertyui00001',
    einsatzId: 'clw3h8x9y0000qwertyui00002',
    stammId: 'clw3h8x9y0000qwertyui00003',
    vorname: 'Max',
    nachname: 'Mustermann',
    funktion: 'Gruppenführer',
    funkrufname: 'Florian Berlin GF',
    fahrzeugId: null,
    position: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdBy: 'clw3h8x9y0000qwertyui00099',
    updatedBy: null,
    qualifikationen: [],
    ...overrides,
  };
}

/**
 * Erstellt Mock EinsatzPerson Aggregate Props.
 */
function createMockAggregateProps(overrides?: { fahrzeugId?: string; stammId?: string; funkrufname?: string; position?: { lat: number; lng: number }; updatedBy?: string }): {
  id: string;
  einsatzId: string;
  stammId?: string;
  vorname: string;
  nachname: string;
  funktion: string;
  funkrufname?: string;
  fahrzeugId?: string;
  qualifikationIds: string[];
  position?: { lat: number; lng: number };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
} {
  return {
    id: 'clw3h8x9y0000qwertyui00001',
    einsatzId: 'clw3h8x9y0000qwertyui00002',
    stammId: overrides?.stammId ?? 'clw3h8x9y0000qwertyui00003',
    vorname: 'Max',
    nachname: 'Mustermann',
    funktion: 'Gruppenführer',
    funkrufname: overrides?.funkrufname ?? 'Florian Berlin GF',
    fahrzeugId: overrides?.fahrzeugId,
    qualifikationIds: [],
    position: overrides?.position,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdBy: 'clw3h8x9y0000qwertyui00099',
    updatedBy: overrides?.updatedBy,
  };
}

// ============================================================================
// PRISMA EINSATZ PERSON MAPPER TESTS
// ============================================================================

describe('PrismaEinsatzPersonMapper', () => {
  beforeEach(() => {
    // Given: Reset all mocks
    jest.clearAllMocks();
  });

  // ============================================================================
  // I3: MAPPER fahrzeugId TESTS (4 Tests)
  // ============================================================================

  describe('[I3] toPersistence() - fahrzeugId Mapping', () => {
    it('sollte fahrzeugId undefined → null konvertieren', () => {
      // Given: Mock EinsatzPerson Aggregate mit fahrzeugId = undefined
      const aggregateProps = createMockAggregateProps({ fahrzeugId: undefined });

      // Mock EinsatzPerson.reconstitute Result
      const mockAggregate = {
        id: { value: aggregateProps.id },
        einsatzId: aggregateProps.einsatzId,
        stammId: aggregateProps.stammId,
        vorname: aggregateProps.vorname,
        nachname: aggregateProps.nachname,
        funktion: aggregateProps.funktion,
        funkrufname: aggregateProps.funkrufname,
        fahrzeugId: undefined, // WICHTIG: undefined im Domain Layer
        qualifikationIds: [],
        position: undefined,
        createdBy: aggregateProps.createdBy,
        updatedBy: undefined,
      };

      // When: toPersistence() aufgerufen
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      const result = PrismaEinsatzPersonMapper.toPersistence(mockAggregate as any);

      // Then: fahrzeugId ist null (DB NULL)
      expect(result.fahrzeugId).toBeNull();
    });

    it('sollte fahrzeugId "cuid123" → "cuid123" beibehalten', () => {
      // Given: Mock EinsatzPerson Aggregate mit fahrzeugId = "cuid123"
      const testFahrzeugId = 'clw3h8x9y0000qwertyui00999';
      const aggregateProps = createMockAggregateProps({ fahrzeugId: testFahrzeugId });

      const mockAggregate = {
        id: { value: aggregateProps.id },
        einsatzId: aggregateProps.einsatzId,
        stammId: aggregateProps.stammId,
        vorname: aggregateProps.vorname,
        nachname: aggregateProps.nachname,
        funktion: aggregateProps.funktion,
        funkrufname: aggregateProps.funkrufname,
        fahrzeugId: testFahrzeugId, // WICHTIG: string im Domain Layer
        qualifikationIds: [],
        position: undefined,
        createdBy: aggregateProps.createdBy,
        updatedBy: undefined,
      };

      // When: toPersistence() aufgerufen
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      const result = PrismaEinsatzPersonMapper.toPersistence(mockAggregate as any);

      // Then: fahrzeugId bleibt "cuid123"
      expect(result.fahrzeugId).toBe(testFahrzeugId);
    });
  });

  describe('[I3] toDomain() - fahrzeugId Mapping', () => {
    it('sollte fahrzeugId null → undefined konvertieren', () => {
      // Given: Prisma EinsatzPerson mit fahrzeugId = null
      const prismaEntity = createMockPrismaEinsatzPerson({ fahrzeugId: null });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: Result ist Success und fahrzeugId ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fahrzeugId).toBeUndefined();
    });

    it('sollte fahrzeugId "cuid123" → "cuid123" beibehalten', () => {
      // Given: Prisma EinsatzPerson mit fahrzeugId = "cuid123"
      const testFahrzeugId = 'clw3h8x9y0000qwertyui00999';
      const prismaEntity = createMockPrismaEinsatzPerson({ fahrzeugId: testFahrzeugId });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: Result ist Success und fahrzeugId bleibt "cuid123"
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fahrzeugId).toBe(testFahrzeugId);
    });
  });

  // ============================================================================
  // ADDITIONAL MAPPER TESTS (Other Optional Fields)
  // ============================================================================

  describe('toPersistence() - Optional Fields NULL Conversion', () => {
    it('sollte stammId undefined → null konvertieren', () => {
      // Given: Mock Aggregate mit stammId = undefined
      const mockAggregate = {
        id: { value: 'clw3h8x9y0000qwertyui00001' },
        einsatzId: 'clw3h8x9y0000qwertyui00002',
        stammId: undefined,
        vorname: 'Anna',
        nachname: 'Temporär',
        funktion: 'Angriffstrupp',
        funkrufname: undefined,
        fahrzeugId: undefined,
        qualifikationIds: [],
        position: undefined,
        createdBy: 'clw3h8x9y0000qwertyui00099',
        updatedBy: undefined,
      };

      // When: toPersistence() aufgerufen
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      const result = PrismaEinsatzPersonMapper.toPersistence(mockAggregate as any);

      // Then: stammId ist null
      expect(result.stammId).toBeNull();
    });

    it('sollte funkrufname undefined → null konvertieren', () => {
      // Given: Mock Aggregate mit funkrufname = undefined
      const mockAggregate = {
        id: { value: 'clw3h8x9y0000qwertyui00001' },
        einsatzId: 'clw3h8x9y0000qwertyui00002',
        stammId: 'clw3h8x9y0000qwertyui00003',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Melder',
        funkrufname: undefined,
        fahrzeugId: undefined,
        qualifikationIds: [],
        position: undefined,
        createdBy: 'clw3h8x9y0000qwertyui00099',
        updatedBy: undefined,
      };

      // When: toPersistence() aufgerufen
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      const result = PrismaEinsatzPersonMapper.toPersistence(mockAggregate as any);

      // Then: funkrufname ist null
      expect(result.funkrufname).toBeNull();
    });

    it('sollte updatedBy undefined → null konvertieren', () => {
      // Given: Mock Aggregate mit updatedBy = undefined
      const mockAggregate = {
        id: { value: 'clw3h8x9y0000qwertyui00001' },
        einsatzId: 'clw3h8x9y0000qwertyui00002',
        stammId: 'clw3h8x9y0000qwertyui00003',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Gruppenführer',
        funkrufname: 'Florian Berlin GF',
        fahrzeugId: undefined,
        qualifikationIds: [],
        position: undefined,
        createdBy: 'clw3h8x9y0000qwertyui00099',
        updatedBy: undefined,
      };

      // When: toPersistence() aufgerufen
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      const result = PrismaEinsatzPersonMapper.toPersistence(mockAggregate as any);

      // Then: updatedBy ist null
      expect(result.updatedBy).toBeNull();
    });
  });

  describe('toDomain() - Optional Fields undefined Conversion', () => {
    it('sollte stammId null → undefined konvertieren', () => {
      // Given: Prisma Entity mit stammId = null (temporäre Person)
      const prismaEntity = createMockPrismaEinsatzPerson({ stammId: null });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: stammId ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.stammId).toBeUndefined();
    });

    it('sollte funkrufname null → undefined konvertieren', () => {
      // Given: Prisma Entity mit funkrufname = null
      const prismaEntity = createMockPrismaEinsatzPerson({ funkrufname: null });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: funkrufname ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.funkrufname).toBeUndefined();
    });

    it('sollte updatedBy null → undefined konvertieren', () => {
      // Given: Prisma Entity mit updatedBy = null
      const prismaEntity = createMockPrismaEinsatzPerson({ updatedBy: null });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: updatedBy ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.updatedBy).toBeUndefined();
    });
  });

  describe('toPersistence() - Required Fields', () => {
    it('sollte alle required Felder korrekt mappen', () => {
      // Given: Mock Aggregate mit allen required Feldern
      const aggregateProps = createMockAggregateProps();
      const mockAggregate = {
        id: { value: aggregateProps.id },
        einsatzId: aggregateProps.einsatzId,
        stammId: aggregateProps.stammId,
        vorname: aggregateProps.vorname,
        nachname: aggregateProps.nachname,
        funktion: aggregateProps.funktion,
        funkrufname: aggregateProps.funkrufname,
        fahrzeugId: undefined,
        qualifikationIds: [],
        position: undefined,
        createdBy: aggregateProps.createdBy,
        updatedBy: undefined,
      };

      // When: toPersistence() aufgerufen
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      const result = PrismaEinsatzPersonMapper.toPersistence(mockAggregate as any);

      // Then: Required Felder sind korrekt
      expect(result.id).toBe(aggregateProps.id);
      expect(result.einsatzId).toBe(aggregateProps.einsatzId);
      expect(result.vorname).toBe(aggregateProps.vorname);
      expect(result.nachname).toBe(aggregateProps.nachname);
      expect(result.funktion).toBe(aggregateProps.funktion);
      expect(result.createdBy).toBe(aggregateProps.createdBy);
    });
  });

  describe('toDomain() - Qualifikationen Mapping', () => {
    it('sollte qualifikationen Array korrekt zu qualifikationIds mappen', () => {
      // Given: Prisma Entity mit qualifikationen Junction Table Records
      const prismaEntity = createMockPrismaEinsatzPerson({
        qualifikationen: [{ qualifikationId: 'qual_001' }, { qualifikationId: 'qual_002' }, { qualifikationId: 'qual_003' }],
      });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: qualifikationIds Array ist korrekt extrahiert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationIds).toEqual(['qual_001', 'qual_002', 'qual_003']);
    });

    it('sollte leeres Array zurückgeben wenn qualifikationen undefined', () => {
      // Given: Prisma Entity ohne qualifikationen (undefined)
      const prismaEntity = createMockPrismaEinsatzPerson({
        qualifikationen: undefined,
      });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: qualifikationIds ist leeres Array
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationIds).toEqual([]);
    });
  });

  describe('toDomain() - Position JSONB Deserialization', () => {
    it('sollte Position JSONB korrekt zu GeoPosition Props konvertieren', () => {
      // Given: Prisma Entity mit Position JSONB
      const positionJson = { lat: 52.52, lng: 13.405 };
      const prismaEntity = createMockPrismaEinsatzPerson({
        // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
        position: positionJson as any,
      });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: Position ist korrekt deserialisiert (GeoPosition Value Object)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toBeDefined();
      // GeoPosition ist ein Value Object, prüfe die props
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      expect((result.value?.position as any)?.props?.lat).toBe(52.52);
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      expect((result.value?.position as any)?.props?.lng).toBe(13.405);
    });

    it('sollte undefined zurückgeben wenn position null', () => {
      // Given: Prisma Entity mit position = null
      const prismaEntity = createMockPrismaEinsatzPerson({ position: null });

      // When: toDomain() aufgerufen
      const result = PrismaEinsatzPersonMapper.toDomain(prismaEntity);

      // Then: position ist undefined
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toBeUndefined();
    });
  });
});
