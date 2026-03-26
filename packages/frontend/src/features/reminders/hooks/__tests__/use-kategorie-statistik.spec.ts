/**
 * Unit Tests fuer useKategorieStatistik Hook / calculateKategorieStatistik
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given/When/Then Kommentaren
 *
 * **Story 8.10:**
 * - Berechnet korrekte activeCount und overdueCount pro Kategorie
 * - "Ohne Kategorie" Eintrag fuer Erinnerungen ohne kategorieId
 * - ERLEDIGT-Status wird nicht als aktiv gezaehlt
 * - Leeres Array bei keine Kategorien (AC4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ErinnerungResponseDto } from '@/shared';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';
import { calculateKategorieStatistik, useKategorieStatistik } from '@/features/reminders';

// ============================================
// Test Factory Helpers
// ============================================

/** Erstellt eine minimale ErinnerungResponseDto fuer Tests */
function createErinnerung(overrides: Partial<ErinnerungResponseDto> = {}): ErinnerungResponseDto {
  return {
    id: `erinnerung-${Math.random().toString(36).slice(2, 8)}`,
    einsatzId: 'einsatz-1',
    titel: 'Test Erinnerung',
    beschreibung: null,
    faelligAm: new Date('2026-03-01T12:00:00Z').toISOString(),
    status: 'GEPLANT',
    erstelltVon: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    snoozeCount: 0,
    requiresNote: false,
    isRecurring: false,
    recurringCurrentCount: 0,
    ...overrides,
  } as ErinnerungResponseDto;
}

