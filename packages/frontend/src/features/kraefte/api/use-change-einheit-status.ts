/**
 * Mutation Hook zum Ändern des Status einer taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Ändert den Status einer Einheit (AUFGESTELLT, EINSATZBEREIT, IM_EINSATZ,
 * IN_RESERVE, AUFGELOEST).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { ChangeEinsatzEinheitStatusDto } from '@/shared';
import { KRAEFTE_QUERY_KEYS } from './queries';

/** Parameter für die Status-Änderungs-Mutation */
interface ChangeEinheitStatusParams {
  /** ID der Einheit */
  einheitId: string;
  /** Neuer Status */
  dto: ChangeEinsatzEinheitStatusDto;
}

/**
 * Hook zum Ändern des Status einer taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Statusänderung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useChangeEinheitStatus(einsatzId);
 *
 * const handleStatusChange = () => {
 *   mutate({ einheitId: 'abc123', dto: { status: 'EINSATZBEREIT' } });
 * };
 * ```
 */
export const useChangeEinheitStatus = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einheitId, dto }: ChangeEinheitStatusParams) => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerChangeStatusVAlpha({
        einsatzId,
        id: einheitId,
        changeEinsatzEinheitStatusDto: dto,
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
      // Taktische Stärke aktualisieren (Status beeinflusst Verfügbarkeit)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
      logger.info('Einheit-Status erfolgreich geändert');
    },
    onError: (error) => {
      logger.error('Fehler beim Ändern des Einheit-Status', error);
    },
  });
};
