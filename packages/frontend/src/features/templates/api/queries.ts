import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

/**
 * Query Keys für Erinnerungsvorlagen.
 */
export const VORLAGE_QUERY_KEYS = {
  all: ['vorlagen'] as const,
  list: () => [...VORLAGE_QUERY_KEYS.all, 'list'] as const,
};

/**
 * Hook: Alle Erinnerungsvorlagen laden.
 */
export const useVorlagen = () => {
  return useQuery({
    queryKey: VORLAGE_QUERY_KEYS.list(),
    queryFn: async () => {
      const response = await api.erinnerungsvorlagen().erinnerungsvorlageControllerGetAllVAlpha();
      return response.data;
    },
  });
};
