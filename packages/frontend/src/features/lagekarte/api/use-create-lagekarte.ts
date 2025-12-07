import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api, type CreateLagekarteDto, type LagekarteDto } from '@bluelight-hub/shared/client';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * TanStack Mutation Hook zum Erstellen einer Lagekarte
 *
 * @param einsatzId - Die ID des Einsatzes (für Query Invalidation)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query Mutation für Lagekarte-Erstellung
 * - Nach erfolgreicher Erstellung wird die Lagekarte-Query invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId)` Query
 *
 * @example
 * ```tsx
 * const createLagekarteMutation = useCreateLagekarte('einsatz-123');
 *
 * createLagekarteMutation.mutate({
 *   einsatzId: 'einsatz-123',
 * });
 * ```
 */
export const useCreateLagekarte = (einsatzId: string): UseMutationResult<LagekarteDto, Error, CreateLagekarteDto> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLagekarteDto) => {
      return await api.lagekarteCqrs().lagekarteCqrsControllerCreateLagekarteVAlpha({ createLagekarteDto: data });
    },
    onSuccess: () => {
      // Invalidate Lagekarte-Query um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId) });
    },
  });
};
