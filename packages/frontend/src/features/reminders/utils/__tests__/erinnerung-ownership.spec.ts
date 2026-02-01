import { describe, expect, it } from 'vitest';
import type { ErinnerungResponseDto } from '@/shared';
import { filterMyErinnerungen, isMyErinnerung } from '../erinnerung-ownership';

/**
 * Unit Tests fuer Erinnerung Ownership Utilities
 *
 * Story 3.6 Issue #5: Korrekte Filterung von "Meine Erinnerungen"
 * Story 3.4 AC2: Nach Zuweisung an andere verschwindet Erinnerung aus "Meine"
 * Story 4.5: Eskalierte Erinnerungen gehoeren dem Eskalations-Empfaenger
 */

const createErinnerung = (overrides: Partial<ErinnerungResponseDto> = {}): ErinnerungResponseDto =>
  ({
    id: 'erinnerung-1',
    titel: 'Test Erinnerung',
    beschreibung: null,
    faelligkeitszeitpunkt: new Date().toISOString(),
    status: 'GEPLANT',
    prioritaet: 'NORMAL',
    erstelltVon: 'user-ersteller',
    assignedToId: null,
    eskalationsPersonId: null,
    einsatzId: 'einsatz-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as ErinnerungResponseDto;

describe('isMyErinnerung', () => {
  const userId = 'current-user-id';

  describe('Given eine Erinnerung die mir zugewiesen ist', () => {
    it('should return true', () => {
      // Given
      const erinnerung = createErinnerung({ assignedToId: userId });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then
      expect(result).toBe(true);
    });
  });

  describe('Given eine Erinnerung die an mich eskaliert wurde', () => {
    it('should return true when status is ESKALIERT and eskalationsPersonId matches', () => {
      // Given
      const erinnerung = createErinnerung({
        status: 'ESKALIERT',
        eskalationsPersonId: userId,
        erstelltVon: 'other-user',
      });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then
      expect(result).toBe(true);
    });

    it('should return false when status is not ESKALIERT even if eskalationsPersonId matches', () => {
      // Given
      const erinnerung = createErinnerung({
        status: 'GEPLANT',
        eskalationsPersonId: userId,
      });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('Given eine Erinnerung die ich erstellt habe', () => {
    it('should return true when niemand zugewiesen ist', () => {
      // Given
      const erinnerung = createErinnerung({
        erstelltVon: userId,
        assignedToId: null,
      });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then
      expect(result).toBe(true);
    });

    it('should return false when jemand anderem zugewiesen (Story 3.4 AC2)', () => {
      // Given - Ich habe erstellt, aber jemand anderem zugewiesen
      const erinnerung = createErinnerung({
        erstelltVon: userId,
        assignedToId: 'other-user',
      });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then - Nicht mehr meine Erinnerung!
      expect(result).toBe(false);
    });
  });

  describe('Given eine Erinnerung die mich nicht betrifft', () => {
    it('should return false when erstellt von anderem und zugewiesen an anderen', () => {
      // Given
      const erinnerung = createErinnerung({
        erstelltVon: 'other-user',
        assignedToId: 'another-user',
      });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then
      expect(result).toBe(false);
    });

    it('should return false for Team-Erinnerung (assignedToId=null) von anderem Ersteller', () => {
      // Given - Team-Erinnerung von jemand anderem
      const erinnerung = createErinnerung({
        erstelltVon: 'other-user',
        assignedToId: null,
      });

      // When
      const result = isMyErinnerung(erinnerung, userId);

      // Then - Nicht meine Erinnerung (nur fuer isMyErinnerung, nicht fuer Alarm!)
      expect(result).toBe(false);
    });
  });
});

describe('filterMyErinnerungen', () => {
  const userId = 'current-user-id';

  it('should filter to only erinnerungen that belong to user', () => {
    // Given
    const erinnerungen = [
      createErinnerung({ id: '1', assignedToId: userId }), // Mir zugewiesen
      createErinnerung({ id: '2', erstelltVon: userId, assignedToId: null }), // Von mir erstellt
      createErinnerung({ id: '3', erstelltVon: 'other', assignedToId: 'other' }), // Nicht meine
      createErinnerung({ id: '4', status: 'ESKALIERT', eskalationsPersonId: userId }), // An mich eskaliert
    ];

    // When
    const result = filterMyErinnerungen(erinnerungen, userId);

    // Then
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(['1', '2', '4']);
  });

  it('should return empty array when no erinnerungen match', () => {
    // Given
    const erinnerungen = [createErinnerung({ erstelltVon: 'other', assignedToId: 'other' })];

    // When
    const result = filterMyErinnerungen(erinnerungen, userId);

    // Then
    expect(result).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    // When
    const result = filterMyErinnerungen([], userId);

    // Then
    expect(result).toHaveLength(0);
  });
});
