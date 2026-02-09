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
 * Hook: Alle globalen Fuehrungsrhythmus-Templates laden (Admin).
 */
export const useGlobalFuehrungsrhythmusTemplates = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...FR_TEMPLATE_QUERY_KEYS.list(), 'GLOBAL'],
    queryFn: async () => {
      const response = await api.fuehrungsrhythmusTemplatesAdmin().fuehrungsrhythmusTemplateControllerGetAllVAlpha();
      return response.data;
    },
    enabled: options?.enabled,
  });
};

/**
 * Hook: Alle Einsatz-spezifischen Fuehrungsrhythmus-Templates laden.
 */
export const useEinsatzFuehrungsrhythmusTemplates = (einsatzId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...FR_TEMPLATE_QUERY_KEYS.list(), 'EINSATZ', einsatzId],
    queryFn: async () => {
      const response = await api.einsatzFuehrungsrhythmusTemplates().einsatzFuehrungsrhythmusTemplateControllerGetAllVAlpha({ einsatzId });
      return response.data;
    },
    enabled: options?.enabled,
  });
};
