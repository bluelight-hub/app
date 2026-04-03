/**
 * Mutation Hook zum Aktualisieren einer taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Aktualisiert Name, Typ, Funktion, Soll-Stärke, Auftrag oder Einsatzort
 * einer bestehenden Einheit.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { UpdateEinsatzEinheitDto } from '@/shared';
import { KRAEFTE_QUERY_KEYS } from './queries';

/** Parameter für die Update-Mutation */
interface UpdateEinheitParams {
  /** ID der zu aktualisierenden Einheit */
  einheitId: string;
  /** Zu aktualisierende Felder */
  dto: UpdateEinsatzEinheitDto;
}

/**
 * Hook zum Aktualisieren einer taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Aktualisierung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateEinheit(einsatzId);
 *
 * const handleUpdate = () => {
 *   mutate({ einheitId: 'abc123', dto: { name: 'Neuer Name' } });
 * };
 * ```
 */
export const useUpdateEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einheitId, dto }: UpdateEinheitParams) => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerUpdateVAlpha({
        einsatzId,
        id: einheitId,
        updateEinsatzEinheitDto: dto,
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
      // Taktische Stärke aktualisieren (Soll-Stärke könnte sich geändert haben)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
      logger.info('Taktische Einheit erfolgreich aktualisiert');
    },
    onError: (error) => {
      logger.error('Fehler beim Aktualisieren der taktischen Einheit', error);
    },
  });
};
