/**
 * Funkverkehr Query Hooks
 *
 * Query-Key-Factory und Read-Hooks für Kanalplan + Rufnamen-Vorschläge.
 *
 * Funkprotokoll-Queries (ETB-Einträge mit FunkKontext) leben in
 * `../hooks/use-funkprotokoll-eintraege.ts`, weil sie gegen die ETB-API gehen.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/shared';
import type { FunkkanalControllerListVAlpha200Response, FunkkanalControllerCreateVAlpha201Response, RufnameVorschlaegeControllerListVAlpha200Response } from '@bluelight-hub/shared/client';

/**
 * Query-Key-Factory für Funkverkehr-bezogene Queries.
 *
 * Hierarchische Struktur für granulare Cache-Invalidierung:
 * - `funkverkehr` → alles (Notfall-Hammer)
 * - `funkverkehr.kanalplan(einsatzId)` → Kanalplan eines Einsatzes
 * - `funkverkehr.kanal(kanalId)` → einzelner Kanal
 * - `funkverkehr.rufnamenVorschlaege(einsatzId)` → Rufnamen für Zuordnungs-UI
 * - `funkverkehr.funkprotokoll(einsatzId, filter)` → ETB-Einträge mit FunkKontext
 */
export const FUNKVERKEHR_QUERY_KEYS = {
  all: ['funkverkehr'] as const,
  kanalplan: (einsatzId: string) => ['funkverkehr', 'kanalplan', einsatzId] as const,
  kanal: (einsatzId: string, kanalId: string) => ['funkverkehr', 'kanal', einsatzId, kanalId] as const,
  rufnamenVorschlaege: (einsatzId: string) => ['funkverkehr', 'rufnamen-vorschlaege', einsatzId] as const,
  funkprotokoll: (einsatzId: string, filter?: unknown) => ['funkverkehr', 'funkprotokoll', einsatzId, filter] as const,
};

export interface UseKanalplanOptions {
  einsatzId: string;
  includeArchived?: boolean;
  enabled?: boolean;
}

/**
 * Lädt den Kanalplan (alle Funkkanäle + Zuordnungen) eines Einsatzes.
 * Sortierung erfolgt serverseitig nach `sortIndex` asc.
 */
export function useKanalplan({ einsatzId, includeArchived = false, enabled = true }: UseKanalplanOptions) {
  return useQuery<FunkkanalControllerListVAlpha200Response>({
    enabled: enabled && Boolean(einsatzId),
    queryKey: [...FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), { includeArchived }],
    queryFn: () => api.funkkanal().funkkanalControllerListVAlpha({ einsatzId, includeArchived }),
    staleTime: 30_000,
  });
}

export interface UseFunkkanalOptions {
  einsatzId: string;
  kanalId: string;
  enabled?: boolean;
}

/**
 * Lädt einen einzelnen Funkkanal (inkl. Zuordnungen).
 */
export function useFunkkanal({ einsatzId, kanalId, enabled = true }: UseFunkkanalOptions) {
  return useQuery<FunkkanalControllerCreateVAlpha201Response>({
    enabled: enabled && Boolean(einsatzId) && Boolean(kanalId),
    queryKey: FUNKVERKEHR_QUERY_KEYS.kanal(einsatzId, kanalId),
    queryFn: () => api.funkkanal().funkkanalControllerGetByIdVAlpha({ einsatzId, kanalId }),
    staleTime: 30_000,
  });
}

export interface UseRufnameVorschlaegeOptions {
  einsatzId: string;
  enabled?: boolean;
}

/**
 * Liefert die möglichen Rufnamen (Fahrzeuge/Personen/Einheiten) eines Einsatzes
 * für den Zuordnungs-Combobox.
 */
export function useRufnameVorschlaege({ einsatzId, enabled = true }: UseRufnameVorschlaegeOptions) {
  return useQuery<RufnameVorschlaegeControllerListVAlpha200Response>({
    enabled: enabled && Boolean(einsatzId),
    queryKey: FUNKVERKEHR_QUERY_KEYS.rufnamenVorschlaege(einsatzId),
    queryFn: () => api.funkkanal().rufnameVorschlaegeControllerListVAlpha({ einsatzId }),
    staleTime: 5 * 60_000,
  });
}

/**
 * Re-Export für Konsumenten, die ein gekürztes Typing brauchen.
 */
export type UseKanalplanQueryOptions = UseQueryOptions<FunkkanalControllerListVAlpha200Response>;
