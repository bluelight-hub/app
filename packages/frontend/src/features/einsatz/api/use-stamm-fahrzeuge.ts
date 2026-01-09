/**
 * Query Hook für StammFahrzeuge (Stammdaten)
 *
 * Lädt alle nicht-archivierten Stamm-Fahrzeuge für die Auswahl
 * beim Erfassen eines Fahrzeugs für einen Einsatz.
 *
 * @module features/einsatz/api
 */

import { api } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import type { ResponseError, StammFahrzeugDto } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { calculateRetryDelay } from './queries';

/**
 * Query Keys für StammFahrzeuge
 */
export const STAMM_FAHRZEUGE_QUERY_KEYS = {
  all: ['stamm-fahrzeuge'] as const,
  list: (includeArchived = false) => [...STAMM_FAHRZEUGE_QUERY_KEYS.all, 'list', { includeArchived }] as const,
} as const;

/**
 * Hook zum Laden aller nicht-archivierten StammFahrzeuge
 *
 * Wird für den "Fahrzeug hinzufügen" Dialog verwendet,
 * um die Auswahl aus den Stammdaten zu ermöglichen.
 *
 * @param options - Query-Optionen (enabled, includeArchived)
 * @returns TanStack Query Result mit StammFahrzeugDto Array
 *
 * @example
 * ```tsx
 * const { data: stammFahrzeuge, isLoading, error } = useStammFahrzeuge();
 *
 * if (isLoading) return <Loading />;
 *
 * return (
 *   <Combobox items={stammFahrzeuge?.map(fz => ({
 *     value: fz.id,
 *     label: `${fz.funkrufname} • ${fz.kennzeichen ?? '-'}`
 *   }))} />
 * );
 * ```
 */
export const useStammFahrzeuge = (options?: { enabled?: boolean; includeArchived?: boolean }) => {
  const includeArchived = options?.includeArchived ?? false;

  return useQuery<StammFahrzeugDto[], ResponseError>({
    queryKey: STAMM_FAHRZEUGE_QUERY_KEYS.list(includeArchived),
    queryFn: async () => {
      logger.debug('Fetching StammFahrzeuge', { includeArchived });
      // Nutzt öffentlichen Endpoint (JwtAuthGuard statt AdminJwtAuthGuard)
      // WrappedResponse: { data: [...], meta: {...} }
      const response = await api.kraefteStammFahrzeuge().stammFahrzeugeControllerFindAllVAlpha({
        includeArchived,
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000, // 1 Minute - Stammdaten ändern sich selten
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
