/**
 * Hook für die Abfrage der taktischen Zeichen eines Einsatzes.
 *
 * Lädt alle taktischen Zeichen (Fahrzeuge, Einheiten, Stellen etc.)
 * für die Darstellung auf der Lagekarte.
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { apiFindZeichenFuerEinsatz } from './taktische-zeichen-api';
import { calculateRetryDelay, TAKTISCHE_ZEICHEN_QUERY_KEYS } from './queries';

export interface UseEinsatzZeichenOptions {
  /** Auto-Refresh Interval in ms. false = deaktiviert. Default: false */
  refetchInterval?: number | false;
}

/**
 * Hook für die Abfrage der taktischen Zeichen eines Einsatzes.
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @param options - Konfigurationsoptionen (refetchInterval)
 * @returns TanStack Query Result mit Zeichen-Array
 *
 * @example
 * ```tsx
 * const { data: zeichen = [] } = useEinsatzZeichen(einsatzId);
 * ```
 */
export const useEinsatzZeichen = (einsatzId: string | undefined, options?: UseEinsatzZeichenOptions) => {
  const id = einsatzId as string;

  return useQuery({
    queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(id),
    queryFn: async (): Promise<TaktischesZeichenResponseDto[]> => {
      try {
        return await apiFindZeichenFuerEinsatz(id);
      } catch (error) {
        logger.error('Fehler beim Laden der taktischen Zeichen', error);
        throw error;
      }
    },
    enabled: !!einsatzId,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
