/**
 * Hook für die Abfrage der taktischen Einheiten eines Einsatzes.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Lädt alle taktischen Einheiten (Trupps, Staffeln, Gruppen, Züge, Abschnitte)
 * mit ihrer hierarchischen Zuordnung für die Baumdarstellung.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { EinsatzEinheitDto } from '@/shared';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Options für useEinsatzEinheiten Hook.
 */
export interface UseEinsatzEinheitenOptions {
  /** Auto-Refresh Interval in ms. false = deaktiviert. Default: false */
  refetchInterval?: number | false;
}

/**
 * Hook für die Abfrage der taktischen Einheiten eines Einsatzes.
 *
 * **Features:**
 * - Auto-Refresh konfigurierbar
 * - Disabled wenn keine einsatzId vorhanden
 * - Exponential Backoff bei Fehlern
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @param options - Konfigurationsoptionen (refetchInterval)
 * @returns TanStack Query Result mit Einheiten-Array
 *
 * @example
 * ```tsx
 * const { data } = useEinsatzEinheiten(einsatzId);
 * ```
 */
export const useEinsatzEinheiten = (einsatzId: string | undefined, options?: UseEinsatzEinheitenOptions) => {
  // einsatzId ist garantiert definiert wenn Query ausgeführt wird (enabled: !!einsatzId)
  const id = einsatzId as string;

  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.einheiten(id),
    queryFn: async (): Promise<EinsatzEinheitDto[]> => {
      try {
        const response = await api.einsatzEinheiten().einsatzEinheitenControllerFindAllVAlpha({
          einsatzId: id,
        });

        // Daten aus Wrapped Response extrahieren
        const data = response.data;
        if (!data) {
          return [];
        }

        return data;
      } catch (error) {
        logger.error('Fehler beim Laden der taktischen Einheiten', error);
        throw error;
      }
    },
    enabled: !!einsatzId,
    staleTime: 30_000, // 30 Sekunden
    refetchInterval: options?.refetchInterval ?? false,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
