/**
 * Hook fuer Erinnerungs-Uebersicht Statistiken
 *
 * Berechnet Status-Counts in einem einzigen Durchlauf.
 * Reine Berechnungsfunktion exportiert fuer isolierte Unit-Tests.
 *
 * **Story 9.1 Task 7:**
 * - Clientseitige Berechnung via useMemo (Echtzeit-reaktiv)
 * - Pattern analog zu useKategorieStatistik
 */

import { useMemo } from 'react';
import type { ErinnerungResponseDto } from '@/shared';

/** Aktive Status (alle ausser ERLEDIGT) */
const ACTIVE_STATUSES = new Set(['GEPLANT', 'AUSGELOEST', 'ACKNOWLEDGED', 'SNOOZED', 'ESKALIERT']);

/** Statistik-Daten fuer die Erinnerungs-Uebersicht */
export interface ErinnerungUebersichtStats {
  /** Gesamtanzahl (alle nicht-gelöschten) */
  total: number;
  /** Anzahl mit Status ACKNOWLEDGED */
  acknowledged: number;
  /** Anzahl mit Status ESKALIERT */
  eskaliert: number;
  /** Anzahl mit Status ERLEDIGT */
  erledigt: number;
  /** Anzahl aktiver (GEPLANT, AUSGELOEST, ACKNOWLEDGED, SNOOZED, ESKALIERT) */
  active: number;
}

/**
 * Berechnet Erinnerungs-Status-Statistiken in einem einzigen Durchlauf.
 *
 * Reine Funktion ohne React-Abhaengigkeit.
 * Exportiert fuer isolierte Unit-Tests.
 */
export function calculateErinnerungUebersichtStats(erinnerungen: ErinnerungResponseDto[]): ErinnerungUebersichtStats {
  const result: ErinnerungUebersichtStats = { total: erinnerungen.length, acknowledged: 0, eskaliert: 0, erledigt: 0, active: 0 };

  for (const e of erinnerungen) {
    if (e.status === 'ACKNOWLEDGED') result.acknowledged++;
    if (e.status === 'ESKALIERT') result.eskaliert++;
    if (e.status === 'ERLEDIGT') result.erledigt++;
    if (ACTIVE_STATUSES.has(e.status)) result.active++;
  }

  return result;
}

/**
 * Hook fuer Erinnerungs-Uebersicht Statistiken
 *
 * @param erinnerungen - Alle Erinnerungen (ungefiltert)
 * @returns ErinnerungUebersichtStats mit reaktiver Neuberechnung
 */
export function useErinnerungUebersichtStatistik(erinnerungen: ErinnerungResponseDto[]): ErinnerungUebersichtStats {
  return useMemo(() => calculateErinnerungUebersichtStats(erinnerungen), [erinnerungen]);
}
