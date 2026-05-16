/**
 * TanStack-Query-Hook für `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle/:vorfallId/schliessen`
 * (Issue #415).
 *
 * Konsumiert ausschließlich den **generierten** Client (CLAUDE.md). Schließen
 * eines Vorfalls invalidiert sowohl Listen- als auch Detail-Cache und triggert
 * eine Aktualisierung der Ampel-Projection (offene Vorfälle zählen nicht mehr).
 *
 * **Zero-Toast** (UX-DR21): `meta: { silentError: true }` — Fehler werden
 * inline gerendert.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { CloseVorfallDto, EigenschutzVorfallDto } from '@bluelight-hub/shared/client';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';
import { vorfallQueryKeys } from './use-report-vorfall';

export interface CloseVorfallVariables {
  readonly vorfallId: string;
  readonly body: CloseVorfallDto;
}

/**
 * Schließt einen Vorfall (Issue #415). Invalidiert nach Erfolg die Vorfall-
 * Liste, das Detail des Vorfalls und die Ampel-Projection des Einsatzes.
 */
export function useCloseVorfall(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<EigenschutzVorfallDto, unknown, CloseVorfallVariables>({
    meta: { silentError: true },
    mutationFn: async ({ vorfallId, body }): Promise<EigenschutzVorfallDto> => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerCloseVorfallVAlpha({
        einsatzId,
        vorfallId,
        closeVorfallDto: body,
      });
      return response.data as EigenschutzVorfallDto;
    },
    onSuccess: (_dto, variables) => {
      void queryClient.invalidateQueries({ queryKey: vorfallQueryKeys.byEinsatz(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: vorfallQueryKeys.detail(einsatzId, variables.vorfallId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus(einsatzId) });
    },
  });
}
