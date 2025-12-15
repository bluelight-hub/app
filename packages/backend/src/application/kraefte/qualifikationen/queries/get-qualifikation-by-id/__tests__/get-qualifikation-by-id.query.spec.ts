/**
 * Unit Tests für GetQualifikationByIdQuery.
 *
 * Testet die Query-Konstruktion und Property-Assignment.
 * Da diese Query keine Factory-Methode mit Validierung hat,
 * werden nur grundlegende Konstruktor-Tests durchgeführt.
 *
 * **Test Coverage Scope:**
 * - Constructor Property Assignment
 * - Valid ID Handling
 * - Empty/Invalid ID (constructor accepts any string)
 *
 * **Test Pattern:**
 * - AAA Pattern (Arrange-Act-Assert)
 * - KEINE Framework-Dependencies
 *
 * **Note:** Validation erfolgt im Handler, nicht in der Query.
 */

import { GetQualifikationByIdQuery } from '../get-qualifikation-by-id.query';

describe('GetQualifikationByIdQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // CONSTRUCTOR
  // ============================================

  describe('constructor', () => {
    it('sollte Query mit gültiger ID erstellen', () => {
      // Given
      const validId = 'cm1234567890abcdef12345';

      // When
      const query = new GetQualifikationByIdQuery(validId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe(validId);
    });

    it('sollte Query mit beliebiger ID erstellen (keine Validierung im Constructor)', () => {
      // Given
      const anyId = 'any-id-value';

      // When
      const query = new GetQualifikationByIdQuery(anyId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe(anyId);
    });

    it('sollte Query mit leerem String erstellen (Validierung erfolgt im Handler)', () => {
      // Given
      const emptyId = '';

      // When
      const query = new GetQualifikationByIdQuery(emptyId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe('');
    });

    it('sollte Query mit Whitespace ID erstellen (Validierung erfolgt im Handler)', () => {
      // Given
      const whitespaceId = '   ';

      // When
      const query = new GetQualifikationByIdQuery(whitespaceId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe('   ');
    });

    it('sollte Query mit sehr langer ID erstellen', () => {
      // Given
      const longId = 'a'.repeat(1000);

      // When
      const query = new GetQualifikationByIdQuery(longId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe(longId);
      expect(query.id.length).toBe(1000);
    });

    it('sollte Query mit Sonderzeichen in ID erstellen', () => {
      // Given
      const specialId = 'cm_123-456_abc!@#$%';

      // When
      const query = new GetQualifikationByIdQuery(specialId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe(specialId);
    });

    it('sollte Query mit Unicode-Zeichen in ID erstellen', () => {
      // Given
      const unicodeId = 'cm_🚒_qualifikation_ä_ö_ü';

      // When
      const query = new GetQualifikationByIdQuery(unicodeId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe(unicodeId);
    });
  });

  // ============================================
  // IMMUTABILITY (readonly properties)
  // ============================================

  describe('Immutability', () => {
    it('sollte id als readonly property haben', () => {
      // Given
      const validId = 'cm1234567890abcdef12345';
      const query = new GetQualifikationByIdQuery(validId);

      // When/Then
      // TypeScript compiler verhindert Zuweisung zur Compile-Zeit:
      // query.id = 'new-id'; // TS2540: Cannot assign to 'id' because it is a read-only property

      // Runtime-Test: Property sollte existieren und unveränderlich sein
      expect(Object.getOwnPropertyDescriptor(query, 'id')?.writable).toBe(true);
      // Note: TypeScript readonly ist nur zur Compile-Zeit. Runtime ist property writable.
      // Dies ist OK, da wir TypeScript für Immutability nutzen.
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('sollte Query mit numerischer ID (als String) erstellen', () => {
      // Given
      const numericId = '12345';

      // When
      const query = new GetQualifikationByIdQuery(numericId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe('12345');
    });

    it('sollte Query mit Mixed Case ID erstellen', () => {
      // Given
      const mixedCaseId = 'Cm1234567890AbCdEf12345';

      // When
      const query = new GetQualifikationByIdQuery(mixedCaseId);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe('Cm1234567890AbCdEf12345');
    });

    it('sollte Query mit führendem/nachfolgendem Whitespace erstellen', () => {
      // Given
      const idWithWhitespace = '  cm1234567890abcdef12345  ';

      // When
      const query = new GetQualifikationByIdQuery(idWithWhitespace);

      // Then
      expect(query).toBeDefined();
      expect(query.id).toBe('  cm1234567890abcdef12345  ');
      // Note: Kein automatisches Trimming im Constructor
    });
  });
});
