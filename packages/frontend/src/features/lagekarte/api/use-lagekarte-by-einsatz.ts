import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type LagekarteControllerGetLagekarteVAlpha200Response } from '@bluelight-hub/shared/client';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * TanStack Query Hook zum Abrufen der Lagekarte eines Einsatzes
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query result mit Lagekarten-Daten, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query für automatisches Caching und Refetching
 * - Query Key: `LAGEKARTE_QUERY_KEYS.lagekarte(einsatzId)`
 * - 404 Handling: Gibt `undefined` zurück wenn Lagekarte nicht existiert (kein Error-Toast)
 * - Backend: Wirft NotFoundException wenn Lagekarte nicht gefunden
 *
 * @example
 * ```tsx
 * const { data: lagekarte, isLoading } = useLagekarteByEinsatz('einsatz-123');
 * // data ist undefined wenn Lagekarte noch nicht erstellt wurde
 * ```
 */
export const useLagekarteByEinsatz = (einsatzId: string): UseQueryResult<LagekarteControllerGetLagekarteVAlpha200Response | undefined, Error> => {
  return useQuery({
    queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      try {
        return await api.lagekarte().lagekarteControllerGetLagekarteVAlpha({ einsatzId });
      } catch (error) {
        // 404 ist kein Fehler - Lagekarte existiert einfach noch nicht
        // Kein Toast, kein Error - return undefined
        const statusCode = (error as { status?: number })?.status || (error as { response?: { status?: number } })?.response?.status;

        if (statusCode === 404) {
          return undefined;
        }

        throw error;
      }
    },
    enabled: !!einsatzId, // Nur fetchen wenn einsatzId vorhanden
    retry: (failureCount, error) => {
      // Kein Retry bei 404
      const statusCode = (error as { status?: number })?.status || (error as { response?: { status?: number } })?.response?.status;
      if (statusCode === 404) return false;
      return failureCount < 3;
    },
    networkMode: 'offlineFirst', // Enable offline-first mode (AC: IV2)
  });
};
