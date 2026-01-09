/**
 * Mutation Hook zum Besetzen einer Rolle.
 *
 * **Story 6.1c - Rollen-Zuweisung (AC3):**
 * Weist eine EinsatzPerson einer RollenDefinition zu.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import { KRAEFTE_QUERY_KEYS } from './queries';
import type { BesetzeRolleDto } from '@bluelight-hub/shared/client';

/**
 * Extrahiert die Backend-Fehlermeldung aus einem ResponseError.
 * Der generierte API-Client wirft ResponseError mit statischer Nachricht,
 * aber die echte Fehlermeldung ist im Response-Body.
 */
async function extractErrorMessage(error: unknown): Promise<string> {
  // ResponseError hat ein response Property mit dem originalen Response-Objekt
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as { response: Response };
    try {
      const body = await responseError.response.clone().json();
      if (body && typeof body.message === 'string') {
        return body.message;
      }
    } catch {
      // JSON parsing fehlgeschlagen, ignorieren
    }
  }

  // Fallback auf Error.message
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unbekannter Fehler';
}

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
      try {
        const response = await api.rollenBesetzung().rollenBesetzungControllerBesetzeRolleVAlpha({
          einsatzId,
          besetzeRolleDto: dto,
        });
        return response.data;
      } catch (error) {
        // Extrahiere die echte Backend-Fehlermeldung und werfe neuen Error
        const message = await extractErrorMessage(error);
        throw new Error(message);
      }
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
