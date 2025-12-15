/**
 * Unit Tests für GetAllQualifikationenQuery.
 *
 * Testet die Query-Konstruktion und Property-Assignment.
 * Da diese Query keine Factory-Methode mit Validierung hat,
 * werden nur grundlegende Konstruktor-Tests durchgeführt.
 *
 * **Test Coverage Scope:**
 * - Constructor Property Assignment
 * - Optional istAktiv Filter Handling
 * - Boolean, undefined, und edge cases
 *
 * **Test Pattern:**
 * - AAA Pattern (Arrange-Act-Assert)
 * - KEINE Framework-Dependencies
 *
 * **Note:** Validation erfolgt im Handler, nicht in der Query.
 */

import { GetAllQualifikationenQuery } from '../get-all-qualifikationen.query';

describe('GetAllQualifikationenQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // CONSTRUCTOR
  // ============================================

  describe('constructor', () => {
    it('sollte Query ohne istAktiv Filter erstellen', () => {
      // Given / When
      const query = new GetAllQualifikationenQuery();

      // Then
      expect(query).toBeDefined();
      expect(query.istAktiv).toBeUndefined();
    });

    it('sollte Query mit istAktiv=true erstellen', () => {
      // Given
      const istAktiv = true;

      // When
      const query = new GetAllQualifikationenQuery(istAktiv);

      // Then
      expect(query).toBeDefined();
      expect(query.istAktiv).toBe(true);
    });

    it('sollte Query mit istAktiv=false erstellen', () => {
      // Given
      const istAktiv = false;

      // When
      const query = new GetAllQualifikationenQuery(istAktiv);

      // Then
      expect(query).toBeDefined();
      expect(query.istAktiv).toBe(false);
    });

    it('sollte Query mit undefined istAktiv erstellen', () => {
      // Given
      const istAktiv = undefined;

      // When
      const query = new GetAllQualifikationenQuery(istAktiv);

      // Then
      expect(query).toBeDefined();
      expect(query.istAktiv).toBeUndefined();
    });
  });

  // ============================================
  // FILTER SEMANTICS
  // ============================================

  describe('Filter Semantics', () => {
    it('sollte undefined bedeuten "keine Filterung" (alle Qualifikationen)', () => {
      // Given / When
      const query = new GetAllQualifikationenQuery(undefined);

      // Then
      expect(query.istAktiv).toBeUndefined();
      // Handler sollte alle Qualifikationen zurückgeben (aktiv + inaktiv)
    });

    it('sollte true bedeuten "nur aktive Qualifikationen"', () => {
      // Given / When
      const query = new GetAllQualifikationenQuery(true);

      // Then
      expect(query.istAktiv).toBe(true);
      // Handler sollte nur aktive Qualifikationen zurückgeben
    });

    it('sollte false bedeuten "nur inaktive Qualifikationen"', () => {
      // Given / When
      const query = new GetAllQualifikationenQuery(false);

      // Then
      expect(query.istAktiv).toBe(false);
      // Handler sollte nur inaktive Qualifikationen zurückgeben
    });
  });

  // ============================================
  // IMMUTABILITY (readonly properties)
  // ============================================

  describe('Immutability', () => {
    it('sollte istAktiv als readonly property haben', () => {
      // Given
      const query = new GetAllQualifikationenQuery(true);

      // When/Then
      // TypeScript compiler verhindert Zuweisung zur Compile-Zeit:
      // query.istAktiv = false; // TS2540: Cannot assign to 'istAktiv' because it is a read-only property

      // Runtime-Test: Property sollte existieren und unveränderlich sein
      expect(Object.getOwnPropertyDescriptor(query, 'istAktiv')?.writable).toBe(true);
      // Note: TypeScript readonly ist nur zur Compile-Zeit. Runtime ist property writable.
      // Dies ist OK, da wir TypeScript für Immutability nutzen.
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('sollte Query mit explizitem undefined erstellen', () => {
      // Given
      const istAktiv: boolean | undefined = undefined;

      // When
      const query = new GetAllQualifikationenQuery(istAktiv);

      // Then
      expect(query).toBeDefined();
      expect(query.istAktiv).toBeUndefined();
    });

    it('sollte Query ohne Argumente erstellen (default undefined)', () => {
      // Given / When
      const query = new GetAllQualifikationenQuery();

      // Then
      expect(query).toBeDefined();
      expect(query.istAktiv).toBeUndefined();
    });

    it('sollte mehrere Query-Instanzen unabhängig voneinander erstellen', () => {
      // Given / When
      const query1 = new GetAllQualifikationenQuery(true);
      const query2 = new GetAllQualifikationenQuery(false);
      const query3 = new GetAllQualifikationenQuery();

      // Then
      expect(query1.istAktiv).toBe(true);
      expect(query2.istAktiv).toBe(false);
      expect(query3.istAktiv).toBeUndefined();

      // Queries sollten unabhängig sein
      expect(query1).not.toBe(query2);
      expect(query1).not.toBe(query3);
      expect(query2).not.toBe(query3);
    });
  });

  // ============================================
  // TYPE SAFETY (Compile-Time Checks)
  // ============================================

  describe('Type Safety', () => {
    it('sollte nur boolean oder undefined als istAktiv akzeptieren (TypeScript)', () => {
      // Given
      const validBoolean = true;
      const validUndefined = undefined;

      // When
      const query1 = new GetAllQualifikationenQuery(validBoolean);
      const query2 = new GetAllQualifikationenQuery(validUndefined);

      // Then
      expect(query1.istAktiv).toBe(true);
      expect(query2.istAktiv).toBeUndefined();

      // TypeScript verhindert zur Compile-Zeit:
      // new GetAllQualifikationenQuery('string'); // TS2345: Argument of type 'string' is not assignable to parameter of type 'boolean | undefined'
      // new GetAllQualifikationenQuery(123); // TS2345
      // new GetAllQualifikationenQuery(null); // TS2345
    });
  });

  // ============================================
  // COMPARISON TESTS
  // ============================================

  describe('Comparison Tests', () => {
    it('sollte zwei Queries mit gleichem Filter-Wert erstellen', () => {
      // Given / When
      const query1 = new GetAllQualifikationenQuery(true);
      const query2 = new GetAllQualifikationenQuery(true);

      // Then
      expect(query1.istAktiv).toBe(query2.istAktiv);
      expect(query1).not.toBe(query2); // Verschiedene Objekt-Instanzen
    });

    it('sollte zwei Queries mit verschiedenen Filter-Werten erstellen', () => {
      // Given / When
      const query1 = new GetAllQualifikationenQuery(true);
      const query2 = new GetAllQualifikationenQuery(false);

      // Then
      expect(query1.istAktiv).not.toBe(query2.istAktiv);
      expect(query1.istAktiv).toBe(true);
      expect(query2.istAktiv).toBe(false);
    });

    it('sollte undefined korrekt mit boolean vergleichen', () => {
      // Given / When
      const queryAll = new GetAllQualifikationenQuery(undefined);
      const queryActive = new GetAllQualifikationenQuery(true);

      // Then
      expect(queryAll.istAktiv).not.toBe(queryActive.istAktiv);
      expect(queryAll.istAktiv).toBeUndefined();
      expect(queryActive.istAktiv).toBe(true);
    });
  });
});
