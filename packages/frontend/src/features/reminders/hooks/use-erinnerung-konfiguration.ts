import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { ErinnerungKonfigurationDto, UpdateEskalationsTimeoutDto } from '@bluelight-hub/shared/client';

const QUERY_KEY = ['erinnerung-konfiguration'];

export function useErinnerungKonfiguration() {
  const queryClient = useQueryClient();

  const fetchConfig = async (): Promise<ErinnerungKonfigurationDto> => {
    const response = await api.erinnerung().erinnerungKonfigurationControllerGetConfigVAlpha();
    return response.data;
  };

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConfig,
  });

  const updateTimeoutMutation = useMutation({
    mutationFn: async (dto: UpdateEskalationsTimeoutDto) => {
      await api.erinnerung().erinnerungKonfigurationControllerUpdateTimeoutVAlpha({
        updateEskalationsTimeoutDto: dto,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    updateTimeout: updateTimeoutMutation.mutate,
    isUpdating: updateTimeoutMutation.isPending,
  };
}
