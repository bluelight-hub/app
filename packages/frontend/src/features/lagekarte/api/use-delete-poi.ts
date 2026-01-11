import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/shared';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * TanStack Mutation Hook zum Löschen eines POI
 *
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Mutation-Data enthält `{ poiId: string, lagekarteId: string }`
 * - Nach Löschen wird die POI-Liste invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `LAGEKARTE_QUERY_KEYS.pois(lagekarteId)` Query
 *
 * @example
 * ```tsx
 * const deletePoiMutation = useDeletePoi();
 *
 * deletePoiMutation.mutate({
 *   poiId: 'poi-123',
 *   lagekarteId: 'lagekarte-456',
 * });
 * ```
 */
export const useDeletePoi = (): UseMutationResult<void, Error, { poiId: string; lagekarteId: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poiId, lagekarteId }) => {
      await api.lagekarteCqrs().lagekarteCqrsControllerRemovePoiVAlpha({ lagekarteId, poiId });
    },
    onSuccess: (_data, variables) => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: LAGEKARTE_QUERY_KEYS.pois(variables.lagekarteId) });
    },
  });
};
