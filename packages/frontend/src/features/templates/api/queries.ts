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
export const useVorlagen = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: VORLAGE_QUERY_KEYS.list(),
    queryFn: async () => {
      const response = await api.erinnerungsvorlagen().erinnerungsvorlageControllerGetAllVAlpha();
      return response.data;
    },
    enabled: options?.enabled,
  });
};

/**
 * Query Keys fuer Fuehrungsrhythmus-Templates (Story 6.6).
 */
export const FR_TEMPLATE_QUERY_KEYS = {
  all: ['fuehrungsrhythmus-templates'] as const,
  list: () => [...FR_TEMPLATE_QUERY_KEYS.all, 'list'] as const,
};

/**
 * Hook: Alle Fuehrungsrhythmus-Templates laden (Story 6.6).
 */
export const useFuehrungsrhythmusTemplates = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: FR_TEMPLATE_QUERY_KEYS.list(),
    queryFn: async () => {
      const response = await api.fuehrungsrhythmusTemplates().fuehrungsrhythmusTemplateControllerGetAllVAlpha();
      return response.data;
    },
    enabled: options?.enabled,
  });
};
