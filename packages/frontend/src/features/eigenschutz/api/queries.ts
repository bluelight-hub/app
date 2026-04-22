import { api } from '@/shared';
import { useQuery } from '@tanstack/react-query';

/**
 * Query-Key-Factory für das Eigenschutz-Feature (Story 1.6).
 *
 * Hierarchische Struktur gemäß Architecture §I — ermöglicht
 * gezielte Cache-Invalidierung in späteren Stories (z. B. nach
 * PSA-Profil-Update `invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.all(einsatzId) })`).
 */
export const EIGENSCHUTZ_QUERY_KEYS = {
  all: (einsatzId: string) => ['eigenschutz', einsatzId] as const,
  health: (einsatzId: string) => ['eigenschutz', einsatzId, 'health'] as const,
} as const;

/**
 * Prüft robust, ob ein unbekannter Error einen HTTP-403-Status trägt.
 * Kompatibel mit `ResponseError` aus dem generierten Client (`error.response.status`).
 */
function is403(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 403;
}

/**
 * Liefert den Health-Status des Eigenschutz-Moduls für einen Einsatz.
 *
 * **Konsumiert den Story-1.6-AC2-Endpoint** und ist derzeit reiner Smoke-
 * Test: Rückgabe `{ status: 'ready' }` bedeutet, dass die Guard-Kette
 * (JWT → Einsatz-Scope → Eigenschutz-Rolle) durchläuft. Epic 2+ ersetzt
 * den Hook-Konsum durch fachliche Queries.
 *
 * **403-Verhalten (AC8, Zero-Toast-Policy):**
 * - Kein Retry — 403 ist kein transientes Problem.
 * - `meta: { silentError: true }` — unterdrückt den globalen Sonner-Toast;
 *   die Route-Komponente rendert stattdessen einen `EmptyState`.
 */
export function useEigenschutzHealth(einsatzId: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.health(einsatzId),
    queryFn: async () => {
      const response = await api.eigenschutz().eigenschutzHealthControllerGetHealthVAlpha({ einsatzId });
      return response.data;
    },
    retry: (failureCount, error) => {
      if (is403(error)) {
        return false;
      }
      return failureCount < 2;
    },
    meta: { silentError: true },
    enabled: Boolean(einsatzId),
  });
}
