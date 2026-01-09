/**
 * Hook für die Abfrage der Fahrzeuge eines Einsatzes.
 *
 * **Story 6.1b - Fahrzeug-Status Liste:**
 * Lädt alle Fahrzeuge mit FMS-Status und Besatzung für das Dashboard.
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * refetchInterval ist konfigurierbar (AC3: nur in Fullscreen aktiv).
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto } from '@bluelight-hub/shared/client';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Options für useEinsatzFahrzeuge Hook.
 *
 * Story 6.2: refetchInterval ist konfigurierbar für Fullscreen-Modus.
 */
export interface UseEinsatzFahrzeugeOptions {
  /** Auto-Refresh Interval in ms. false = deaktiviert. Default: false */
  refetchInterval?: number | false;
}

/**
 * Hook für die Abfrage der Einsatz-Fahrzeuge.
 *
 * **Features:**
 * - Auto-Refresh konfigurierbar (Story 6.2: AC3 - nur in Fullscreen aktiv)
 * - Disabled wenn keine einsatzId vorhanden
 * - Exponential Backoff bei Fehlern
 * - Fahrzeuge nach Zuordnungszeitpunkt sortiert (älteste zuerst, AC1)
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @param options - Konfigurationsoptionen (refetchInterval)
 * @returns TanStack Query Result mit Fahrzeug-Array
 *
 * @example
 * ```tsx
 * // Standard (kein Auto-Refresh)
 * const { data } = useEinsatzFahrzeuge(einsatzId);
 *
 * // Fullscreen-Modus (AC3: Auto-Refresh alle 30s)
 * const { data } = useEinsatzFahrzeuge(einsatzId, { refetchInterval: 30000 });
 * ```
 */
export const useEinsatzFahrzeuge = (einsatzId: string | undefined, options?: UseEinsatzFahrzeugeOptions) => {
  // einsatzId ist garantiert definiert wenn Query ausgeführt wird (enabled: !!einsatzId)
  const id = einsatzId as string;

  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.fahrzeuge(id),
    queryFn: async (): Promise<EinsatzFahrzeugDto[]> => {
      try {
        const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerFindAllVAlpha({
          einsatzId: id,
        });

        // Extract data from wrapped response
        const data = response.data;
        if (!data) {
          return [];
        }

        // AC1: Fahrzeuge nach Zuordnungszeitpunkt sortiert (älteste zuerst)
        return [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } catch (error) {
        logger.error('Fehler beim Laden der Einsatz-Fahrzeuge', error);
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
