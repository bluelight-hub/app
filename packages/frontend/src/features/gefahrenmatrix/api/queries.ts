import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

export const GEFAHRENMATRIX_QUERY_KEYS = {
  all: ['gefahrenmatrix'] as const,
  byEinsatz: (einsatzId: string) => [...GEFAHRENMATRIX_QUERY_KEYS.all, einsatzId] as const,
};

/**
 * Lädt die Gefahrenmatrix eines Einsatzes.
 */
export const useGefahrenmatrix = (einsatzId: string) => {
  return useQuery({
    queryKey: GEFAHRENMATRIX_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      return await api.gefahrenmatrix().gefahrenmatrixControllerGetVAlpha({ einsatzId });
    },
    enabled: !!einsatzId,
  });
};
