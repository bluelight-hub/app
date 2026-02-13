import { describe, it, expect } from 'vitest';
import type { ErinnerungResponseDto } from '@/shared';
import { compareErinnerungen, getSortPriority } from '../sorting-utils';

/**
 * Mock Reminder Helper
 */
function createMockErinnerung(overrides: Partial<ErinnerungResponseDto>): ErinnerungResponseDto {
  return {
    id: 'test-id',
    titel: 'Test Erinnerung',
    status: 'GEPLANT',
    faelligAm: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    erstelltVon: 'user-1',
    einsatzId: 'einsatz-1',
    verlauf: [],
    ...overrides,
  } as ErinnerungResponseDto;
}

describe('sorting-utils', () => {
  describe('getSortPriority', () => {
    it('should prioritize AUSGELOEST (0)', () => {
      const e = createMockErinnerung({ status: 'AUSGELOEST' });
      expect(getSortPriority(e)).toBe(0);
    });

    it('should prioritize GEPLANT critical (1)', () => {
      // 0 seconds remaining = critical
      const faelligAm = new Date(Date.now()).toISOString();
      const e = createMockErinnerung({ status: 'GEPLANT', faelligAm });
      expect(getSortPriority(e)).toBe(1);
    });

    it('should prioritize GEPLANT urgent (2)', () => {
      // 1 minute remaining = urgent (< 2 min)
      const faelligAm = new Date(Date.now() + 60 * 1000).toISOString();
      const e = createMockErinnerung({ status: 'GEPLANT', faelligAm });
      expect(getSortPriority(e)).toBe(2);
    });

    it('should prioritize GEPLANT warning (3)', () => {
      // 3 minutes remaining = warning (2-5 min)
      const faelligAm = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      const e = createMockErinnerung({ status: 'GEPLANT', faelligAm });
      expect(getSortPriority(e)).toBe(3);
    });

    it('should prioritize GEPLANT normal (4)', () => {
      // 10 minutes remaining = normal (> 5 min)
      const faelligAm = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const e = createMockErinnerung({ status: 'GEPLANT', faelligAm });
      expect(getSortPriority(e)).toBe(4);
    });
    it('should prioritize ACKNOWLEDGED (5)', () => {
      const e = createMockErinnerung({ status: 'ACKNOWLEDGED' });
      expect(getSortPriority(e)).toBe(5);
    });

    it('should prioritize SNOOZED (6)', () => {
      const e = createMockErinnerung({ status: 'SNOOZED' });
      expect(getSortPriority(e)).toBe(6);
    });

    it('should prioritize ERLEDIGT (7)', () => {
      const e = createMockErinnerung({ status: 'ERLEDIGT' });
      expect(getSortPriority(e)).toBe(7);
    });
  });

  describe('compareErinnerungen', () => {
    const e1 = createMockErinnerung({ id: '1', createdAt: '2023-01-01T10:00:00Z', faelligAm: '2023-01-02T10:00:00Z', status: 'GEPLANT' });
    const e2 = createMockErinnerung({ id: '2', createdAt: '2023-01-01T11:00:00Z', faelligAm: '2023-01-02T11:00:00Z', status: 'GEPLANT' });

    describe('sort by created', () => {
      it('should sort newest first', () => {
        expect(compareErinnerungen(e1, e2, 'erstellt')).toBeGreaterThan(0); // e2 is newer, so e1 > e2 (should be after) -> wait, sort(a,b) return > 0 means a after b.
        // Logic: b.date - a.date. e2(new) - e1(old) > 0. So positive.
        // So compare(e1, e2) > 0 means e2 comes first. Correct.
      });
    });

    describe('sort by faelligkeit', () => {
      it('should sort urgency first', () => {
        const urgent = createMockErinnerung({ status: 'AUSGELOEST' });
        const normal = createMockErinnerung({ status: 'GEPLANT', faelligAm: new Date(Date.now() + 100000).toISOString() });
        expect(compareErinnerungen(urgent, normal, 'faelligkeit')).toBeLessThan(0); // urgent < normal
      });

      it('should sort by date if priorities equal', () => {
        expect(compareErinnerungen(e1, e2, 'faelligkeit')).toBeLessThan(0); // e1 is due earlier
      });
    });

    describe('sort by status', () => {
      it('should sort by predefined status order', () => {
        const ack = createMockErinnerung({ status: 'ACKNOWLEDGED' });
        const snoozed = createMockErinnerung({ status: 'SNOOZED' });
        // ACK (3) < SNOOZED (4)
        expect(compareErinnerungen(ack, snoozed, 'status')).toBeLessThan(0);
      });

      it('should fallback to due date if status equal', () => {
        expect(compareErinnerungen(e1, e2, 'status')).toBeLessThan(0);
      });
    });

    /**
     * Story 8.8 AC2: Sortierung nach Titel
     */
    describe('sort by titel (Story 8.8 AC2)', () => {
      it('should sort alphabetically by title A-Z', () => {
        // Given
        const erinnerungen = [createMockErinnerung({ titel: 'Charlie' }), createMockErinnerung({ titel: 'Alpha' }), createMockErinnerung({ titel: 'Bravo' })];

        // When
        const sorted = [...erinnerungen].sort((a, b) => compareErinnerungen(a, b, 'titel'));

        // Then
        expect(sorted[0].titel).toBe('Alpha');
        expect(sorted[1].titel).toBe('Bravo');
        expect(sorted[2].titel).toBe('Charlie');
      });

      it('should sort case-insensitive', () => {
        // Given
        const erinnerungen = [createMockErinnerung({ titel: 'charlie' }), createMockErinnerung({ titel: 'Alpha' }), createMockErinnerung({ titel: 'BRAVO' })];

        // When
        const sorted = [...erinnerungen].sort((a, b) => compareErinnerungen(a, b, 'titel'));

        // Then
        expect(sorted[0].titel).toBe('Alpha');
        expect(sorted[1].titel).toBe('BRAVO');
        expect(sorted[2].titel).toBe('charlie');
      });

      it('should use faelligAm as secondary sort when titles are equal', () => {
        // Given
        const erinnerungen = [
          createMockErinnerung({ id: 'later', titel: 'Same Title', faelligAm: '2026-02-10T10:00:00Z' }),
          createMockErinnerung({ id: 'earlier', titel: 'Same Title', faelligAm: '2026-02-01T10:00:00Z' }),
        ];

        // When
        const sorted = [...erinnerungen].sort((a, b) => compareErinnerungen(a, b, 'titel'));

        // Then - fruehere Faelligkeit zuerst
        expect(sorted[0].id).toBe('earlier');
        expect(sorted[1].id).toBe('later');
      });

      it('should sort umlauts correctly (ä after a, ö after o, ü after u)', () => {
        // Given
        const erinnerungen = [
          createMockErinnerung({ titel: 'Übung' }),
          createMockErinnerung({ titel: 'Alarm' }),
          createMockErinnerung({ titel: 'Ärzte' }),
          createMockErinnerung({ titel: 'Ordnung' }),
          createMockErinnerung({ titel: 'Öffnung' }),
        ];

        // When
        const sorted = [...erinnerungen].sort((a, b) => compareErinnerungen(a, b, 'titel'));

        // Then - deutsche Sortierung: ä nach a, ö nach o, ü nach u
        expect(sorted[0].titel).toBe('Alarm');
        expect(sorted[1].titel).toBe('Ärzte');
        expect(sorted[2].titel).toBe('Öffnung');
        expect(sorted[3].titel).toBe('Ordnung');
        expect(sorted[4].titel).toBe('Übung');
      });
    });

    /**
     * Story 8.7 AC3: Faelligkeit absteigend Option
     */
    describe('sort by faelligkeit_desc (Story 8.7 AC3)', () => {
      it('should sort by due date descending (later dates first)', () => {
        // Given
        const erinnerungen = [
          createMockErinnerung({ id: 'mid', faelligAm: '2026-02-05T10:00:00Z' }),
          createMockErinnerung({ id: 'late', faelligAm: '2026-02-10T10:00:00Z' }),
          createMockErinnerung({ id: 'early', faelligAm: '2026-02-01T10:00:00Z' }),
        ];

        // When
        const sorted = [...erinnerungen].sort((a, b) => compareErinnerungen(a, b, 'faelligkeit_desc'));

        // Then - Späteste Fälligkeit zuerst
        expect(sorted[0].id).toBe('late');
        expect(sorted[1].id).toBe('mid');
        expect(sorted[2].id).toBe('early');
      });

      it('should NOT apply urgency priority for faelligkeit_desc', () => {
        // Given: AUSGELOEST mit später Fälligkeit vs GEPLANT mit früher Fälligkeit
        const ausgeloest = createMockErinnerung({
          id: 'ausgeloest',
          faelligAm: '2026-02-10T10:00:00Z',
          status: 'AUSGELOEST',
        });
        const geplant = createMockErinnerung({
          id: 'geplant',
          faelligAm: '2026-02-01T10:00:00Z',
          status: 'GEPLANT',
        });

        // When
        const sorted = [geplant, ausgeloest].sort((a, b) => compareErinnerungen(a, b, 'faelligkeit_desc'));

        // Then: Spätere Fälligkeit zuerst, unabhängig vom Status
        expect(sorted[0].id).toBe('ausgeloest'); // Spaetere Faelligkeit zuerst
        expect(sorted[1].id).toBe('geplant');
      });

      it('should sort ESKALIERT and ERLEDIGT purely by date when using faelligkeit_desc', () => {
        // Given: verschiedene Status, verschiedene Faelligkeiten
        const erledigt = createMockErinnerung({
          id: 'erledigt',
          faelligAm: '2026-02-15T10:00:00Z',
          status: 'ERLEDIGT',
        });
        const eskaliert = createMockErinnerung({
          id: 'eskaliert',
          faelligAm: '2026-02-05T10:00:00Z',
          status: 'ESKALIERT',
        });

        // When
        const sorted = [eskaliert, erledigt].sort((a, b) => compareErinnerungen(a, b, 'faelligkeit_desc'));

        // Then: ERLEDIGT mit spaeterer Faelligkeit zuerst (rein chronologisch)
        expect(sorted[0].id).toBe('erledigt');
        expect(sorted[1].id).toBe('eskaliert');
      });

      it('should return 0 for equal due dates (stable sort)', () => {
        // Given: Zwei Erinnerungen mit exakt gleicher Faelligkeit
        const a = createMockErinnerung({
          id: 'a',
          faelligAm: '2026-02-05T10:00:00Z',
          status: 'GEPLANT',
        });
        const b = createMockErinnerung({
          id: 'b',
          faelligAm: '2026-02-05T10:00:00Z',
          status: 'AUSGELOEST',
        });

        // When
        const result = compareErinnerungen(a, b, 'faelligkeit_desc');

        // Then: Gleiche Faelligkeit = 0 (stabile Reihenfolge)
        expect(result).toBe(0);
      });
    });
  });
});
