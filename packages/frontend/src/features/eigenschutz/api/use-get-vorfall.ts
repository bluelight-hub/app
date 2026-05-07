/**
 * TanStack-Query-Hook für `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle/:vorfallId`
 * (Story 5.2, AC12).
 *
 * Konsumiert den **generierten** Client (CLAUDE.md: niemals `fetch()`).
 * Cross-Einsatz-Zugriff liefert serverseitig 404 (kein Existenz-Leak); der
 * Hook propagiert den Fehler unverändert, die Page rendert NotFound inline.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import type { EigenschutzVorfallDto } from '@bluelight-hub/shared/client';
import { vorfallQueryKeys } from './use-report-vorfall';

const FIVE_SECONDS = 5 * 1000;

/** Query-Key-Helper für die Detail-Query (analog `sicherungspostenQueryKeys.byId`). */
export const vorfallDetailQueryKey = (einsatzId: string, vorfallId: string) => [...vorfallQueryKeys.byEinsatz(einsatzId), 'detail', vorfallId] as const;

/**
 * Lädt einen Vorfall samt zeitpunkt-genauem Kontext-Snapshot. `enabled` nur,
 * wenn beide IDs gesetzt sind. `staleTime` analog zu Story 4.4 (kurz, weil
 * der Audit-Read selten ist und Edits über andere Hooks invalidieren).
 */
export function useGetVorfall(einsatzId: string | undefined, vorfallId: string | undefined) {
  return useQuery({
    queryKey: vorfallDetailQueryKey(einsatzId ?? '', vorfallId ?? ''),
    queryFn: async (): Promise<EigenschutzVorfallDto> => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerGetVorfallVAlpha({
        einsatzId: einsatzId!,
        vorfallId: vorfallId!,
      });
      return response.data as EigenschutzVorfallDto;
    },
    staleTime: FIVE_SECONDS,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && Boolean(vorfallId),
  });
}
