/**
 * Mutation Hook für Fahrzeug aus Stammdaten erfassen
 *
 * Erfasst ein Fahrzeug aus Stammdaten für einen aktiven Einsatz.
 * Erstellt einen Snapshot der Stammdaten (Funkrufname, Kennzeichen, etc.)
 * und setzt den initialen FMS-Status auf "Einsatzbereit" (2).
 *
 * @module features/einsatz/api
 */

import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto, ErfasseFahrzeugAusStammdatenDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Input für die Erfassung eines Fahrzeugs aus Stammdaten
 */
interface ErfasseFahrzeugInput {
  einsatzId: string;
  stammId: string;
  position?: { lat: number; lng: number };
}

/**
 * Context für Optimistic Updates
 */
interface MutationContext {
  previousFahrzeuge?: EinsatzFahrzeugDto[];
}

/**
 * Hook zum Erfassen eines Fahrzeugs aus Stammdaten für einen Einsatz
 *
 * Implementiert Story 3-1 (Fahrzeug aus Stammdaten erfassen):
 * - AC1: Stammdaten-Fahrzeug auswählen (stammId)
 * - AC2: Snapshot der Stammdaten wird erstellt
 * - AC4: Duplikat-Validierung (409 Conflict bei gleichem Funkrufnamen)
 * - AC5: UI Feedback über strukturierte Error Responses
 *
 * Nach erfolgreicher Erfassung wird die Fahrzeugliste automatisch invalidiert.
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const erfasseFahrzeug = useErfasseFahrzeugAusStammdaten();
 *
 * const handleSelect = (stammId: string) => {
 *   erfasseFahrzeug.mutate(
 *     { einsatzId, stammId },
 *     {
 *       onSuccess: (fahrzeug) => {
 *         toast.success(`${fahrzeug.funkrufname} erfasst`);
 *         closeDialog();
 *       },
 *       onError: (error) => {
 *         if (error.response?.status === 409) {
 *           toast.error('Fahrzeug bereits im Einsatz erfasst');
 *         } else {
 *           toast.error('Fehler beim Erfassen');
 *         }
 *       },
 *     }
 *   );
 * };
 * ```
 */
export const useErfasseFahrzeugAusStammdaten = () => {
  const queryClient = useQueryClient();

  return useMutation<EinsatzFahrzeugDto, ResponseError, ErfasseFahrzeugInput, MutationContext>({
    mutationFn: async ({ einsatzId, stammId, position }) => {
      logger.debug('Erfasse Fahrzeug aus Stammdaten', { einsatzId, stammId });

      const dto: ErfasseFahrzeugAusStammdatenDto = {
        stammId,
        position: position ? { lat: position.lat, lng: position.lng } : undefined,
      };

      // WrappedResponse: { data: {...}, meta: {...} }
      const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerErfasseAusStammdatenVAlpha({
        einsatzId,
        erfasseFahrzeugAusStammdatenDto: dto,
      });
      return response.data;
    },
    onMutate: async ({ einsatzId }) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });

      // Snapshot für Rollback
      const previousFahrzeuge = queryClient.getQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId));

      return { previousFahrzeuge };
    },
    onError: async (error, { einsatzId }, context) => {
      logger.error('Fehler beim Erfassen des Fahrzeugs', { error, einsatzId });

      // Rollback bei Fehler
      if (context?.previousFahrzeuge) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), context.previousFahrzeuge);
      }
    },
    onSuccess: async (fahrzeug, { einsatzId }) => {
      logger.info('Fahrzeug erfolgreich erfasst', { fahrzeugId: fahrzeug.id, einsatzId });

      // Optimistic Update: Neues Fahrzeug zur Liste hinzufügen
      queryClient.setQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), (old) => {
        if (!old) return [fahrzeug];
        return [...old, fahrzeug];
      });
    },
    onSettled: async (_data, _error, { einsatzId }) => {
      // Invalidierung: Server-Daten neu laden
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });
    },
    retry: 1,
    retryDelay: calculateRetryDelay,
  });
};
