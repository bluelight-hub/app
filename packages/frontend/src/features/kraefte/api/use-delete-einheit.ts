/**
 * Mutation Hook zum Löschen einer taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Löscht eine Einheit aus dem Einsatz.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from '@/features/taktische-zeichen/api/queries';
import { KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook zum Löschen einer taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Löschung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useDeleteEinheit(einsatzId);
 *
 * const handleDelete = () => {
 *   mutate('einheit-id');
 * };
 * ```
 */
export const useDeleteEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (einheitId: string) => {
      await api.einsatzEinheiten().einsatzEinheitenControllerDeleteVAlpha({
        einsatzId,
        id: einheitId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId),
      });
      // Taktische Stärke aktualisieren (Einheit wurde entfernt)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
      // Taktische Zeichen invalidieren (Zeichen wird kaskadiert gelöscht, Issue #667)
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Taktische Einheit erfolgreich gelöscht');
    },
    onError: (error) => {
      logger.error('Fehler beim Löschen der taktischen Einheit', error);
    },
  });
};
