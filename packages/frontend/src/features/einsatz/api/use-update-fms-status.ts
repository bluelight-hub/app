/**
 * Mutation Hook für FMS-Status Update
 *
 * Aktualisiert den FMS-Status eines Fahrzeugs im Einsatz.
 * Implementiert Optimistic Updates für sofortiges UI-Feedback.
 *
 * @module features/einsatz/api
 */

import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto, GeoPositionDto, ResponseError, UpdateFmsStatusDto } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Input für FMS-Status Update
 */
interface UpdateFmsStatusInput {
  fahrzeugId: string;
  fmsStatus: number;
  position?: GeoPositionDto;
}

/**
 * Context für Optimistic Updates
 */
interface MutationContext {
  previousFahrzeuge?: EinsatzFahrzeugDto[];
  einsatzId: string;
}

/**
 * Hook zum Aktualisieren des FMS-Status eines Einsatzfahrzeugs
 *
 * Implementiert Story 3-3 (FMS-Status updaten):
 * - AC1: FMS-Status über PATCH Endpoint aktualisieren
 * - AC2: Optional GPS-Position mitschicken
 * - AC3: Optimistic Update für sofortiges UI-Feedback
 * - AC4: Rollback bei Fehler
 *
 * Nach erfolgreicher Mutation wird die Fahrzeugliste automatisch invalidiert.
 *
 * @param einsatzId - UUID des Einsatzes
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const updateStatus = useUpdateFmsStatus(einsatzId);
 *
 * const handleStatusChange = (fahrzeugId: string, newStatus: number) => {
 *   updateStatus.mutate(
 *     { fahrzeugId, fmsStatus: newStatus },
 *     {
 *       onSuccess: (fahrzeug) => {
 *         toast.success(`Status auf ${fahrzeug.fmsStatus} gesetzt`);
 *       },
 *       onError: (error) => {
 *         if (error.response?.status === 404) {
 *           toast.error('Fahrzeug nicht gefunden');
 *         } else {
 *           toast.error('Fehler beim Aktualisieren');
 *         }
 *       },
 *     }
 *   );
 * };
 * ```
 */
export const useUpdateFmsStatus = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation<EinsatzFahrzeugDto, ResponseError, UpdateFmsStatusInput, MutationContext>({
    mutationFn: async ({ fahrzeugId, fmsStatus, position }) => {
      logger.debug('Update FMS-Status', { einsatzId, fahrzeugId, fmsStatus });

      const dto: UpdateFmsStatusDto = {
        fmsStatus,
        position: position ? { lat: position.lat, lng: position.lng } : undefined,
      };

      return api.einsatzFahrzeuge().einsatzFahrzeugeControllerUpdateFmsStatusVAlpha({
        einsatzId,
        id: fahrzeugId,
        updateFmsStatusDto: dto,
      });
    },
    onMutate: async (variables) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });

      // Snapshot für Rollback
      const previousFahrzeuge = queryClient.getQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId));

      // Warnung wenn Snapshot fehlschlägt
      if (!previousFahrzeuge) {
        logger.warn('Optimistic Update: Kein vorheriger Snapshot verfügbar', {
          einsatzId,
          fahrzeugId: variables.fahrzeugId,
        });
      }

      // Optimistic Update: FMS-Status sofort ändern
      queryClient.setQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), (old) => {
        if (!old) {
          logger.warn('Optimistic Update: Keine bestehenden Fahrzeugdaten gefunden', {
            einsatzId,
            fahrzeugId: variables.fahrzeugId,
          });
          return old;
        }
        return old.map((f) =>
          f.id === variables.fahrzeugId
            ? {
                ...f,
                fmsStatus: variables.fmsStatus,
                position: variables.position ?? f.position,
              }
            : f,
        );
      });

      return { previousFahrzeuge, einsatzId };
    },
    onError: async (error, { fahrzeugId }, context) => {
      logger.error('Fehler beim Aktualisieren des FMS-Status', { error, einsatzId: context?.einsatzId, fahrzeugId });

      // Rollback bei Fehler
      if (context?.einsatzId) {
        if (context.previousFahrzeuge) {
          // Rollback mit Snapshot
          queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(context.einsatzId), context.previousFahrzeuge);
        } else {
          // Fallback: Invalidierung wenn kein Snapshot vorhanden
          logger.warn('Optimistic Update Rollback: Kein Snapshot verfügbar, invalidiere Query', {
            einsatzId: context.einsatzId,
            fahrzeugId,
          });
          await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(context.einsatzId) });
        }
      }
    },
    onSuccess: async (fahrzeug, _variables, context) => {
      logger.info('FMS-Status erfolgreich aktualisiert', {
        fahrzeugId: fahrzeug.id,
        fmsStatus: fahrzeug.fmsStatus,
        einsatzId: context?.einsatzId,
      });

      // Invalidierung nur bei Success: Server-Daten neu laden
      if (context?.einsatzId) {
        await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(context.einsatzId) });
      }
    },
    retry: 1,
    retryDelay: calculateRetryDelay,
  });
};
