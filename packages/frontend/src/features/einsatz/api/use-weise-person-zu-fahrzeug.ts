/**
 * Mutation Hooks für Fahrzeug-Zuweisung von Personen (Story 4-3)
 *
 * Ermöglicht das Zuweisen und Entfernen von Personen zu/von Fahrzeugen.
 * Implementiert Optimistic Updates für sofortige UI-Reaktion.
 *
 * @module features/einsatz/api
 */

import { api } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import type { EinsatzFahrzeugDto, EinsatzPersonResponseDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Input für die Fahrzeug-Zuweisung einer Person
 */
interface WeiseZuFahrzeugInput {
  personId: string;
  fahrzeugId: string;
}

/**
 * Context für Optimistic Updates bei Fahrzeug-Zuweisung
 */
interface ZuweisungContext {
  previousPersonen?: EinsatzPersonResponseDto[];
  previousFahrzeuge?: EinsatzFahrzeugDto[];
}

/**
 * Context für Optimistic Updates bei Fahrzeug-Entfernung
 */
interface EntfernungContext {
  previousPersonen?: EinsatzPersonResponseDto[];
  previousFahrzeuge?: EinsatzFahrzeugDto[];
}

/**
 * Hook zum Zuweisen einer Person zu einem Fahrzeug
 *
 * Implementiert Story 4-3 (Fahrzeug-Zuweisung):
 * - AC1: Person kann einem Fahrzeug zugewiesen werden
 * - AC2: Zuweisung erzeugt ETB-Eintrag
 * - AC3: UI zeigt Person im Fahrzeug an
 * - AC4: Optimistic Update mit Rollback bei Fehler
 *
 * Nach erfolgreicher Zuweisung werden alle relevanten Queries invalidiert:
 * - EinsatzPersonen Liste (aktualisierte fahrzeugId)
 * - EinsatzFahrzeuge Liste (aktualisierte besatzung)
 * - ETB des Einsatzes (neuer Eintrag)
 *
 * @param einsatzId - CUID2 des Einsatzes
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const weiseZu = useWeisePersonZuFahrzeugZu(einsatzId);
 *
 * const handleZuweisung = (personId: string, fahrzeugId: string) => {
 *   weiseZu.mutate(
 *     { personId, fahrzeugId },
 *     {
 *       onSuccess: (response) => {
 *         // Success Toast wird automatisch angezeigt
 *       },
 *       onError: (error) => {
 *         // Error Toast wird automatisch angezeigt
 *       },
 *     }
 *   );
 * };
 * ```
 */
export const useWeisePersonZuFahrzeugZu = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, ResponseError, WeiseZuFahrzeugInput, ZuweisungContext>({
    mutationFn: async ({ personId, fahrzeugId }) => {
      logger.debug('Weise Person zu Fahrzeug zu', { einsatzId, personId, fahrzeugId });

      await api.einsatzPersonen().einsatzPersonenControllerWeiseZuFahrzeugVAlpha({
        einsatzId,
        personId,
        weisePersonZuFahrzeugZuDto: { fahrzeugId },
      });
    },
    onMutate: async ({ personId, fahrzeugId }) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId) });
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });

      // Snapshots für Rollback
      const previousPersonen = queryClient.getQueryData<EinsatzPersonResponseDto[]>(EINSATZ_QUERY_KEYS.personen(einsatzId));
      const previousFahrzeuge = queryClient.getQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId));

      // F4 Fix: Idempotency Guard - Skip optimistic update wenn Person bereits zugewiesen
      const person = previousPersonen?.find((p) => p.id === personId);
      if (person?.fahrzeugId === fahrzeugId) {
        // Person ist bereits diesem Fahrzeug zugewiesen - skip optimistic update
        return { previousPersonen, previousFahrzeuge };
      }

      // Optimistic Update: Person fahrzeugId setzen
      if (previousPersonen) {
        const updatedPersonen = previousPersonen.map((p) => (p.id === personId ? { ...p, fahrzeugId } : p));
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.personen(einsatzId), updatedPersonen);
      }

      // Optimistic Update: Person zur Fahrzeug-Besatzung hinzufügen
      if (previousFahrzeuge && previousPersonen && person) {
        const updatedFahrzeuge = previousFahrzeuge.map((f) => {
          // ZUERST: Person von ALLEN Fahrzeugen entfernen (inkl. Ziel-Fahrzeug)
          let besatzung = (f.besatzung || []).filter((b) => b.id !== personId);

          // DANN: Person NUR zum Ziel-Fahrzeug hinzufügen
          if (f.id === fahrzeugId) {
            besatzung = [...besatzung, { ...person, fahrzeugId }];
          }

          return { ...f, besatzung };
        });
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), updatedFahrzeuge);
      }

      return { previousPersonen, previousFahrzeuge };
    },
    onError: async (error, { personId, fahrzeugId }, context) => {
      logger.error('Fehler beim Zuweisen der Person zu Fahrzeug', { error, einsatzId, personId, fahrzeugId });

      // Rollback bei Fehler
      if (context?.previousPersonen) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.personen(einsatzId), context.previousPersonen);
      }
      if (context?.previousFahrzeuge) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), context.previousFahrzeuge);
      }

      toast.error('Fehler beim Zuweisen der Person zum Fahrzeug');
    },
    onSuccess: async (_data, { fahrzeugId }) => {
      logger.info('Person erfolgreich zu Fahrzeug zugewiesen', { einsatzId, fahrzeugId });

      // Fahrzeug-Daten abrufen für Toast
      const fahrzeuge = queryClient.getQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId));
      const fahrzeug = fahrzeuge?.find((f) => f.id === fahrzeugId);
      const funkrufname = fahrzeug?.funkrufname || 'Fahrzeug';

      toast.success(`Person zu ${funkrufname} zugewiesen`);
    },
    onSettled: async () => {
      // Invalidierung: Server-Daten neu laden
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId) });
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });

      // F2 Fix: Prefix matching für ETB-Queries (verhindert Over-Invalidation)
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'etb' && query.queryKey[1] === 'einsatz' && query.queryKey[2] === einsatzId,
      });
    },
    retry: 1,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook zum Entfernen einer Person von einem Fahrzeug
 *
 * Implementiert Story 4-3 (Fahrzeug-Zuweisung aufheben):
 * - AC1: Person kann von Fahrzeug entfernt werden
 * - AC2: Entfernung erzeugt ETB-Eintrag
 * - AC3: UI zeigt Person als "nicht zugewiesen" an
 * - AC4: Optimistic Update mit Rollback bei Fehler
 *
 * Nach erfolgreicher Entfernung werden alle relevanten Queries invalidiert:
 * - EinsatzPersonen Liste (fahrzeugId = null)
 * - EinsatzFahrzeuge Liste (Person aus besatzung entfernt)
 * - ETB des Einsatzes (neuer Eintrag)
 *
 * @param einsatzId - CUID2 des Einsatzes
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const entferneVonFahrzeug = useEntfernePersonVonFahrzeug(einsatzId);
 *
 * const handleEntfernung = (personId: string) => {
 *   entferneVonFahrzeug.mutate(
 *     { personId },
 *     {
 *       onSuccess: () => {
 *         // Success Toast wird automatisch angezeigt
 *       },
 *     }
 *   );
 * };
 * ```
 */
export const useEntfernePersonVonFahrzeug = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, ResponseError, { personId: string }, EntfernungContext>({
    mutationFn: async ({ personId }) => {
      logger.debug('Entferne Person von Fahrzeug', { einsatzId, personId });

      await api.einsatzPersonen().einsatzPersonenControllerEntferneVonFahrzeugVAlpha({
        einsatzId,
        personId,
      });
    },
    onMutate: async ({ personId }) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId) });
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });

      // Snapshots für Rollback
      const previousPersonen = queryClient.getQueryData<EinsatzPersonResponseDto[]>(EINSATZ_QUERY_KEYS.personen(einsatzId));
      const previousFahrzeuge = queryClient.getQueryData<EinsatzFahrzeugDto[]>(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId));

      // Optimistic Update: Person fahrzeugId entfernen
      if (previousPersonen) {
        const updatedPersonen = previousPersonen.map((p) => (p.id === personId ? { ...p, fahrzeugId: null } : p));
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.personen(einsatzId), updatedPersonen);
      }

      // Optimistic Update: Person von Fahrzeug-Besatzung entfernen
      if (previousFahrzeuge) {
        const updatedFahrzeuge = previousFahrzeuge.map((f) => {
          const besatzung = (f.besatzung || []).filter((b) => b.id !== personId);
          return { ...f, besatzung };
        });
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), updatedFahrzeuge);
      }

      return { previousPersonen, previousFahrzeuge };
    },
    onError: async (error, { personId }, context) => {
      logger.error('Fehler beim Entfernen der Person von Fahrzeug', { error, einsatzId, personId });

      // Rollback bei Fehler
      if (context?.previousPersonen) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.personen(einsatzId), context.previousPersonen);
      }
      if (context?.previousFahrzeuge) {
        queryClient.setQueryData(EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId), context.previousFahrzeuge);
      }

      toast.error('Fehler beim Entfernen der Person vom Fahrzeug');
    },
    onSuccess: async () => {
      logger.info('Person erfolgreich von Fahrzeug entfernt', { einsatzId });

      toast.success('Zuweisung aufgehoben');
    },
    onSettled: async () => {
      // Invalidierung: Server-Daten neu laden
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId) });
      await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId) });

      // F2 Fix: Prefix matching für ETB-Queries (verhindert Over-Invalidation)
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'etb' && query.queryKey[1] === 'einsatz' && query.queryKey[2] === einsatzId,
      });
    },
    retry: 1,
    retryDelay: calculateRetryDelay,
  });
};
