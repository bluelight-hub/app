/**
 * Mutation Hook zum Zuweisen einer Person zu einer taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Weist eine EinsatzPerson einer Einheit zu (erhöht Ist-Stärke).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { AssignPersonToEinheitDto } from '@/shared';
import { KRAEFTE_QUERY_KEYS } from './queries';

/** Parameter für die Personen-Zuweisungs-Mutation */
interface AssignPersonToEinheitParams {
  /** ID der Einheit */
  einheitId: string;
  /** Zuzuweisende Person */
  dto: AssignPersonToEinheitDto;
}

/**
 * Hook zum Zuweisen einer Person zu einer taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Zuweisung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useAssignPersonToEinheit(einsatzId);
 *
 * const handleAssign = () => {
 *   mutate({ einheitId: 'abc123', dto: { personId: 'person-id' } });
 * };
 * ```
 */
export const useAssignPersonToEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einheitId, dto }: AssignPersonToEinheitParams) => {
      await api.einsatzEinheiten().einsatzEinheitenControllerAssignPersonVAlpha({
        einsatzId,
        id: einheitId,
        assignPersonToEinheitDto: dto,
      });
    },
    onSuccess: (_data, { einheitId }) => {
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId),
      });
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheitDetails(einsatzId, einheitId),
      });
      // Taktische Stärke aktualisieren (Ist-Stärke ändert sich)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
      logger.info('Person erfolgreich der Einheit zugewiesen');
    },
    onError: (error) => {
      logger.error('Fehler beim Zuweisen der Person zur Einheit', error);
    },
  });
};
