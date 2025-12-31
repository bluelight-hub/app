/**
 * Hook für die Abfrage der Fahrzeuge eines Einsatzes.
 *
 * **Story 6.1b - Fahrzeug-Status Liste:**
 * Lädt alle Fahrzeuge mit FMS-Status und Besatzung für das Dashboard.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto } from '@bluelight-hub/shared/client';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook für die Abfrage der Einsatz-Fahrzeuge.
 *
 * **Features:**
 * - Auto-Refresh alle 30 Sekunden (AC5: Live-Updates)
 * - Disabled wenn keine einsatzId vorhanden
 * - Exponential Backoff bei Fehlern
 * - Fahrzeuge nach Zuordnungszeitpunkt sortiert (älteste zuerst, AC1)
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @returns TanStack Query Result mit Fahrzeug-Array
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useEinsatzFahrzeuge(einsatzId);
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage />;
 *
 * return <FahrzeugStatusListe fahrzeuge={data} />;
 * ```
 */
export const useEinsatzFahrzeuge = (einsatzId: string | undefined) => {
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
    refetchInterval: 30_000, // Auto-Refresh für Dashboard
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
