/**
 * Mutation Hook zum Erstellen einer taktischen Einheit.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Erstellt eine neue Einheit (Trupp, Staffel, Gruppe, Zug, Abschnitt)
 * innerhalb eines Einsatzes.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { CreateEinsatzEinheitDto } from '@/shared';
import { KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook zum Erstellen einer neuen taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Einheiten-Queries nach erfolgreicher Erstellung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useCreateEinheit(einsatzId);
 *
 * const handleCreate = () => {
 *   mutate({ name: '1. Trupp', typ: 'TRUPP', sollStaerke: 3 });
 * };
 * ```
 */
export const useCreateEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateEinsatzEinheitDto) => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerCreateVAlpha({
        einsatzId,
        createEinsatzEinheitDto: dto,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId),
      });
      // Taktische Stärke aktualisieren
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
      logger.info('Taktische Einheit erfolgreich erstellt');
    },
    onError: (error) => {
      logger.error('Fehler beim Erstellen der taktischen Einheit', error);
    },
  });
};
