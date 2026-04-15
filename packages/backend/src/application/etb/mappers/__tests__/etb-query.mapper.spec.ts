// @ts-nocheck
// Mock CUID2 für deterministische Tests
// WICHTIG: Muss VOR allen Imports stehen, da Jest Hoisting verwendet
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

import { EtbQueryMapper } from '../etb-query.mapper';
import { createTestEtb, createTestEintrag, createTestSnapshot, createTestUserId, resetTestIdCounter } from '@domain/aggregates/__tests__/fixtures/etb.fixtures';

/**
 * Unit Tests fuer den EtbQueryMapper.
 *
 * Dieser Mapper transformiert Domain-Objekte (EinsatztagebuchAggregate, EtbEintrag, EtbSnapshot)
 * in DTOs fuer die API-Schicht. Die Tests validieren die korrekte Transformation
 * und das Filterverhalten fuer soft-deleted Eintraege.
 */

/**
 * Generiert eine Test-CUID mit korrektem Format.
 * Format: 25 Zeichen, beginnt mit 'c', nur lowercase a-z und 0-9.
 */
function generateTestCuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'c';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

describe('EtbQueryMapper', () => {
  beforeEach(() => {
    resetTestIdCounter();
  });

  // ============================================================================
  // toEtbDto Tests
  // ============================================================================

  describe('toEtbDto', () => {
    it('sollte ein Aggregate zu EtbDto mit allen Eigenschaften mappen', () => {
      // Arrange - explizite CUIDs fuer deterministische Tests
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 2,
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb);

      // Assert
      expect(dto.id).toBe(etb.id.value);
      expect(dto.einsatzId).toBe(etb.einsatzId.value);
      expect(dto.status).toBe(etb.status.value);
      expect(dto.eintraege).toHaveLength(2);
      expect(dto.version).toBeDefined();
      expect(dto.version.versionNumber).toBe(etb.version.versionNumber);
      expect(dto.version.timestamp).toEqual(etb.version.timestamp);
      expect(dto.createdAt).toEqual(etb.createdAt);
    });

    it('sollte alle Eintraege zurueckgeben wenn includeDeleted=false und keine geloeschten Eintraege', () => {
      // Arrange
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 3,
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb, false);

      // Assert - alle 3 Eintraege sind aktiv
      expect(dto.eintraege).toHaveLength(3);
      expect(dto.eintraege.every((e) => !e.isDeleted)).toBe(true);
    });

    it('sollte alle Eintraege inkludieren wenn includeDeleted=true', () => {
      // Arrange
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 3,
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb, true);

      // Assert
      expect(dto.eintraege).toHaveLength(3);
    });

    it('sollte ein Aggregate ohne Eintraege korrekt mappen', () => {
      // Arrange
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 0,
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb);

      // Assert
      expect(dto.eintraege).toHaveLength(0);
      expect(dto.eintraege).toEqual([]);
    });

    it('sollte den Status DRAFT korrekt mappen', () => {
      // Arrange
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        status: 'DRAFT',
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb);

      // Assert
      expect(dto.status).toBe('DRAFT');
    });

    it('sollte den Status LOCKED korrekt mappen', () => {
      // Arrange
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        status: 'LOCKED',
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb);

      // Assert
      expect(dto.status).toBe('LOCKED');
    });

    it('sollte das Version-Objekt korrekt mappen', () => {
      // Arrange
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 2,
      });

      // Act
      const dto = EtbQueryMapper.toEtbDto(etb);

      // Assert
      expect(dto.version).toEqual({
        versionNumber: etb.version.versionNumber,
        timestamp: etb.version.timestamp,
      });
    });

    // Issue #407 (Funkverkehr Wave 2): Kontext-Filter
    it('sollte alle Eintraege als kontext.type=standard mappen, wenn kein expliziter Kontext gesetzt ist', () => {
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 2,
      });
      const dto = EtbQueryMapper.toEtbDto(etb);
      expect(dto.eintraege.every((e) => e.kontext?.type === 'standard')).toBe(true);
      expect(dto.eintraege.every((e) => e.ereignisZeitpunkt instanceof Date)).toBe(true);
      expect(dto.eintraege.every((e) => e.erfasstAm instanceof Date)).toBe(true);
    });

    it('sollte mit kontextFilter=funkspruch nur Funk-Eintraege durchlassen (alle aus Fixture sind standard → leer)', () => {
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 3,
      });
      const dto = EtbQueryMapper.toEtbDto(etb, false, { kontextType: 'funkspruch' });
      expect(dto.eintraege).toHaveLength(0);
    });

    it('sollte mit kontextFilter=standard alle Standard-Eintraege liefern', () => {
      const etb = createTestEtb({
        einsatzId: generateTestCuid(),
        userId: generateTestCuid(),
        entriesCount: 3,
      });
      const dto = EtbQueryMapper.toEtbDto(etb, false, { kontextType: 'standard' });
      expect(dto.eintraege).toHaveLength(3);
    });
  });

  // ============================================================================
  // toEintragDto Tests
  // ============================================================================

  describe('toEintragDto', () => {
    it('sollte einen Eintrag zu EintragDto mit allen Eigenschaften mappen', () => {
      // Arrange
      const eintrag = createTestEintrag({
        id: generateTestCuid(),
        createdBy: generateTestCuid(),
        sequenceNumber: 5,
        text: 'Fahrzeug W1 eingetroffen',
      });

      // Act
      const dto = EtbQueryMapper.toEintragDto(eintrag);

      // Assert
      expect(dto.id).toBe(eintrag.id.value);
      expect(dto.sequenceNumber).toBe(eintrag.sequenceNumber.value);
      expect(dto.text).toBe('Fahrzeug W1 eingetroffen');
      expect(dto.createdBy).toBe(eintrag.createdBy.value);
      expect(dto.createdAt).toEqual(eintrag.createdAt);
      expect(dto.isDeleted).toBe(false);
    });

    it('sollte undefined updatedAt korrekt behandeln', () => {
      // Arrange
      const eintrag = createTestEintrag({
        id: generateTestCuid(),
        createdBy: generateTestCuid(),
      });
      // Neuer Eintrag hat kein updatedAt

      // Act
      const dto = EtbQueryMapper.toEintragDto(eintrag);

      // Assert
      expect(dto.updatedAt).toBeUndefined();
    });

    it('sollte Value Objects zu primitiven Werten mappen', () => {
      // Arrange
      const testId = generateTestCuid();
      const testUserId = generateTestCuid();
      const eintrag = createTestEintrag({
        id: testId,
        sequenceNumber: 42,
        createdBy: testUserId,
      });

      // Act
      const dto = EtbQueryMapper.toEintragDto(eintrag);

      // Assert - Value Objects wurden zu primitiven Typen
      expect(typeof dto.id).toBe('string');
      expect(dto.id).toBe(testId);
      expect(typeof dto.sequenceNumber).toBe('number');
      expect(dto.sequenceNumber).toBe(42);
      expect(typeof dto.createdBy).toBe('string');
      expect(dto.createdBy).toBe(testUserId);
    });
  });

  // ============================================================================
  // toSnapshotDto Tests
  // ============================================================================

  describe('toSnapshotDto', () => {
    it('sollte einen Snapshot zu EtbSnapshotDto mappen', () => {
      // Arrange - Snapshot mit expliziten Eintraegen
      const testEintraege = Array.from({ length: 2 }, (_, i) => ({
        id: generateTestCuid(),
        sequenceNumber: i + 1,
        text: `Snapshot Eintrag ${i + 1}`,
        createdBy: generateTestCuid(),
        createdAt: new Date().toISOString(),
        isDeleted: false,
      }));
      const snapshot = createTestSnapshot({
        versionNumber: 3,
        eintraege: testEintraege,
      });

      // Act
      const dto = EtbQueryMapper.toSnapshotDto(snapshot);

      // Assert
      expect(dto.version).toBe(3);
      expect(dto.snapshotAt).toEqual(snapshot.snapshotAt);
      expect(dto.eintraege).toHaveLength(2);
    });

    it('sollte einen Snapshot mit leerem eintraege Array korrekt behandeln', () => {
      // Arrange
      const snapshot = createTestSnapshot({
        versionNumber: 1,
        entriesCount: 0,
      });

      // Act
      const dto = EtbQueryMapper.toSnapshotDto(snapshot);

      // Assert
      expect(dto.eintraege).toHaveLength(0);
      expect(dto.eintraege).toEqual([]);
      expect(dto.version).toBe(1);
    });
  });
});
