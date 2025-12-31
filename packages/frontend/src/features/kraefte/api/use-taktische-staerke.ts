/**
 * Hook für die Abfrage der taktischen Stärke eines Einsatzes.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Lädt Führung/Unterführung/Mannschaft/Gesamt für das Dashboard.
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * refetchInterval ist konfigurierbar (AC3: nur in Fullscreen aktiv).
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Interface für die taktische Stärke
 */
export interface TaktischeStaerke {
  /** Anzahl Führungskräfte (Leiter, LNA, OrgL, Zugführer, Ärzte) */
  fuehrung: number;
  /** Anzahl Unterführer (Gruppenführer, Truppführer) */
  unterfuehrung: number;
  /** Anzahl Mannschaftsmitglieder (alle anderen Helfer) */
  mannschaft: number;
  /** Gesamtanzahl aller eingesetzten Kräfte */
  gesamt: number;
}

/**
 * Options für useTaktischeStaerke Hook.
 *
 * Story 6.2: refetchInterval ist konfigurierbar für Fullscreen-Modus.
 */
export interface UseTaktischeStaerkeOptions {
  /** Auto-Refresh Interval in ms. false = deaktiviert. Default: false */
  refetchInterval?: number | false;
}

/**
 * Hook für die Abfrage der taktischen Stärke.
 *
 * **Features:**
 * - Auto-Refresh konfigurierbar (Story 6.2: AC3 - nur in Fullscreen aktiv)
 * - Disabled wenn keine einsatzId vorhanden
 * - Exponential Backoff bei Fehlern
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @param options - Konfigurationsoptionen (refetchInterval)
 * @returns TanStack Query Result mit Stärke-Daten
 *
 * @example
 * ```tsx
 * // Standard (kein Auto-Refresh)
 * const { data } = useTaktischeStaerke(einsatzId);
 *
 * // Fullscreen-Modus (AC3: Auto-Refresh alle 30s)
 * const { data } = useTaktischeStaerke(einsatzId, { refetchInterval: 30000 });
 * ```
 */
export const useTaktischeStaerke = (einsatzId: string | undefined, options?: UseTaktischeStaerkeOptions) => {
  // einsatzId ist garantiert definiert wenn Query ausgeführt wird (enabled: !!einsatzId)
  const id = einsatzId as string;

  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.staerke(id),
    queryFn: async (): Promise<TaktischeStaerke> => {
      try {
        const response = await api.kraefteDashboard().kraefteDashboardControllerGetTaktischeStaerkeVAlpha({
          einsatzId: id,
        });

        // Extract data from wrapped response
        const data = response.data;
        if (!data) {
          throw new Error('Keine Daten in der Antwort');
        }

        return {
          fuehrung: data.fuehrung,
          unterfuehrung: data.unterfuehrung,
          mannschaft: data.mannschaft,
          gesamt: data.gesamt,
        };
      } catch (error) {
        logger.error('Fehler beim Laden der taktischen Stärke', error);
        throw error;
      }
    },
    enabled: !!einsatzId,
    staleTime: 30_000, // 30 Sekunden
    refetchInterval: options?.refetchInterval ?? false, // Story 6.2: Konfigurierbar
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
