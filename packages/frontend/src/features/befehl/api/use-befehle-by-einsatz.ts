/**
 * Query Hook für Befehle eines Einsatzes
 *
 * Lädt alle Befehle eines Einsatzes sortiert nach erteiltAm DESC.
 * Unterstützt optionale Filter-Parameter für server-seitige Filterung.
 * Arbeitet mit den WebSocket Cache Invalidations aus useBefehlWebSocket zusammen.
 */

import { api } from '@/shared';
import type { BefehlDto } from '@/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type BefehleQueryFilters, BEFEHL_QUERY_KEYS, calculateRetryDelay, hasActiveQueryFilters } from './queries';

/**
 * Hook zum Laden aller Befehle eines Einsatzes
 *
 * @param einsatzId - Einsatz-ID für die Abfrage
 * @param filters - Optionale Filter fuer server-seitige Filterung
 * @param enabled - Ob die Query gefeuert werden soll (default: true)
 * @returns TanStack Query Result mit BefehlDto Array
 */
export function useBefehleByEinsatz(einsatzId: string, filters?: BefehleQueryFilters, enabled = true) {
  return useQuery<BefehlDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.list(einsatzId, filters),
    queryFn: async () => {
      const params: Parameters<ReturnType<typeof api.befehle>['befehlControllerFindByEinsatzVAlpha']>[0] = {
        einsatzId,
      };

      if (hasActiveQueryFilters(filters)) {
        if (filters?.status?.length) {
          params.status = filters.status.join(',');
        }
        if (filters?.empfaengerName) {
          params.empfaengerName = filters.empfaengerName;
        }
        if (filters?.befehlsgeberName) {
          params.befehlsgeberName = filters.befehlsgeberName;
        }
        if (filters?.q) {
          params.q = filters.q;
        }
        if (filters?.von) {
          params.von = filters.von;
        }
        if (filters?.bis) {
          params.bis = filters.bis;
        }
      }

      const response = await api.befehle().befehlControllerFindByEinsatzVAlpha(params);
      return response.data;
    },
    enabled: !!einsatzId && enabled,
    placeholderData: keepPreviousData,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
