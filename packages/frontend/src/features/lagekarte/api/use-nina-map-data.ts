/**
 * TanStack Query Hook für NINA GeoJSON Map-Daten
 *
 * Pollt alle 5 Minuten die NINA-Warnungen als GeoJSON FeatureCollection.
 */

import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/shared/api/api';

export const NINA_GEOJSON_QUERY_KEY = ['lagekarte', 'nina-geojson'] as const;

export function useNinaMapData() {
  return useQuery({
    queryKey: NINA_GEOJSON_QUERY_KEY,
    queryFn: async () => {
      const response = await getApi().warnungen().warnungenControllerGetNinaGeoJsonVAlpha();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
}
