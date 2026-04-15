/**
 * ETB Query Hook (CQRS API)
 *
 * Haupthook für ETB-Abfrage anhand der Einsatz-ID.
 */

import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { EtbDto, ResponseError } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { ETB_QUERY_KEYS, calculateRetryDelay } from './queries';

export interface UseEtbOptions {
  /**
   * Einsatz-ID für ETB-Abfrage
   */
  einsatzId?: string;

  /**
   * Gelöschte Einträge einschließen
   *
   * @default false
   */
  includeDeleted?: boolean;

  /**
   * Query aktivieren/deaktivieren
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook für ETB-Abfrage anhand der Einsatz-ID (CQRS API)
 *
 * Ruft das Einsatztagebuch für einen Einsatz ab. Behandelt 404-Fehler
 * als normalen Zustand (ETB existiert noch nicht) und gibt `undefined` zurück.
 *
 * @param options - Optionen für die ETB-Abfrage
 * @returns ETB-Daten mit status, version, einträge oder undefined wenn ETB nicht existiert (404)
 *
 * @example
 * ```tsx
 * const { data: etb, isLoading, error } = useEtb({ einsatzId: 'abc-123' });
 *
 * if (isLoading) return <Spinner />;
 * if (!etb) return <EmptyState>Noch kein ETB vorhanden</EmptyState>;
 *
 * return <EtbView etb={etb} />;
 * ```
 */
export const useEtb = ({ einsatzId, includeDeleted = false, enabled = true }: UseEtbOptions) => {
  return useQuery<EtbDto | undefined, ResponseError>({
    enabled: enabled && !!einsatzId,
    queryKey: ETB_QUERY_KEYS.byEinsatz(einsatzId, includeDeleted),
    queryFn: async () => {
      if (!einsatzId) {
        throw new Error('einsatzId must be provided');
      }

      try {
        const response = await api.etb().etbCqrsControllerGetEtbByEinsatzIdVAlpha({
          einsatzId,
          includeDeleted,
        });
        return response.data;
      } catch (error) {
        // 404 ist kein Fehler - ETB existiert einfach noch nicht
        // Kein Toast, kein Error - return undefined
        const statusCode = (error as { status?: number })?.status || (error as { response?: { status?: number } })?.response?.status;

        if (statusCode === 404) {
          logger.debug('ETB nicht gefunden (404) - normaler Zustand', {
            einsatzId,
          });
          return undefined as unknown as EtbDto; // Return undefined statt Error
        }

        logger.error('Failed to fetch ETB via CQRS API', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: (failureCount, error) => {
      // Kein Retry bei 404 (ETB existiert noch nicht) oder Auth/Access-Fehlern
      const statusCode = (error as { status?: number })?.status || (error as { response?: { status?: number } })?.response?.status;
      if (statusCode === 404 || statusCode === 401 || statusCode === 403) return false;
      return failureCount < 3;
    },
    retryDelay: calculateRetryDelay,
  });
};
