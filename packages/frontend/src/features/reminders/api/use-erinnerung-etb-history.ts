/**
 * Erinnerung ETB History Query Hook
 *
 * Lädt die ETB-Historie einer Erinnerung (alle verknüpften ETB-Einträge).
 *
 * **Story 5.7:** Bidirektionale Verknüpfung - Erinnerung zu ETB Navigation
 */

import { api } from '@/shared';
import type { ErinnerungEtbHistoryDto, ResponseError } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { ERINNERUNG_QUERY_KEYS } from './queries';

/**
 * Query Keys für Erinnerung ETB History
 */
export const ERINNERUNG_ETB_HISTORY_QUERY_KEYS = {
  histories: () => [...ERINNERUNG_QUERY_KEYS.all, 'etb-history'] as const,
  history: (erinnerungId: string) => [...ERINNERUNG_ETB_HISTORY_QUERY_KEYS.histories(), erinnerungId] as const,
} as const;

export interface UseErinnerungEtbHistoryOptions {
  /**
   * Erinnerungs-ID für die ETB-History Abfrage
   * Wenn null, wird die Query nicht ausgeführt
   */
  erinnerungId: string | null;
  /**
   * Einsatz-ID (erforderlich für den API-Aufruf)
   */
  einsatzId: string;
}

/**
 * Hook für Erinnerung ETB History Abfrage
 *
 * Lädt alle ETB-Einträge die mit einer Erinnerung verknüpft sind.
 * Die Query wird nur ausgeführt wenn eine gültige erinnerungId übergeben wird.
 *
 * @param options - Optionen für die ETB-History Abfrage
 * @returns ErinnerungEtbHistoryDto mit entries und totalCount
 *
 * @example
 * ```tsx
 * const { data: history, isLoading } = useErinnerungEtbHistory({
 *   erinnerungId: 'erin-123',
 *   einsatzId: 'abc-456'
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (!history?.entries.length) return <EmptyState>Keine ETB-Einträge</EmptyState>;
 *
 * return <EtbHistoryList entries={history.entries} />;
 * ```
 */
export function useErinnerungEtbHistory({ erinnerungId, einsatzId }: UseErinnerungEtbHistoryOptions) {
  return useQuery<ErinnerungEtbHistoryDto, ResponseError>({
    queryKey: erinnerungId ? ERINNERUNG_ETB_HISTORY_QUERY_KEYS.history(erinnerungId) : ([...ERINNERUNG_ETB_HISTORY_QUERY_KEYS.histories(), 'disabled'] as const),
    queryFn: async () => {
      if (!erinnerungId) {
        throw new Error('erinnerungId must be provided');
      }
      if (!einsatzId) {
        throw new Error('einsatzId must be provided');
      }

      const response = await api.erinnerungen().erinnerungControllerGetEtbHistoryVAlpha({
        erinnerungId,
        einsatzId,
      });
      return response.data;
    },
    enabled: !!erinnerungId && !!einsatzId,
    staleTime: 30_000, // 30 Sekunden Cache
  });
}