/** Erstellt eine minimale KategorieResponseDto fuer Tests */
function createKategorie(overrides: Partial<KategorieResponseDto> = {}): KategorieResponseDto {
  return {
    id: `kat-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Kategorie',
    farbe: '#FF0000',
    einsatzId: 'einsatz-1',
    erstelltVon: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('calculateKategorieStatistik', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate correct activeCount per category', () => {
    // Given: 2 Kategorien, je 2 aktive Erinnerungen
    const kat1 = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });
    const kat2 = createKategorie({ id: 'kat-2', name: 'Personal', farbe: '#00FF00' });

    const erinnerungen = [
      createErinnerung({ kategorieId: 'kat-1' as unknown as object, status: 'GEPLANT' }),
      createErinnerung({ kategorieId: 'kat-1' as unknown as object, status: 'AUSGELOEST' }),
      createErinnerung({ kategorieId: 'kat-2' as unknown as object, status: 'SNOOZED' }),
      createErinnerung({ kategorieId: 'kat-2' as unknown as object, status: 'ACKNOWLEDGED' }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat1, kat2]);

    // Then
    const logistik = result.find((s) => s.kategorieId === 'kat-1')!;
    const personal = result.find((s) => s.kategorieId === 'kat-2')!;
    expect(logistik.activeCount).toBe(2);
    expect(personal.activeCount).toBe(2);
  });

  it('should calculate correct overdueCount per category (faelligAm in past)', () => {
    // Given: Erinnerungen mit faelligAm in Vergangenheit und Zukunft
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });

    const erinnerungen = [
      // Ueberfaellig (faelligAm in Vergangenheit)
      createErinnerung({
        kategorieId: 'kat-1' as unknown as object,
        status: 'GEPLANT',
        faelligAm: '2026-02-06T09:00:00Z',
      }),
      // Ueberfaellig (faelligAm genau jetzt)
      createErinnerung({
        kategorieId: 'kat-1' as unknown as object,
        status: 'AUSGELOEST',
        faelligAm: '2026-02-06T10:00:00Z',
      }),
      // Noch nicht faellig (faelligAm in Zukunft)
      createErinnerung({
        kategorieId: 'kat-1' as unknown as object,
        status: 'GEPLANT',
        faelligAm: '2026-02-06T11:00:00Z',
      }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then
    const logistik = result.find((s) => s.kategorieId === 'kat-1')!;
    expect(logistik.activeCount).toBe(3);
    expect(logistik.overdueCount).toBe(2); // Vergangenheit + genau jetzt
  });

  it('should create "Ohne Kategorie" entry for reminders without kategorieId', () => {
    // Given: Erinnerung ohne Kategorie
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });

    const erinnerungen = [createErinnerung({ kategorieId: null as unknown as object, status: 'GEPLANT' })];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then
    const ohneKategorie = result.find((s) => s.kategorieId === null)!;
    expect(ohneKategorie).toBeDefined();
    expect(ohneKategorie.name).toBe('Ohne Kategorie');
    expect(ohneKategorie.farbe).toBe('#9CA3AF');
    expect(ohneKategorie.activeCount).toBe(1);
  });

  it('should not count ERLEDIGT status as active', () => {
    // Given: Erinnerungen mit ERLEDIGT Status
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });

    const erinnerungen = [
      createErinnerung({ kategorieId: 'kat-1' as unknown as object, status: 'ERLEDIGT' }),
      createErinnerung({ kategorieId: 'kat-1' as unknown as object, status: 'ERLEDIGT' }),
      createErinnerung({ kategorieId: 'kat-1' as unknown as object, status: 'GEPLANT' }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then
    const logistik = result.find((s) => s.kategorieId === 'kat-1')!;
    expect(logistik.activeCount).toBe(1); // Nur die GEPLANT
  });

  it('should return empty array when no categories exist (AC4)', () => {
    // Given: Keine Kategorien
    const erinnerungen = [createErinnerung({ status: 'GEPLANT' })];

    // When
    const result = calculateKategorieStatistik(erinnerungen, []);

    // Then
    expect(result).toEqual([]);
  });

  it('should show 0/0 when categories exist but no reminders', () => {
    // Given: Kategorien vorhanden, aber keine Erinnerungen
    const kat1 = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });
    const kat2 = createKategorie({ id: 'kat-2', name: 'Personal', farbe: '#00FF00' });

    // When
    const result = calculateKategorieStatistik([], [kat1, kat2]);

    // Then
    for (const stat of result) {
      expect(stat.activeCount).toBe(0);
      expect(stat.overdueCount).toBe(0);
    }
    // Inkl. "Ohne Kategorie"
    expect(result).toHaveLength(3);
  });

  it('should correctly assign reminders to multiple categories', () => {
    // Given: 3 Kategorien mit verschiedenen Erinnerungen
    const katLogistik = createKategorie({ id: 'kat-log', name: 'Logistik', farbe: '#FF0000' });
    const katPersonal = createKategorie({ id: 'kat-pers', name: 'Personal', farbe: '#00FF00' });
    const katTechnik = createKategorie({ id: 'kat-tech', name: 'Technik', farbe: '#0000FF' });

    const erinnerungen = [
      createErinnerung({ kategorieId: 'kat-log' as unknown as object, status: 'GEPLANT' }),
      createErinnerung({ kategorieId: 'kat-log' as unknown as object, status: 'AUSGELOEST' }),
      createErinnerung({ kategorieId: 'kat-log' as unknown as object, status: 'ERLEDIGT' }),
      createErinnerung({ kategorieId: 'kat-pers' as unknown as object, status: 'SNOOZED' }),
      createErinnerung({ kategorieId: 'kat-tech' as unknown as object, status: 'ESKALIERT' }),
      createErinnerung({ kategorieId: 'kat-tech' as unknown as object, status: 'ACKNOWLEDGED' }),
      createErinnerung({ kategorieId: 'kat-tech' as unknown as object, status: 'ERLEDIGT' }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [katLogistik, katPersonal, katTechnik]);

    // Then
    const logistik = result.find((s) => s.kategorieId === 'kat-log')!;
    const personal = result.find((s) => s.kategorieId === 'kat-pers')!;
    const technik = result.find((s) => s.kategorieId === 'kat-tech')!;

    expect(logistik.activeCount).toBe(2); // GEPLANT + AUSGELOEST (ERLEDIGT zaehlt nicht)
    expect(personal.activeCount).toBe(1); // SNOOZED
    expect(technik.activeCount).toBe(2); // ESKALIERT + ACKNOWLEDGED (ERLEDIGT zaehlt nicht)
  });

  it('should count reminder with null kategorieId to "Ohne Kategorie"', () => {
    // Given: Erinnerung mit null kategorieId
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });

    const erinnerungen = [
      createErinnerung({
        kategorieId: null as unknown as object,
        status: 'GEPLANT',
        faelligAm: '2026-02-06T09:00:00Z', // ueberfaellig
      }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then
    const ohneKategorie = result.find((s) => s.kategorieId === null)!;
    expect(ohneKategorie.activeCount).toBe(1);
    expect(ohneKategorie.overdueCount).toBe(1);
  });

  it('should count reminder with undefined kategorieId to "Ohne Kategorie"', () => {
    // Given: Erinnerung mit undefined kategorieId
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });

    const erinnerungen = [
      createErinnerung({
        kategorieId: undefined as unknown as object,
        status: 'AUSGELOEST',
        faelligAm: '2026-02-06T09:00:00Z', // ueberfaellig
      }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then
    const ohneKategorie = result.find((s) => s.kategorieId === null)!;
    expect(ohneKategorie.activeCount).toBe(1);
    expect(ohneKategorie.overdueCount).toBe(1);
  });

  it('should count reminder with deleted/unknown kategorieId to "Ohne Kategorie"', () => {
    // Given: Kategorie existiert, aber Erinnerung referenziert gelöschte Kategorie
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });

    const erinnerungen = [
      createErinnerung({
        kategorieId: 'kat-deleted' as unknown as object,
        status: 'GEPLANT',
        faelligAm: '2026-02-06T09:00:00Z', // ueberfaellig
      }),
    ];

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then: Gelöschte Kategorie zählt zu "Ohne Kategorie"
    const ohneKategorie = result.find((s) => s.kategorieId === null)!;
    expect(ohneKategorie.activeCount).toBe(1);
    expect(ohneKategorie.overdueCount).toBe(1);

    // Logistik bleibt bei 0
    const logistik = result.find((s) => s.kategorieId === 'kat-1')!;
    expect(logistik.activeCount).toBe(0);
  });

  it('should not count ERLEDIGT but count all other statuses as active', () => {
    // Given: Erinnerungen mit allen moeglichen Status
    const kat = createKategorie({ id: 'kat-1', name: 'Test', farbe: '#FF0000' });

    const allStatuses = ['GEPLANT', 'AUSGELOEST', 'ACKNOWLEDGED', 'SNOOZED', 'ESKALIERT', 'ERLEDIGT'] as const;
    const erinnerungen = allStatuses.map((status) =>
      createErinnerung({
        kategorieId: 'kat-1' as unknown as object,
        status,
      }),
    );

    // When
    const result = calculateKategorieStatistik(erinnerungen, [kat]);

    // Then: Alle Status ausser ERLEDIGT zaehlen als aktiv
    const testKat = result.find((s) => s.kategorieId === 'kat-1')!;
    expect(testKat.activeCount).toBe(5); // 6 Status - 1 ERLEDIGT = 5
  });
});

describe('useKategorieStatistik (Hook)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return same result as calculateKategorieStatistik via renderHook', () => {
    // Given: Kategorien und Erinnerungen
    const kat = createKategorie({ id: 'kat-1', name: 'Logistik', farbe: '#FF0000' });
    const erinnerungen = [
      createErinnerung({
        kategorieId: 'kat-1' as unknown as object,
        status: 'GEPLANT',
        faelligAm: '2026-02-06T09:00:00Z',
      }),
      createErinnerung({
        kategorieId: null as unknown as object,
        status: 'AUSGELOEST',
      }),
    ];

    // When
    const { result } = renderHook(() => useKategorieStatistik(erinnerungen, [kat]));

    // Then: Ergebnis entspricht pure Funktion
    const expected = calculateKategorieStatistik(erinnerungen, [kat]);
    expect(result.current).toEqual(expected);
  });
});
