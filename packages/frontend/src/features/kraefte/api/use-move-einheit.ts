/**
 * Mutation Hook zum Verschieben einer taktischen Einheit in der Hierarchie.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Ändert die übergeordnete Einheit (parentId) einer Einheit,
 * um sie in der Baumstruktur zu verschieben.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { MoveEinheitDto } from '@/shared';
import { KRAEFTE_QUERY_KEYS } from './queries';

/** Parameter für die Verschiebungs-Mutation */
interface MoveEinheitParams {
  /** ID der zu verschiebenden Einheit */
  einheitId: string;
  /** Neue übergeordnete Einheit (null = Root-Ebene) */
  dto: MoveEinheitDto;
}

/**
 * Hook zum Verschieben einer taktischen Einheit in der Hierarchie.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Verschiebung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useMoveEinheit(einsatzId);
 *
 * // Unter andere Einheit verschieben
 * mutate({ einheitId: 'abc123', dto: { parentId: 'parent-id' } });
 *
 * // Auf Root-Ebene verschieben
 * mutate({ einheitId: 'abc123', dto: { parentId: null } });
 * ```
 */
export const useMoveEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einheitId, dto }: MoveEinheitParams) => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerMoveVAlpha({
        einsatzId,
        id: einheitId,
        moveEinheitDto: dto,
      });
      return response.data;
    },
    onSuccess: (_data, { einheitId }) => {
      // Gesamte Einheiten-Liste invalidieren (Baumstruktur hat sich geändert)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId),
      });
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheitDetails(einsatzId, einheitId),
      });
      logger.info('Einheit erfolgreich verschoben');
    },
    onError: (error) => {
      logger.error('Fehler beim Verschieben der Einheit', error);
    },
  });
};
