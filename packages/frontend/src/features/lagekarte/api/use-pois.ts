import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import type { PoiDto } from '@bluelight-hub/shared/client';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * TanStack Query Hook zum Abrufen aller POIs einer Lagekarte
 *
 * @param lagekarteId - Die ID der Lagekarte
 * @returns Query result mit POI-Daten, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query für automatisches Caching und Refetching
 * - Query Key: `LAGEKARTE_QUERY_KEYS.pois(lagekarteId)`
 * - Nutzt die neue LagekarteCQRS API für POI-Operationen
 *
 * @example
 * ```tsx
 * const { data: pois, isLoading, error } = usePois('lagekarte-123');
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return pois?.map(poi => <PoiMarker key={poi.id} poi={poi} />);
 * ```
 */
export const usePois = (lagekarteId: string | undefined): UseQueryResult<PoiDto[], Error> => {
  return useQuery({
    queryKey: LAGEKARTE_QUERY_KEYS.pois(lagekarteId ?? ''),
    queryFn: async () => {
      if (!lagekarteId) return [];
      return await api.lagekarteCqrs().lagekarteCqrsControllerGetPoisVAlpha({ lagekarteId });
    },
    enabled: !!lagekarteId, // Nur fetchen wenn lagekarteId vorhanden
  });
};
