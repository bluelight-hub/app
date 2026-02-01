import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { VORLAGE_QUERY_KEYS } from './queries';
import type { CreateErinnerungsvorlageDto } from '@bluelight-hub/shared/client';

export interface CreateVorlageVariables {
  data: CreateErinnerungsvorlageDto;
}

/**
 * Hook: Neue Erinnerungsvorlage erstellen.
 */
export const useCreateVorlage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: CreateVorlageVariables) => {
      const response = await api.erinnerungsvorlagen().erinnerungsvorlageControllerCreateVAlpha({
        createErinnerungsvorlageDto: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VORLAGE_QUERY_KEYS.all });
    },
  });
};
