import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { CreatePoiDto, LagekarteControllerGetLagekarteVAlpha200Response, PoiControllerGetPoisVAlpha200Response, PoiResponseDto, UpdatePoiDto } from '@bluelight-hub/shared/client';
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

/**
 * TanStack Mutation Hook zum Erstellen eines POI
 *
 * @param einsatzId - Die ID des Einsatzes (für Query Invalidation)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query Mutation für optimistic updates
 * - Nach erfolgreicher Erstellung wird die POI-Liste neu gefetcht (invalidateQueries)
 * - Mutation Key: keine (einmaliger API-Call)
 * - OnSuccess: Invalidiert `['pois', einsatzId]` Query
 *
 * @example
 * ```tsx
 * const createPoiMutation = useCreatePoi('einsatz-123');
 *
 * createPoiMutation.mutate({
 *   lagekarteId: 'lagekarte-456',
 *   type: 'FAHRZEUG',
 *   name: 'Fahrzeug 1',
 *   latitude: 51.1,
 *   longitude: 10.1,
 * });
 * ```
 */
export const useCreatePoi = (einsatzId: string): UseMutationResult<PoiResponseDto, Error, CreatePoiDto> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePoiDto) => {
      const response = await api.poi().poiControllerCreatePoiVAlpha({ createPoiDto: data });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['pois', einsatzId] });
    },
  });
};

/**
 * TanStack Mutation Hook zum Aktualisieren eines POI
 *
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Mutation-Data enthält `{ id: string, einsatzId: string, data: UpdatePoiDto }`
 * - Nach Update wird die POI-Liste invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `['pois', einsatzId]` Query
 *
 * @example
 * ```tsx
 * const updatePoiMutation = useUpdatePoi();
 *
 * updatePoiMutation.mutate({
 *   id: 'poi-123',
 *   einsatzId: 'einsatz-456',
 *   data: { latitude: 51.2, longitude: 10.2 },
 * });
 * ```
 */
export const useUpdatePoi = (): UseMutationResult<PoiResponseDto, Error, { id: string; einsatzId: string; data: UpdatePoiDto }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.poi().poiControllerUpdatePoiVAlpha({ poiId: id, updatePoiDto: data });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['pois', variables.einsatzId] });
    },
  });
};

/**
 * TanStack Mutation Hook zum Löschen eines POI
 *
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Mutation-Data enthält `{ id: string, einsatzId: string }`
 * - Nach Löschen wird die POI-Liste invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `['pois', einsatzId]` Query
 *
 * @example
 * ```tsx
 * const deletePoiMutation = useDeletePoi();
 *
 * deletePoiMutation.mutate({
 *   id: 'poi-123',
 *   einsatzId: 'einsatz-456',
 * });
 * ```
 */
export const useDeletePoi = (): UseMutationResult<PoiResponseDto, Error, { id: string; einsatzId: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.poi().poiControllerDeletePoiVAlphaRaw({ poiId: id });
      return (await response.value()).data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['pois', variables.einsatzId] });
    },
  });
};
