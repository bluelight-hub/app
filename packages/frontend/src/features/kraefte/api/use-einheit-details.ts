/**
 * Hook für die Abfrage der Details einer einzelnen taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Lädt die Detailansicht einer Einheit inkl. zugewiesener Personen
 * und aufgelöstem Einheitenführer.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { EinsatzEinheitDetailsDto } from '@/shared';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook für die Abfrage der Einheit-Details.
 *
 * **Features:**
 * - Disabled wenn einsatzId oder einheitId nicht vorhanden
 * - Exponential Backoff bei Fehlern
 * - Enthält zugewiesene Personen und Einheitenführer
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @param einheitId - Die Einheit-ID (optional)
 * @returns TanStack Query Result mit Einheit-Details
 *
 * @example
 * ```tsx
 * const { data } = useEinheitDetails(einsatzId, einheitId);
 * ```
 */
export const useEinheitDetails = (einsatzId: string | undefined, einheitId: string | undefined) => {
  // IDs sind garantiert definiert wenn Query ausgeführt wird (enabled: !!einsatzId && !!einheitId)
  const eId = einsatzId as string;
  const einId = einheitId as string;

  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.einheitDetails(eId, einId),
    queryFn: async (): Promise<EinsatzEinheitDetailsDto> => {
      try {
        const response = await api.einsatzEinheiten().einsatzEinheitenControllerFindOneVAlpha({
          einsatzId: eId,
          id: einId,
        });

        return response.data;
      } catch (error) {
        logger.error('Fehler beim Laden der Einheit-Details', error);
        throw error;
      }
    },
    enabled: !!einsatzId && !!einheitId,
    staleTime: 30_000, // 30 Sekunden
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
