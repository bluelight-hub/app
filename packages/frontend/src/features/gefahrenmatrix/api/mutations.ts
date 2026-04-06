import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { UpdateGefahrenmatrixDto } from '@bluelight-hub/shared/client';
import { GEFAHRENMATRIX_QUERY_KEYS } from './queries';

export interface UpdateBewertungVariables {
  einsatzId: string;
  data: UpdateGefahrenmatrixDto;
}

/**
 * Mutation zum Aktualisieren einer Bewertung in der Gefahrenmatrix.
 */
export const useUpdateGefahrenmatrixBewertung = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, data }: UpdateBewertungVariables) => {
      const response = await api.gefahrenmatrix().gefahrenmatrixControllerUpdateBewertungVAlpha({
        einsatzId,
        updateGefahrenmatrixDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: GEFAHRENMATRIX_QUERY_KEYS.byEinsatz(variables.einsatzId) });
    },
  });
};
