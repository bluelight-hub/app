/**
 * Mutation Hook zum Entfernen einer Person von einer taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Entfernt eine EinsatzPerson aus einer Einheit (senkt Ist-Stärke).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { KRAEFTE_QUERY_KEYS } from './queries';

/** Parameter für die Personen-Entfernungs-Mutation */
interface RemovePersonFromEinheitParams {
  /** ID der Einheit */
  einheitId: string;
  /** ID der zu entfernenden Person */
  personId: string;
}

/**
 * Hook zum Entfernen einer Person von einer taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Entfernung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useRemovePersonFromEinheit(einsatzId);
 *
 * const handleRemove = () => {
 *   mutate({ einheitId: 'abc123', personId: 'person-id' });
 * };
 * ```
 */
export const useRemovePersonFromEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einheitId, personId }: RemovePersonFromEinheitParams) => {
      await api.einsatzEinheiten().einsatzEinheitenControllerRemovePersonVAlpha({
        einsatzId,
        id: einheitId,
        personId,
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
      logger.info('Person erfolgreich von der Einheit entfernt');
    },
    onError: (error) => {
      logger.error('Fehler beim Entfernen der Person von der Einheit', error);
    },
  });
};
