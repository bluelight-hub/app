/**
 * Query Hook fuer Befehlshistorie-Timeline
 *
 * Laedt die vollstaendige Historie eines Befehls als Timeline.
 * Lazy-Loading: Nur wenn befehlId vorhanden ist.
 */

import { api } from '@/shared';
import type { BefehlHistorieTimelineDto } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS } from './queries';

/**
 * Hook zum Laden der Befehlshistorie-Timeline
 *
 * @param befehlId - Befehl-ID fuer die Abfrage (undefined deaktiviert die Query)
 * @returns TanStack Query Result mit BefehlHistorieTimelineDto
 */
export function useBefehlHistorie(befehlId: string | undefined) {
  const resolvedBefehlId = befehlId ?? '';

  return useQuery<BefehlHistorieTimelineDto>({
    queryKey: BEFEHL_QUERY_KEYS.historie(resolvedBefehlId),
    queryFn: async () => {
      if (!befehlId) {
        throw new Error('Befehl-ID fehlt für Historie-Abfrage');
      }

      const response = await api.befehle().befehlControllerGetHistorieVAlpha({ id: befehlId });
      return response.data;
    },
    enabled: Boolean(befehlId),
  });
}
