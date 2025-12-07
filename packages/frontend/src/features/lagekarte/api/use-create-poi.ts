import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api, type AddPoiDto, type PoiDto } from '@bluelight-hub/shared/client';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * TanStack Mutation Hook zum Erstellen eines POI
 *
 * @param lagekarteId - Die ID der Lagekarte (für Query Invalidation)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query Mutation für optimistic updates
 * - Nach erfolgreicher Erstellung wird die POI-Liste neu gefetcht (invalidateQueries)
 * - Mutation Key: keine (einmaliger API-Call)
 * - OnSuccess: Invalidiert `LAGEKARTE_QUERY_KEYS.pois(lagekarteId)` Query
 *
 * @example
 * ```tsx
 * const createPoiMutation = useCreatePoi('lagekarte-456');
 *
 * createPoiMutation.mutate({
 *   name: 'Einsatzstelle',
 *   coordinate: { lat: 51.1, lng: 10.1 },
 *   category: 'EINSATZSTELLE',
 * });
 * ```
 */
export const useCreatePoi = (lagekarteId: string): UseMutationResult<PoiDto, Error, AddPoiDto> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddPoiDto) => {
      return await api.lagekarteCqrs().lagekarteCqrsControllerAddPoiVAlpha({ lagekarteId, addPoiDto: data });
    },
    onSuccess: () => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: LAGEKARTE_QUERY_KEYS.pois(lagekarteId) });
    },
  });
};
