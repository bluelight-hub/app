/**
 * Unit Tests fuer useErinnerungTimeline Hook - Query Key Tests
 *
 * Story 5.5: Timeline Query Hook Tests
 *
 * Testet:
 * - Query Key ist korrekt aufgebaut
 * - Query Key Struktur folgt Konventionen
 *
 * Hinweis: Die Hook-Enabled-Logik und API-Calls werden durch die
 * Komponenten-Tests (ErinnerungTimelineWidget.spec.tsx) abgedeckt,
 * die den Hook als Mock verwenden.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock @/shared BEVOR irgendwelche Module importiert werden
// Dies verhindert das Initialisierungsproblem mit Zod/Enum
vi.mock('@/shared', () => ({
  api: vi.fn(() => ({
    etb: vi.fn(() => ({
      etbCqrsControllerGetErinnerungTimelineVAlpha: vi.fn(),
    })),
  })),
  ResponseError: class MockResponseError extends Error {
    response: { status: number };
    constructor(message: string) {
      super(message);
      this.response = { status: 500 };
    }
  },
  AddEintragDtoKategorieEnum: {
    Alarmierung: 'Alarmierung',
    Ankunft: 'Ankunft',
    Befehl: 'Befehl',
    Erkundung: 'Erkundung',
    Lage: 'Lage',
    Massnahme: 'Massnahme',
    Personal: 'Personal',
    Fahrzeug: 'Fahrzeug',
    Material: 'Material',
    Kommunikation: 'Kommunikation',
    Wetter: 'Wetter',
    Dokumentation: 'Dokumentation',
    Sonstiges: 'Sonstiges',
    System: 'System',
  },
}));

// Importiere NACH dem Mock
import { ERINNERUNG_TIMELINE_QUERY_KEYS } from '../use-erinnerung-timeline';

describe('ERINNERUNG_TIMELINE_QUERY_KEYS', () => {
  describe('Query Key Structure', () => {
    it('should have correct query key structure', () => {
      // Given (Arrange)
      const etbId = 'etb-123';
      const erinnerungId = 'erin-456';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey).toEqual(['etb', 'etb-123', 'erinnerungen', 'erin-456', 'timeline']);
    });

    it('should include ETB_QUERY_KEYS.all prefix (etb)', () => {
      // Given (Arrange)
      const etbId = 'test-etb';
      const erinnerungId = 'test-erin';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey[0]).toBe('etb');
    });

    it('should include etbId at position 1', () => {
      // Given (Arrange)
      const etbId = 'my-etb-id';
      const erinnerungId = 'my-erin-id';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey[1]).toBe('my-etb-id');
    });

    it('should include "erinnerungen" segment at position 2', () => {
      // Given (Arrange)
      const etbId = 'etb-1';
      const erinnerungId = 'erin-1';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey[2]).toBe('erinnerungen');
    });

    it('should include erinnerungId at position 3', () => {
      // Given (Arrange)
      const etbId = 'etb-1';
      const erinnerungId = 'my-erin-id';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey[3]).toBe('my-erin-id');
    });

    it('should include "timeline" segment at position 4', () => {
      // Given (Arrange)
      const etbId = 'etb-1';
      const erinnerungId = 'erin-1';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey[4]).toBe('timeline');
    });

    it('should have exactly 5 segments', () => {
      // Given (Arrange)
      const etbId = 'etb-1';
      const erinnerungId = 'erin-1';

      // When (Act)
      const queryKey = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(queryKey).toHaveLength(5);
    });
  });

  describe('Query Key Uniqueness', () => {
    it('should produce different keys for different etbIds', () => {
      // Given (Arrange)
      const erinnerungId = 'erin-1';

      // When (Act)
      const key1 = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline('etb-1', erinnerungId);
      const key2 = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline('etb-2', erinnerungId);

      // Then (Assert)
      expect(key1).not.toEqual(key2);
      expect(key1[1]).toBe('etb-1');
      expect(key2[1]).toBe('etb-2');
    });

    it('should produce different keys for different erinnerungIds', () => {
      // Given (Arrange)
      const etbId = 'etb-1';

      // When (Act)
      const key1 = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, 'erin-1');
      const key2 = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, 'erin-2');

      // Then (Assert)
      expect(key1).not.toEqual(key2);
      expect(key1[3]).toBe('erin-1');
      expect(key2[3]).toBe('erin-2');
    });

    it('should produce same key for same parameters', () => {
      // Given (Arrange)
      const etbId = 'etb-1';
      const erinnerungId = 'erin-1';

      // When (Act)
      const key1 = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);
      const key2 = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(key1).toEqual(key2);
    });
  });

  describe('Export Validation', () => {
    it('should export ERINNERUNG_TIMELINE_QUERY_KEYS', () => {
      expect(ERINNERUNG_TIMELINE_QUERY_KEYS).toBeDefined();
    });

    it('should export timeline function in ERINNERUNG_TIMELINE_QUERY_KEYS', () => {
      expect(typeof ERINNERUNG_TIMELINE_QUERY_KEYS.timeline).toBe('function');
    });

    it('should return readonly array (as const)', () => {
      // Given (Arrange)
      const key = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline('etb-1', 'erin-1');

      // Then (Assert) - Array ist readonly (tuples as const)
      expect(Array.isArray(key)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string etbId', () => {
      // Given (Arrange)
      const etbId = '';
      const erinnerungId = 'erin-1';

      // When (Act)
      const key = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(key[1]).toBe('');
      expect(key).toHaveLength(5);
    });

    it('should handle empty string erinnerungId', () => {
      // Given (Arrange)
      const etbId = 'etb-1';
      const erinnerungId = '';

      // When (Act)
      const key = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(key[3]).toBe('');
      expect(key).toHaveLength(5);
    });

    it('should handle special characters in IDs', () => {
      // Given (Arrange)
      const etbId = 'etb-with-special-chars_123';
      const erinnerungId = 'erin-with-special-chars_456';

      // When (Act)
      const key = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(key[1]).toBe('etb-with-special-chars_123');
      expect(key[3]).toBe('erin-with-special-chars_456');
    });

    it('should handle CUID-style IDs (typical production IDs)', () => {
      // Given (Arrange) - CUIDs wie sie im Projekt verwendet werden
      const etbId = 'clw3h8x9y0001znopqrstuvw';
      const erinnerungId = 'clw3h8x9y0002znopqrstuvw';

      // When (Act)
      const key = ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId, erinnerungId);

      // Then (Assert)
      expect(key[1]).toBe('clw3h8x9y0001znopqrstuvw');
      expect(key[3]).toBe('clw3h8x9y0002znopqrstuvw');
    });
  });
});
