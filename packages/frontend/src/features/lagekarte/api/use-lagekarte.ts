import { useQuery } from '@tanstack/react-query';
import type * as GeoJSON from 'geojson';
import type { LagekarteDto } from '@/shared';
import { api } from '@/shared';
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
 * @param options - Optionale Konfiguration (z.B. refetchInterval für Polling-Fallback)
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
export const useLagekarte = (einsatzId: string, options?: { refetchInterval?: number | false }) => {
  return useQuery<LagekarteWithState | null>({
    queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.lagekarte().lagekarteControllerGetLagekarteVAlpha({
        einsatzId,
      });

      if (!response?.data) {
        return null;
      }

      return {
        ...response.data,
        state: (response.data.state as GeoJSON.FeatureCollection) ?? createEmptyFeatureCollection(),
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
    // Polling-Fallback: nur aktiv wenn WebSocket nicht verbunden ist
    refetchInterval: options?.refetchInterval ?? false,
  });
};
