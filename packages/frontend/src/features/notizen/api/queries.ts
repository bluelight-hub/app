import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

/**
 * Query Keys fuer Notizen.
 */
export const NOTIZ_QUERY_KEYS = {
  all: ['notizen'] as const,
  lists: () => [...NOTIZ_QUERY_KEYS.all, 'list'] as const,
  list: (einsatzId: string) => [...NOTIZ_QUERY_KEYS.lists(), einsatzId] as const,
};

/**
 * Laedt alle Notizen eines Einsatzes.
 */
export const useNotizenByEinsatz = (einsatzId: string) => {
  return useQuery({
    queryKey: NOTIZ_QUERY_KEYS.list(einsatzId),
    queryFn: async () => {
      const response = await api.notizen().notizControllerGetByEinsatzVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
  });
};
