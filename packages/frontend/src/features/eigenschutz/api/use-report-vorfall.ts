/**
 * TanStack-Query-Hook für `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle`
 * (Story 5.1, AC10/AC11).
 *
 * `useReportVorfall` ist eine TanStack-`useMutation` um den **generierten**
 * Client (Pattern `useCreateSicherungsposten`); kein manueller `fetch`.
 * `onSuccess` invalidiert den Query-Key `vorfaelleByEinsatz`, damit eine
 * spätere Story-5.3-Liste plug-and-play konsumiert.
 *
 * **Zero-Toast** (UX-DR21): `meta: { silentError: true }` — Fehler werden
 * inline im Drawer gerendert.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { EigenschutzVorfallDto, ReportVorfallDto } from '@bluelight-hub/shared/client';

/**
 * Query-Key-Factory für Vorfälle (Story 5.1 + 5.3 AC7-Pflicht-Struktur).
 *
 * Hierarchie:
 * - `all` — gemeinsamer Prefix für alle Vorfall-Queries.
 * - `byEinsatz(einsatzId)` — Listen-Cache eines Einsatzes (Eltern-Schlüssel
 *   für transitives Invalidieren via `useReportVorfall.onSuccess`).
 * - `list(einsatzId, filterHash)` — konkrete gefilterte Liste (Story 5.3).
 * - `detail(einsatzId, vorfallId)` — Vorfall-Detail (Story 5.2).
 *
 * **Pflicht-Struktur (Story 5.3, AC7):** alle Sub-Schlüssel sind Member
 * dieses Objekts, damit `useReportVorfall`/`useGetVorfall`/`useListVorfaelle`
 * dasselbe Cache-Key-Schema teilen.
 */
export const vorfallQueryKeys = {
  all: ['eigenschutz-vorfaelle'] as const,
  byEinsatz: (einsatzId: string) => ['eigenschutz-vorfaelle', einsatzId] as const,
  list: (einsatzId: string, filterHash: string) => ['eigenschutz-vorfaelle', einsatzId, 'list', filterHash] as const,
  detail: (einsatzId: string, vorfallId: string) => ['eigenschutz-vorfaelle', einsatzId, 'detail', vorfallId] as const,
} as const;

/**
 * Meldet einen neuen Vorfall (Story 5.1, AC7+AC10).
 *
 * Invalidiert nach Erfolg den `vorfaelleByEinsatz`-Cache — Story-5.3-Liste
 * picked das auf, sobald der Konsument lebt. Der Hook gibt das vollständige
 * `EigenschutzVorfallDto` zurück (inkl. `kontextSnapshot: {}` in Story 5.1).
 *
 * **Kein Retry:** Mutationen werden nicht automatisch wiederholt — der User
 * sieht den Fehler inline und kann manuell neu absenden (Pattern
 * `useCreateSicherungsposten`).
 */
export function useReportVorfall(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<EigenschutzVorfallDto, unknown, ReportVorfallDto>({
    meta: { silentError: true },
    mutationFn: async (body): Promise<EigenschutzVorfallDto> => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerReportVorfallVAlpha({
        einsatzId,
        reportVorfallDto: body,
      });
      return response.data as EigenschutzVorfallDto;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vorfallQueryKeys.byEinsatz(einsatzId) });
    },
  });
}
