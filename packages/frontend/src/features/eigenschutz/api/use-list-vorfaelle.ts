/**
 * TanStack-Query-Hook für `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle`
 * (Story 5.3, AC7).
 *
 * Konsumiert ausschließlich den **generierten** Client (CLAUDE.md: niemals
 * `fetch()`/`axios`). Liefert die Listen-Items bereits aus der gewrappten
 * Response (`response.data`) zurück, ohne Date-Konversion — der Konsument
 * formatiert ISO-Strings bei Bedarf selbst (Cache-Equality über Date-
 * Identität bricht sonst).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/shared';
import type { EigenschutzVorfallListItemDto } from '@bluelight-hub/shared/client';
import { vorfallQueryKeys } from './use-report-vorfall';

const TEN_SECONDS = 10 * 1000;

/**
 * Filter-Variante für den Backend-Aufruf (Story 5.3, AC7).
 *
 * Im Gegensatz zum UI-Store (`VorfallFilterState`) sind hier `einheitIds`
 * bereits die expandierte Liste (Resolver hat Abschnitte expandiert) und
 * Datums-Strings bereits in ISO-8601 mit Offset (UTC-Mitternacht für die
 * gewählten Tage).
 */
export interface VorfallListBackendFilter {
  readonly einheitIds?: ReadonlyArray<string>;
  readonly vorfallZeitVon?: string;
  readonly vorfallZeitBis?: string;
  readonly unfallkasseRelevant?: boolean;
}

/**
 * Stabile Hash-Repräsentation für Cache-Keys (Story 5.3, AC7). Sortiert
 * `einheitIds` und JSON-stringifiziert das Filter-Objekt deterministisch,
 * damit `{a:1,b:2}` und `{b:2,a:1}` denselben Cache treffen.
 */
export function stableFilterHash(filter: VorfallListBackendFilter): string {
  return JSON.stringify({
    einheitIds: filter.einheitIds ? Array.from(filter.einheitIds).slice().sort() : null,
    vorfallZeitVon: filter.vorfallZeitVon ?? null,
    vorfallZeitBis: filter.vorfallZeitBis ?? null,
    unfallkasseRelevant: filter.unfallkasseRelevant ?? null,
  });
}

/**
 * Backwards-kompatibler Helper, der die Pflicht-Struktur aus
 * `vorfallQueryKeys.list` wiederverwendet (Story 5.3, AC7). Nutzt
 * `byEinsatz` als Eltern-Schlüssel — `useReportVorfall.onSuccess`
 * invalidiert diese Eltern und trifft die Liste damit transitiv.
 */
export const vorfallListQueryKey = (einsatzId: string, filter: VorfallListBackendFilter) => vorfallQueryKeys.list(einsatzId, stableFilterHash(filter));

/**
 * Listet gefilterte Vorfälle für die Nachbereitungs-Page.
 *
 * - `staleTime: 10 s` — Sabine-UX, kein safety-critical.
 * - `enabled` nur, wenn `einsatzId` non-empty.
 * - `refetchOnWindowFocus: true` (Standard) sorgt für Pseudo-Live-Update
 *   beim Tab-Wechsel.
 * - `meta.silentError: true` (Pattern Story 5.2 `useGetVorfall`).
 */
export function useListVorfaelle(einsatzId: string | undefined, filter: VorfallListBackendFilter): UseQueryResult<EigenschutzVorfallListItemDto[]> {
  return useQuery<EigenschutzVorfallListItemDto[]>({
    queryKey: vorfallListQueryKey(einsatzId ?? '', filter),
    queryFn: async (): Promise<EigenschutzVorfallListItemDto[]> => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerListVorfaelleVAlpha({
        einsatzId: einsatzId!,
        einheitIds: filter.einheitIds && filter.einheitIds.length > 0 ? filter.einheitIds.join(',') : undefined,
        vorfallZeitVon: filter.vorfallZeitVon,
        vorfallZeitBis: filter.vorfallZeitBis,
        unfallkasseRelevant: filter.unfallkasseRelevant,
      });
      return (response.data ?? []) as EigenschutzVorfallListItemDto[];
    },
    // Whitespace-only-IDs würden im Backend in `EINSATZ_REQUIRED` enden;
    // hier defensiv vorab prüfen, damit kein 400-Roundtrip passiert.
    enabled: typeof einsatzId === 'string' && einsatzId.trim().length > 0,
    staleTime: TEN_SECONDS,
    refetchOnWindowFocus: true,
    meta: { silentError: true },
  });
}
