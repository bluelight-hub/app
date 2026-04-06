import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

export const GEFAHRENMATRIX_QUERY_KEYS = {
  all: ['gefahrenmatrix'] as const,
  byEinsatz: (einsatzId: string) => [...GEFAHRENMATRIX_QUERY_KEYS.all, einsatzId] as const,
};

/**
 * Lädt die Gefahrenmatrix eines Einsatzes.
 */
export const useGefahrenmatrix = (einsatzId: string, options?: { refetchInterval?: number }) => {
  return useQuery({
    queryKey: GEFAHRENMATRIX_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.gefahrenmatrix().gefahrenmatrixControllerGetVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
    refetchInterval: options?.refetchInterval,
  });
};
