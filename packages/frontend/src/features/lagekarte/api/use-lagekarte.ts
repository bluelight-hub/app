import { useQuery } from '@tanstack/react-query';
import type * as GeoJSON from 'geojson';
import type { LagekarteDto } from '@bluelight-hub/shared/client';
import { api } from '@bluelight-hub/shared/client';
import { LAGEKARTE_QUERY_KEYS, calculateRetryDelay } from './queries';

type LagekarteWithState = LagekarteDto & {
  state: GeoJSON.FeatureCollection;
};

const createEmptyFeatureCollection = (): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

/**
 * Hook zum Laden der Lagekarte für einen Einsatz
 *
 * @param einsatzId - Einsatz-ID
 * @returns TanStack Query Result mit Lagekarte-Daten inkl. GeoJSON-`state`
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useLagekarte(einsatzId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return <DrawingLayer initialState={data?.state} />;
 * ```
 */
export const useLagekarte = (einsatzId: string) => {
  return useQuery<LagekarteWithState | null>({
    queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.lagekarte().lagekarteControllerGetLagekarteVAlpha({
        einsatzId,
      });

      if (!response) {
        return null;
      }

      return {
        ...response,
        state: (response as LagekarteWithState).state ?? createEmptyFeatureCollection(),
      };
    },
    enabled: !!einsatzId,
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
