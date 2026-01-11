/**
 * Mutation Hook zum Freigeben einer Rolle.
 *
 * **Story 6.1c - Rollen-Freigabe (AC3b):**
 * Gibt eine besetzte Rolle wieder frei.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook zum Freigeben einer besetzten Rolle.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Rollen-Queries nach erfolgreicher Freigabe.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useFreigebeRolle(einsatzId);
 *
 * const handleFreigeben = (rollenBesetzungId: string) => {
 *   mutate(rollenBesetzungId);
 * };
 * ```
 */
export const useFreigebeRolle = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rollenBesetzungId: string) => {
      const response = await api.rollenBesetzung().rollenBesetzungControllerFreigebenRolleVAlpha({
        einsatzId,
        rollenBesetzungId,
      });
      return response.data;
    },
    onSuccess: () => {
      // AC6: Query Invalidation für Auto-Update
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.rollen(einsatzId),
      });
      // Taktische Stärke aktualisieren (Anzahl besetzter Rollen beeinflusst Stärke-Anzeige)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
      // Allgemeine Kräfte-Daten aktualisieren für Dashboard-Konsistenz
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId),
      });
      logger.info('Rolle erfolgreich freigegeben');
    },
    onError: (error) => {
      logger.error('Fehler beim Freigeben der Rolle', error);
    },
  });
};
