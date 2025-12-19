/**
 * Mutation Hook für Person registrieren
 *
 * Registriert eine neue Person (manuell oder aus Stammdaten) für einen aktiven Einsatz.
 *
 * @module features/einsatz/api
 */

import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzPersonResponseDto, RegistrierePersonDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Input für die Registrierung einer Person
 */
interface RegistrierePersonInput {
  einsatzId: string;
  dto: RegistrierePersonDto;
}

/**
 * Context für Optimistic Updates
 */
interface MutationContext {
  previousPersonen?: EinsatzPersonResponseDto[];
}

/**
 * Hook zum Registrieren einer Person für einen Einsatz
 *
 * Implementiert Story 4-1 (Person manuell registrieren):
 * - AC1: Person mit Vorname, Nachname, Funktion, Funkrufname (optional) registrieren
 * - AC2: Optional Stammdaten-Referenz (stammPersonId) für Autocomplete
 * - AC3: Duplikat-Validierung (409 Conflict bei gleicher Person)
 * - AC4: UI Feedback über strukturierte Error Responses
 *
 * Nach erfolgreicher Registrierung wird die Personenliste automatisch invalidiert.
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const registrierePerson = useRegistrierePerson();
 *
 * const handleSubmit = (values) => {
 *   registrierePerson.mutate(
 *     {
 *       einsatzId,
 *       dto: {
 *         vorname: values.vorname,
 *         nachname: values.nachname,
 *         funktion: values.funktion,
 *         funkrufname: values.funkrufname,
 *       },
 *     },
 *     {
 *       onSuccess: (person) => {
 *         toast.success(`${person.vorname} ${person.nachname} registriert`);
 *         closeDialog();
 *       },
 *       onError: (error) => {
 *         if (error.response?.status === 409) {
 *           toast.error('Person bereits im Einsatz registriert');
 *         } else {
 *           toast.error('Fehler beim Registrieren');
 *         }
 *       },
 *     }
 *   );
 * };
 * ```
 */
export const useRegistrierePerson = () => {
  const queryClient = useQueryClient();

  return useMutation<EinsatzPersonResponseDto, ResponseError, RegistrierePersonInput, MutationContext>({
    mutationFn: async ({ einsatzId, dto }) => {
      logger.debug('Registriere Person', { einsatzId, vorname: dto.vorname, nachname: dto.nachname });

      const response = await api.einsatzPersonen().einsatzPersonenControllerRegistrierePersonVAlpha({
        einsatzId,
        registrierePersonDto: dto,
      });

      // Response ist WrappedResponse<EinsatzPersonResponseDto> -> { data: ... }
      return response.data;
    },
    onMutate: async ({ einsatzId }) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId) });

      // Snapshot für Rollback
      const previousPersonen = queryClient.getQueryData<EinsatzPersonResponseDto[]>(EINSATZ_QUERY_KEYS.personen(einsatzId));

      return { previousPersonen };
    },
    onError: async (error, { einsatzId }, context) => {
      logger.error('Fehler beim Registrieren der Person', { error, einsatzId });

      // Rollback bei Fehler
      if (context?.previousPersonen) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.personen(einsatzId), context.previousPersonen);
      }
    },
    onSuccess: async (person, { einsatzId }) => {
      logger.info('Person erfolgreich registriert', { personId: person.id, einsatzId });

      // Optimistic Update: Neue Person zur Liste hinzufügen
      queryClient.setQueryData<EinsatzPersonResponseDto[]>(EINSATZ_QUERY_KEYS.personen(einsatzId), (old) => {
        if (!old) return [person];
        return [...old, person];
      });
    },
    onSettled: async (_data, _error, { einsatzId }) => {
      // Invalidierung: Server-Daten neu laden
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId) });
    },
    retry: 1,
    retryDelay: calculateRetryDelay,
  });
};
