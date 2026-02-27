/**
 * Hook fuer die Befehlsgeber-Suche (Vorschlaege + EinsatzPersonen).
 *
 * Kombiniert admin-konfigurierte Vorschlaege mit EinsatzPersonen
 * in einem gruppierten Ergebnis fuer die Befehlsgeber-Combobox.
 */

import { api } from '@/shared';
import type { BefehlsgeberSucheResultDto } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS } from './queries';

export function useBefehlsgeberSuche(einsatzId: string, searchTerm: string, enabled = true) {
  return useQuery<BefehlsgeberSucheResultDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.befehlsgeberSuche(einsatzId, searchTerm),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerBefehlsgeberSucheVAlpha({
        einsatzId,
        q: searchTerm || undefined,
      });
      return response.data;
    },
    enabled,
    staleTime: 60_000,
  });
}
