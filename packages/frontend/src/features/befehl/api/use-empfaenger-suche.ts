/**
 * Hook fuer die Empfaenger-Suche in Kraefte-Stammdaten.
 *
 * Durchsucht EinsatzPersonen und StammPersonen fuer die Empfaenger-Auswahl.
 * Suche ist immer aktiv — bei leerem Query liefert Backend Top-20 Empfänger.
 */

import { api } from '@/shared';
import type { EmpfaengerSucheResultDto } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS } from './queries';

export function useEmpfaengerSuche(einsatzId: string, searchTerm: string) {
  return useQuery<EmpfaengerSucheResultDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.empfaengerSuche(einsatzId, searchTerm),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerEmpfaengerSucheVAlpha({
        q: searchTerm,
        einsatzId,
      });
      return response.data;
    },
    enabled: true,
    staleTime: 30_000,
    retry: 0,
  });
}
