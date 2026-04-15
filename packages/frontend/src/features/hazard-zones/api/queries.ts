import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

export const HAZARD_ZONES_QUERY_KEYS = {
  all: ['hazard-zones'] as const,
  byEinsatz: (einsatzId: string) => [...HAZARD_ZONES_QUERY_KEYS.all, einsatzId] as const,
};

/**
 * Lädt alle Gefahrenzonen eines Einsatzes (Issue #627).
 */
export const useHazardZones = (einsatzId: string, options?: { refetchInterval?: number }) => {
  return useQuery({
    queryKey: HAZARD_ZONES_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.hazardZones().hazardZoneControllerListVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
    refetchInterval: options?.refetchInterval,
  });
};
