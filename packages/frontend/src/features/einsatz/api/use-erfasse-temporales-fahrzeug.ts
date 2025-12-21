/**
 * Mutation Hook für temporäres Fahrzeug erfassen
 *
 * Erfasst ein temporäres Fahrzeug (ohne Stammdaten-Referenz) für einen aktiven Einsatz.
 * Temporäre Fahrzeuge werden mit minimalem Datensatz erfasst und erhalten
 * den initialen FMS-Status "Einsatzbereit" (2).
 *
 * @module features/einsatz/api
 */

import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto, ErfasseTemporalesFahrzeugDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Input für die Erfassung eines temporären Fahrzeugs
 */
interface ErfasseTemporalesFahrzeugInput {
  einsatzId: string;
  funkrufname: string;
  fahrzeugtypId: string;
  kennzeichen?: string;
  position?: { lat: number; lng: number };
}

/**
 * Context für Optimistic Updates
 */
interface MutationContext {
  previousFahrzeuge?: EinsatzFahrzeugDto[];
}

/**
 * Hook zum Erfassen eines temporären Fahrzeugs für einen Einsatz
 *
 * Implementiert Story 3-2 (Temporäres Fahrzeug erfassen):
 * - AC1: Temporäres Fahrzeug ohne Stammdaten-Referenz
 * - AC2: Pflichtfelder: funkrufname, fahrzeugtypId
 * - AC3: Optionale Felder: kennzeichen, position
 * - AC4: Duplikat-Validierung (409 Conflict bei gleichem Funkrufnamen)
 * - AC5: UI Feedback über strukturierte Error Responses
 *
 * Nach erfolgreicher Erfassung wird die Fahrzeugliste automatisch invalidiert.
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const erfasseTemporalesFahrzeug = useErfasseTemporalesFahrzeug();
 *
 * const handleSubmit = (values: FormValues) => {
 *   erfasseTemporalesFahrzeug.mutate(
 *     {
 *       einsatzId,
 *       funkrufname: values.funkrufname,
 *       fahrzeugtypId: values.fahrzeugtypId,
 *       kennzeichen: values.kennzeichen,
 *     },
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
export const useErfasseTemporalesFahrzeug = () => {
  const queryClient = useQueryClient();

  return useMutation<EinsatzFahrzeugDto, ResponseError, ErfasseTemporalesFahrzeugInput, MutationContext>({
    mutationFn: async ({ einsatzId, funkrufname, fahrzeugtypId, kennzeichen, position }) => {
      logger.debug('Erfasse temporäres Fahrzeug', { einsatzId, funkrufname, fahrzeugtypId });

      const dto: ErfasseTemporalesFahrzeugDto = {
        funkrufname,
        fahrzeugtypId,
        kennzeichen,
        position: position ? { lat: position.lat, lng: position.lng } : undefined,
      };

      // WrappedResponse: { data: {...}, meta: {...} }
      const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerErfasseTemporalesVAlpha({
        einsatzId,
        erfasseTemporalesFahrzeugDto: dto,
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
      logger.error('Fehler beim Erfassen des temporären Fahrzeugs', { error, einsatzId });

      // Rollback bei Fehler
      if (context?.previousFahrzeuge) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), context.previousFahrzeuge);
      }
    },
    onSuccess: async (fahrzeug, { einsatzId }) => {
      logger.info('Temporäres Fahrzeug erfolgreich erfasst', { fahrzeugId: fahrzeug.id, einsatzId });

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
