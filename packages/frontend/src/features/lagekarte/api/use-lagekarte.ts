import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { LAGEKARTE_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Laden der Lagekarte für einen Einsatz
 *
 * @param einsatzId - Einsatz-ID
 * @returns TanStack Query Result mit Lagekarte-Daten (GeoJSON FeatureCollection)
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useLagekarte(einsatzId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return <DrawingLayer initialState={data} />;
 * ```
 */
export const useLagekarte = (einsatzId: string) => {
  return useQuery({
    queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.lagekarte.lagekarteControllerGetLagekarteVAlpha({
        einsatzId,
      });

      // API liefert LagekarteDto mit `state: GeoJSON.FeatureCollection`
      return response.state;
    },
    // Stale Time: 30 Sekunden (Lagekarte ändert sich häufig)
    staleTime: 30_000,
    // Cache Time: 5 Minuten
    gcTime: 5 * 60 * 1000,
    // Retry mit Exponential Backoff
    retry: 3,
    retryDelay: calculateRetryDelay,
    // Refetch on Window Focus (wichtig für kollaboratives Arbeiten)
    refetchOnWindowFocus: true,
  });
};
