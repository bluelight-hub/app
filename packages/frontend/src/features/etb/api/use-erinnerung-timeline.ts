/**
 * Erinnerung Timeline Query Hook
 *
 * Story 5.5: Holt die Timeline-Events einer Erinnerung für die Anzeige in ETB-Eintrags-Details.
 */

import { api, ResponseError } from '@/shared';
import type { ErinnerungTimelineDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { ETB_QUERY_KEYS } from './queries';

/**
 * Query Keys für Erinnerung-Timeline
 *
 * Erweitert die bestehenden ETB Query Keys um Timeline-Abfragen.
 */
export const ERINNERUNG_TIMELINE_QUERY_KEYS = {
  /**
   * Query Key für eine spezifische Erinnerung-Timeline
   *
   * @param etbId - ID des ETB
   * @param erinnerungId - ID der Erinnerung
   */
  timeline: (etbId: string, erinnerungId: string) => [...ETB_QUERY_KEYS.all, etbId, 'erinnerungen', erinnerungId, 'timeline'] as const,
} as const;

export interface UseErinnerungTimelineOptions {
  /**
   * ETB-ID (erforderlich für API-Aufruf)
   */
  etbId: string | null | undefined;

  /**
   * Erinnerungs-ID (erforderlich für API-Aufruf)
   */
  erinnerungId: string | null | undefined;

  /**
   * Aktiviert/deaktiviert die Query
   *
   * @default true (wenn etbId und erinnerungId vorhanden)
   */
  enabled?: boolean;
}

/**
 * Hook für Erinnerung-Timeline Abfrage
 *
 * Ruft die chronologisch sortierten Timeline-Events einer Erinnerung ab.
 * Wird nur aktiviert, wenn sowohl etbId als auch erinnerungId vorhanden sind.
 *
 * @param options - Optionen für die Timeline-Abfrage
 * @returns Timeline-Daten mit Events und Metadaten
 *
 * @example
 * ```tsx
 * const { data: timeline, isLoading, error } = useErinnerungTimeline({
 *   etbId: 'etb-123',
 *   erinnerungId: 'erin-456',
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (!timeline) return <EmptyState>Keine Timeline verfuegbar</EmptyState>;
 *
 * return <ErinnerungTimelineWidget timeline={timeline} />;
 * ```
 */
export function useErinnerungTimeline({ etbId, erinnerungId, enabled = true }: UseErinnerungTimelineOptions) {
  const isEnabled = enabled && !!etbId && !!erinnerungId;

  return useQuery<ErinnerungTimelineDto, ResponseError>({
    queryKey: ERINNERUNG_TIMELINE_QUERY_KEYS.timeline(etbId ?? '', erinnerungId ?? ''),
    queryFn: async () => {
      if (!etbId || !erinnerungId) {
        throw new Error('etbId und erinnerungId muessen angegeben werden');
      }

      const response = await api.etb().etbCqrsControllerGetErinnerungTimelineVAlpha({
        etbId,
        erinnerungId,
      });
      return response.data;
    },
    enabled: isEnabled,
    staleTime: 30000, // 30 Sekunden Cache
    retry: (failureCount, error) => {
      // Kein Retry bei 404 (Erinnerung existiert nicht mehr)
      if (error instanceof ResponseError && error.response.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
