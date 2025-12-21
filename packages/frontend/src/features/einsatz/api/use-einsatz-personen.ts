/**
 * Query Hook für EinsatzPersonen (Story 4-1)
 *
 * Lädt alle Personen eines Einsatzes und ermöglicht Registrierung neuer Personen.
 *
 * @module features/einsatz/api
 */

import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzPersonResponseDto, RegistrierePersonDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Hook zum Laden aller EinsatzPersonen eines Einsatzes
 *
 * Verwendet hierarchische Query Keys für granulare Cache-Invalidierung.
 * Bei Fehlern werden automatisch Retries mit Exponential Backoff durchgeführt.
 *
 * @param einsatzId - CUID2 des Einsatzes
 * @param options - Optionale Query-Optionen (enabled, staleTime, etc.)
 * @returns TanStack Query Result mit EinsatzPersonResponseDto Array
 *
 * @example
 * ```tsx
 * const { data: personen, isLoading, error } = useEinsatzPersonen(einsatzId);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <ul>
 *     {personen?.map((person) => (
 *       <li key={person.id}>{person.vorname} {person.nachname}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export const useEinsatzPersonen = (einsatzId: string | null, options?: { enabled?: boolean }) => {
  return useQuery<EinsatzPersonResponseDto[], ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId ?? ''),
    queryFn: async () => {
      if (!einsatzId) {
        return [];
      }
      logger.debug('Fetching EinsatzPersonen', { einsatzId });
      // WrappedResponse: { data: [...], meta: {...} }
      const response = await api.einsatzPersonen().einsatzPersonenControllerFindAllVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId && (options?.enabled ?? true),
    staleTime: 30_000, // 30 Sekunden
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Mutation Hook zum Registrieren einer Person für einen Einsatz
 *
 * Implementiert Story 4-1 (Person manuell registrieren):
 * - AC1: Pflichtfelder: Vorname, Nachname, Funktion
 * - AC2: Optional: Funkrufname, StammPerson-Referenz, Qualifikationen
 * - AC3: Duplikat-Validierung (409 Conflict)
 * - AC4: UI Feedback über strukturierte Error Responses
 *
 * Invalidiert automatisch relevante Queries nach erfolgreicher Mutation:
 * - EinsatzPersonen Liste des Einsatzes
 * - ETB des Einsatzes (da neuer Eintrag erstellt wird)
 *
 * @returns TanStack Mutation Hook
 *
 * @example
 * ```tsx
 * const registrierePerson = useRegistrierePerson();
 *
 * const handleRegistrierung = async () => {
 *   const result = await registrierePerson.mutateAsync({
 *     einsatzId: 'abc-123',
 *     vorname: 'Max',
 *     nachname: 'Mustermann',
 *     funktion: 'Gruppenführer',
 *     funkrufname: 'GF',
 *   });
 *
 *   if (result.data) {
 *     toast.success('Person registriert');
 *   }
 * };
 * ```
 */
export const useRegistrierePerson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegistrierePersonDto & { einsatzId: string }) => {
      logger.info('Registriere Person', {
        einsatzId: data.einsatzId,
        vorname: data.vorname,
        nachname: data.nachname,
        funktion: data.funktion,
      });

      return api.einsatzPersonen().einsatzPersonenControllerRegistrierePersonVAlpha({
        einsatzId: data.einsatzId,
        registrierePersonDto: {
          vorname: data.vorname,
          nachname: data.nachname,
          funktion: data.funktion,
          funkrufname: data.funkrufname,
          stammPersonId: data.stammPersonId,
          qualifikationIds: data.qualifikationIds,
        },
      });
    },
    onSuccess: (result, variables) => {
      logger.debug('Person erfolgreich registriert', {
        einsatzId: variables.einsatzId,
        personId: result.data?.id,
      });

      // Invalidate EinsatzPersonen Liste
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.personen(variables.einsatzId),
      });

      // Invalidate Einsatz Detail (personenCount aktualisieren)
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.detail(variables.einsatzId),
      });

      // Invalidate ETB (neuer Eintrag wurde erstellt)
      // Partial match: ['etb', 'einsatz', einsatzId] invalidiert alle ETB-Queries
      // unabhängig von includeDeleted Parameter
      queryClient.invalidateQueries({
        queryKey: ['etb', 'einsatz', variables.einsatzId],
      });
    },
    onError: (error: ResponseError, variables) => {
      logger.error('Fehler beim Registrieren der Person', {
        einsatzId: variables.einsatzId,
        error: error.message,
      });
    },
  });
};
