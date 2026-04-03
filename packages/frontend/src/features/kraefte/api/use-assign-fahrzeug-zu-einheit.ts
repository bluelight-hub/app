/**
 * Mutation Hook zum Zuweisen eines Fahrzeugs zu einer taktischen Einheit.
 *
 * Weist ein EinsatzFahrzeug einer Einheit zu oder entfernt die Zuweisung.
 * einheitId=null entfernt die Zuweisung.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { KRAEFTE_QUERY_KEYS } from './queries';
import { EINSATZ_QUERY_KEYS } from '@/features/einsatz/api/queries';

/** Parameter für die Fahrzeug→Einheit Zuweisungs-Mutation */
interface AssignFahrzeugZuEinheitParams {
  /** ID des Fahrzeugs */
  fahrzeugId: string;
  /** Einheit-ID oder null zum Entfernen der Zuweisung */
  einheitId: string | null;
}

/**
 * Hook zum Zuweisen eines Fahrzeugs zu einer taktischen Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch
 * die Fahrzeug- und Einheiten-Queries nach erfolgreicher Zuweisung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useAssignFahrzeugZuEinheit(einsatzId);
 *
 * const handleAssign = (fahrzeugId: string, einheitId: string | null) => {
 *   mutate({ fahrzeugId, einheitId });
 * };
 * ```
 */
export const useAssignFahrzeugZuEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fahrzeugId, einheitId }: AssignFahrzeugZuEinheitParams) => {
      await api.einsatzFahrzeuge().einsatzFahrzeugeControllerAssignToEinheitVAlpha({
        einsatzId,
        id: fahrzeugId,
        assignFahrzeugToEinheitDto: { einheitId: einheitId as unknown as object },
      });
    },
    onSuccess: () => {
      // Beide Fahrzeug-Query-Keys invalidieren (Einsatz + Kräfte Feature nutzen unterschiedliche Keys)
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId),
      });
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.fahrzeuge(einsatzId),
      });
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId),
      });
    },
    onError: (error) => {
      logger.error('Fehler beim Zuweisen des Fahrzeugs zur Einheit', error);
    },
  });
};
