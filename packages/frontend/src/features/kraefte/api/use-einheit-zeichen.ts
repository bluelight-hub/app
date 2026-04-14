/**
 * Hook für die Abfrage des taktischen Zeichens einer Einheit.
 *
 * Lädt das zugewiesene taktische Zeichen einer taktischen Einheit
 * über den generierten API-Client. Gibt `null` zurück wenn noch
 * kein Zeichen zugewiesen ist (Backend gibt 200 mit null).
 *
 * Issue #667 — Einsatz-Einheiten: Taktische Zeichen zuweisen & Lagekarte anzeigen
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook für die Abfrage des taktischen Zeichens einer Einheit.
 *
 * @param einsatzId - Die Einsatz-ID (optional — Query wird deaktiviert wenn undefined)
 * @param einheitId - Die Einheit-ID (optional — Query wird deaktiviert wenn undefined)
 * @returns TanStack Query Result mit TaktischesZeichenResponseDto oder null
 *
 * @example
 * ```tsx
 * const { data: zeichen, isLoading } = useEinheitZeichen(einsatzId, einheitId);
 * if (zeichen) {
 *   // Zeichen existiert, Vorschau anzeigen
 * }
 * ```
 */
export function useEinheitZeichen(einsatzId: string | undefined, einheitId: string | undefined) {
  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.einheitZeichen(einsatzId as string, einheitId as string),
    queryFn: async (): Promise<TaktischesZeichenResponseDto | null> => {
      try {
        const response = await api.einsatzEinheiten().einsatzEinheitenControllerGetZeichenVAlpha({
          einsatzId: einsatzId as string,
          einheitId: einheitId as string,
        });
        // Backend gibt 200 mit null als data zurück wenn kein Zeichen existiert
        return (response.data as TaktischesZeichenResponseDto | null) ?? null;
      } catch (error: unknown) {
        logger.error('Fehler beim Laden des Einheit-Zeichens', error);
        throw error;
      }
    },
    enabled: !!einsatzId && !!einheitId,
    staleTime: 30_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
