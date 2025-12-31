/**
 * Mutation Hook zum Besetzen einer Rolle.
 *
 * **Story 6.1c - Rollen-Zuweisung (AC3):**
 * Weist eine EinsatzPerson einer RollenDefinition zu.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { KRAEFTE_QUERY_KEYS } from './queries';
import type { BesetzeRolleDto } from '@bluelight-hub/shared/client';

/**
 * Hook zum Besetzen einer Rolle mit einer EinsatzPerson.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Rollen-Queries nach erfolgreichem Besetzen.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useBesetzeRolle(einsatzId);
 *
 * const handleBesetzen = () => {
 *   mutate({
 *     einsatzPersonId: 'person-id',
 *     rollenDefinitionId: 'rollen-def-id',
 *   });
 * };
 * ```
 */
export const useBesetzeRolle = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: BesetzeRolleDto) => {
      const response = await api.rollenBesetzung().rollenBesetzungControllerBesetzeRolleVAlpha({
        einsatzId,
        besetzeRolleDto: dto,
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
      logger.info('Rolle erfolgreich besetzt');
    },
    onError: (error) => {
      logger.error('Fehler beim Besetzen der Rolle', error);
    },
  });
};
