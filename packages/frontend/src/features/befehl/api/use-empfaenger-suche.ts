/**
 * Hook fuer die Empfaenger-Suche in Kraefte-Stammdaten.
 *
 * Durchsucht EinsatzPersonen und StammPersonen fuer die Empfaenger-Auswahl.
 * Suche wird erst ab 2 Zeichen aktiviert (AC8).
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
    enabled: searchTerm.length >= 2,
    staleTime: 30_000,
    retry: 0,
  });
}
