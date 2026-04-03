/**
 * Mutation Hook zum Setzen/Entfernen des Einheitenführers.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Weist einer Einheit einen Einheitenführer zu oder entfernt ihn.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { SetEinheitenfuehrerDto } from '@/shared';
import { KRAEFTE_QUERY_KEYS } from './queries';

/** Parameter für die Einheitenführer-Mutation */
interface SetEinheitenfuehrerParams {
  /** ID der Einheit */
  einheitId: string;
  /** Führer-ID (null zum Entfernen) */
  dto: SetEinheitenfuehrerDto;
}

/**
 * Hook zum Setzen oder Entfernen des Einheitenführers.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Änderung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useSetEinheitenfuehrer(einsatzId);
 *
 * // Führer setzen
 * mutate({ einheitId: 'abc123', dto: { fuehrerId: 'person-id' } });
 *
 * // Führer entfernen
 * mutate({ einheitId: 'abc123', dto: { fuehrerId: null } });
 * ```
 */
export const useSetEinheitenfuehrer = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einheitId, dto }: SetEinheitenfuehrerParams) => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerSetFuehrerVAlpha({
        einsatzId,
        id: einheitId,
        setEinheitenfuehrerDto: dto,
      });
      return response.data;
    },
    onSuccess: (_data, { einheitId }) => {
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId),
      });
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheitDetails(einsatzId, einheitId),
      });
      logger.info('Einheitenführer erfolgreich gesetzt');
    },
    onError: (error) => {
      logger.error('Fehler beim Setzen des Einheitenführers', error);
    },
  });
};
