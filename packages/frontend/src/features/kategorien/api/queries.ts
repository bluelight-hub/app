import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

/**
 * Query Keys fuer Kategorien (Story 8.1).
 */
export const KATEGORIE_QUERY_KEYS = {
  all: ['kategorien'] as const,
  lists: () => [...KATEGORIE_QUERY_KEYS.all, 'list'] as const,
  list: (einsatzId: string) => [...KATEGORIE_QUERY_KEYS.lists(), einsatzId] as const,
};

/**
 * Laedt alle Kategorien eines Einsatzes.
 */
export const useKategorienByEinsatz = (einsatzId: string) => {
  return useQuery({
    queryKey: KATEGORIE_QUERY_KEYS.list(einsatzId),
    queryFn: async () => {
      const response = await api.kategorien().kategorieControllerGetByEinsatzVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
  });
};
