/**
 * Query-Hooks für Gefahrenzonen (Issue #627, G2).
 *
 * Gibt die Zonen eines Einsatzes mit abgeleiteter Matrix-Warnstufe zurück.
 * Die Source-of-Truth für die Warnstufe ist die Gefahrenmatrix; der Query
 * liefert den pro-Zone aufgelösten Wert aus dem Backend-Join.
 */

import { useQuery } from '@tanstack/react-query';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared';

export const GEFAHRENZONE_QUERY_KEYS = {
  all: ['gefahrenzonen'] as const,
  byEinsatz: (einsatzId: string) => [...GEFAHRENZONE_QUERY_KEYS.all, einsatzId] as const,
};

/**
 * Lädt alle Gefahrenzonen eines Einsatzes.
 *
 * Die Zonen werden über WebSocket-Invalidation (siehe `use-gefahrenzone-websocket.ts`)
 * aktuell gehalten, sodass `refetchInterval` nicht benötigt wird.
 */
export function useGefahrenzonen(einsatzId: string) {
  return useQuery<GefahrenzoneDto[]>({
    queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.gefahrenzonen().gefahrenzoneControllerListVAlpha({ einsatzId });
      return response.data.zonen;
    },
    enabled: !!einsatzId,
    staleTime: 30_000,
  });
}
