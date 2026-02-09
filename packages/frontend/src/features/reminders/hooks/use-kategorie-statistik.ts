/**
 * Hook fuer Kategorie-Statistiken bei Erinnerungen
 *
 * Berechnet pro Kategorie die Anzahl aktiver und ueberfaelliger Erinnerungen.
 * Nutzt `useMemo` fuer reaktive Neuberechnung bei Aenderungen.
 *
 * **Story 8.10:**
 * - Zaehlt aktive Erinnerungen (alle ausser ERLEDIGT) pro Kategorie
 * - Zaehlt ueberfaellige Erinnerungen (faelligAm <= jetzt) pro Kategorie
 * - Erstellt "Ohne Kategorie"-Eintrag fuer Erinnerungen ohne Zuordnung
 * - Gibt leeres Array zurueck wenn keine Kategorien vorhanden (AC4)
 */

import { useMemo } from 'react';
import type { ErinnerungResponseDto } from '@/shared';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';

/**
 * Statistik-Daten fuer eine einzelne Kategorie
 */
export interface KategorieStatistik {
  /** ID der Kategorie (null fuer "Ohne Kategorie") */
  kategorieId: string | null;
  /** Name der Kategorie */
  name: string;
  /** Farbe als Hex-Code */
  farbe: string;
  /** Anzahl aktiver Erinnerungen (Status !== ERLEDIGT) */
  activeCount: number;
  /** Anzahl ueberfaelliger Erinnerungen (aktiv UND faelligAm <= jetzt) */
  overdueCount: number;
}

/** Farbe fuer "Ohne Kategorie" (Tailwind gray-400) */
const OHNE_KATEGORIE_FARBE = '#9CA3AF';

/**
 * Berechnet Kategorie-Statistiken aus Erinnerungen und Kategorien.
 *
 * Reine Berechnungsfunktion ohne React-Abhaengigkeit.
 * Wird intern vom Hook verwendet, aber auch direkt exportiert fuer Tests.
 *
 * @param erinnerungen - Alle Erinnerungen (ungefiltert)
 * @param kategorien - Verfuegbare Kategorien
 * @returns Array von KategorieStatistik pro Kategorie (+ "Ohne Kategorie")
 */
export function calculateKategorieStatistik(erinnerungen: ErinnerungResponseDto[], kategorien: KategorieResponseDto[]): KategorieStatistik[] {
  if (kategorien.length === 0) {
    return [];
  }

  const now = Date.now();

  // Map fuer schnellen Zugriff: kategorieId -> { activeCount, overdueCount }
  const countsMap = new Map<string | null, { activeCount: number; overdueCount: number }>();

  // Initialisiere Zaehler fuer alle Kategorien
  for (const kategorie of kategorien) {
    countsMap.set(kategorie.id, { activeCount: 0, overdueCount: 0 });
  }
  // "Ohne Kategorie" Zaehler
  countsMap.set(null, { activeCount: 0, overdueCount: 0 });

  // Zaehle Erinnerungen
  for (const erinnerung of erinnerungen) {
    // ERLEDIGT zaehlt nicht als aktiv
    if (erinnerung.status === 'ERLEDIGT') {
      continue;
    }

    // kategorieId ist im generierten Client als `object | null` typisiert
    const katId = erinnerung.kategorieId as string | null | undefined;
    const key = katId ?? null;

    const counts = countsMap.get(key);
    if (counts) {
      counts.activeCount++;
      if (new Date(erinnerung.faelligAm).getTime() <= now) {
        counts.overdueCount++;
      }
    } else {
      // Unbekannte Kategorie -> "Ohne Kategorie" zuordnen
      const ohneKategorie = countsMap.get(null);
      if (ohneKategorie) {
        ohneKategorie.activeCount++;
        if (new Date(erinnerung.faelligAm).getTime() <= now) {
          ohneKategorie.overdueCount++;
        }
      }
    }
  }

  // Ergebnis-Array aufbauen
  const result: KategorieStatistik[] = kategorien.map((kategorie) => {
    const counts = countsMap.get(kategorie.id) ?? { activeCount: 0, overdueCount: 0 };
    return {
      kategorieId: kategorie.id,
      name: kategorie.name,
      farbe: kategorie.farbe,
      activeCount: counts.activeCount,
      overdueCount: counts.overdueCount,
    };
  });

  // "Ohne Kategorie" hinzufuegen
  const ohneKategorieCounts = countsMap.get(null) ?? { activeCount: 0, overdueCount: 0 };
  result.push({
    kategorieId: null,
    name: 'Ohne Kategorie',
    farbe: OHNE_KATEGORIE_FARBE,
    activeCount: ohneKategorieCounts.activeCount,
    overdueCount: ohneKategorieCounts.overdueCount,
  });

  return result;
}

/**
 * Hook fuer Kategorie-Statistiken
 *
 * Berechnet pro Kategorie die Anzahl aktiver und ueberfaelliger Erinnerungen.
 * Nutzt `useMemo` fuer reaktive Neuberechnung bei Aenderungen.
 *
 * @param erinnerungen - Alle Erinnerungen (ungefiltert, ALLE Status)
 * @param kategorien - Verfuegbare Kategorien des Einsatzes
 * @returns Array von KategorieStatistik (inkl. "Ohne Kategorie")
 *
 * @example
 * ```tsx
 * const statistiken = useKategorieStatistik(erinnerungen, kategorien);
 * // => [{ kategorieId: 'kat-1', name: 'Logistik', farbe: '#FF0000', activeCount: 5, overdueCount: 2 }, ...]
 * ```
 */
export function useKategorieStatistik(erinnerungen: ErinnerungResponseDto[], kategorien: KategorieResponseDto[]): KategorieStatistik[] {
  return useMemo(() => calculateKategorieStatistik(erinnerungen, kategorien), [erinnerungen, kategorien]);
}
