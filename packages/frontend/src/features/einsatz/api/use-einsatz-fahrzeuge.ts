/**
 * Query Hook für EinsatzFahrzeuge
 *
 * Lädt alle Fahrzeuge eines Einsatzes.
 *
 * @module features/einsatz/api
 */

import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto, ResponseError } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Hook zum Laden aller EinsatzFahrzeuge eines Einsatzes
 *
 * Verwendet hierarchische Query Keys für granulare Cache-Invalidierung.
 * Bei Fehlern werden automatisch Retries mit Exponential Backoff durchgeführt.
 *
 * @param einsatzId - UUID des Einsatzes
 * @param options - Optionale Query-Optionen (enabled, staleTime, etc.)
 * @returns TanStack Query Result mit EinsatzFahrzeugDto Array
 *
 * @example
 * ```tsx
 * const { data: fahrzeuge, isLoading, error } = useEinsatzFahrzeuge(einsatzId);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <ul>
 *     {fahrzeuge?.map((fz) => (
 *       <li key={fz.id}>{fz.funkrufname}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export const useEinsatzFahrzeuge = (einsatzId: string | null, options?: { enabled?: boolean }) => {
  return useQuery<EinsatzFahrzeugDto[], ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId ?? ''),
    queryFn: async () => {
      if (!einsatzId) {
        return [];
      }
      logger.debug('Fetching EinsatzFahrzeuge', { einsatzId });
      // WrappedResponse: { data: [...], meta: {...} }
      const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerFindAllVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId && (options?.enabled ?? true),
    staleTime: 30_000, // 30 Sekunden
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
