import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { PoiDto, UpdatePoiPositionDto } from '@bluelight-hub/shared/client';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * TanStack Mutation Hook zum Aktualisieren der Position eines POI
 *
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Mutation-Data enthält `{ poiId: string, lagekarteId: string, data: UpdatePoiPositionDto }`
 * - Nach Update wird die POI-Liste invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `LAGEKARTE_QUERY_KEYS.pois(lagekarteId)` Query
 *
 * @example
 * ```tsx
 * const updatePoiMutation = useUpdatePoi();
 *
 * updatePoiMutation.mutate({
 *   poiId: 'poi-123',
 *   lagekarteId: 'lagekarte-456',
 *   data: { coordinate: { lat: 51.2, lng: 10.2 } },
 * });
 * ```
 */
export const useUpdatePoi = (): UseMutationResult<PoiDto, Error, { poiId: string; lagekarteId: string; data: UpdatePoiPositionDto }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poiId, lagekarteId, data }) => {
      return await api.lagekarteCqrs().lagekarteCqrsControllerUpdatePoiPositionVAlpha({ lagekarteId, poiId, updatePoiPositionDto: data });
    },
    onSuccess: (_data, variables) => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: LAGEKARTE_QUERY_KEYS.pois(variables.lagekarteId) });
    },
  });
};
