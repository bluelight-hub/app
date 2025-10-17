import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { LagekarteControllerGetLagekarteVAlpha200Response, PoiControllerGetPoisVAlpha200Response, PoiResponseDto } from '@bluelight-hub/shared/client';
import { api } from '../api';

/**
 * TanStack Query Hook zum Abrufen aller POIs einer Lagekarte
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query result mit POI-Daten, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query für automatisches Caching und Refetching
 * - Query Key: `['pois', einsatzId]`
 * - Die API returned POIs im `data` Array der Response als `PoiResponseDto[]`
 * - `PoiResponseDto` ist der generierte Typ aus dem Backend
 *
 * @example
 * ```tsx
 * const { data: pois, isLoading, error } = usePois('einsatz-123');
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return pois?.map(poi => <PoiMarker key={poi.id} poi={poi} />);
 * ```
 */
export const usePois = (einsatzId: string): UseQueryResult<PoiResponseDto[], Error> => {
  return useQuery({
    queryKey: ['pois', einsatzId],
    queryFn: async () => {
      const response: PoiControllerGetPoisVAlpha200Response = await api.poi().poiControllerGetPoisVAlpha({ einsatzId });
      // Response hat Struktur: { data: PoiResponseDto[], meta: {}, pagination?: {} }
      return response.data;
    },
    enabled: !!einsatzId, // Nur fetchen wenn einsatzId vorhanden
  });
};

/**
 * TanStack Query Hook zum Abrufen der Lagekarte eines Einsatzes
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query result mit Lagekarten-Daten, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query für automatisches Caching und Refetching
 * - Query Key: `['lagekarte', einsatzId]`
 * - Lazy Creation: API erstellt Lagekarte automatisch falls nicht vorhanden
 *
 * @example
 * ```tsx
 * const { data: lagekarte, isLoading } = useLagekarte('einsatz-123');
 * ```
 */
export const useLagekarte = (einsatzId: string): UseQueryResult<LagekarteControllerGetLagekarteVAlpha200Response, Error> => {
  return useQuery({
    queryKey: ['lagekarte', einsatzId],
    queryFn: async () => {
      return await api.lagekarte().lagekarteControllerGetLagekarteVAlpha({ einsatzId });
    },
    enabled: !!einsatzId, // Nur fetchen wenn einsatzId vorhanden
  });
};
