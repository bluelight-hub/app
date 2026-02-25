/**
 * Einsatz Teilnahme Hooks
 *
 * TanStack Query Hooks für Einsatz-Teilnehmer-Management (Beitritt mit Funkrufname).
 * Ermöglicht das Abrufen und Setzen des User-Funkrufnamens für einen Einsatz.
 */

import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import type { EinsatzTeilnehmerControllerGetAllTeilnehmerVAlpha200Response, EinsatzTeilnehmerControllerJoinEinsatzVAlpha201Response, JoinEinsatzDto, ResponseError } from '@/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EINSATZ_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Query Key Factory für Einsatz-Teilnahme
 */
export const TEILNAHME_QUERY_KEYS = {
  all: ['einsatz-teilnahme'] as const,
  byEinsatz: (einsatzId: string) => [...TEILNAHME_QUERY_KEYS.all, einsatzId] as const,
  allTeilnehmer: (einsatzId: string) => [...TEILNAHME_QUERY_KEYS.all, 'all', einsatzId] as const,
} as const;

/**
 * Hook zum Abrufen der eigenen Teilnahme an einem Einsatz
 *
 * Gibt die aktuelle Teilnahme des Users am Einsatz zurück, inklusive
 * des gewählten Funkrufnamens. Null wenn nicht beigetreten.
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query Result mit Teilnahme-Daten oder null
 *
 * @example
 * ```tsx
 * const { data: teilnahme } = useMyEinsatzTeilnahme(einsatzId);
 * const personName = `${teilnahme?.data?.personVorname} ${teilnahme?.data?.personNachname}`;
 * ```
 */
export const useMyEinsatzTeilnahme = (einsatzId: string | undefined) => {
  return useQuery<EinsatzTeilnehmerControllerJoinEinsatzVAlpha201Response | null, ResponseError>({
    queryKey: TEILNAHME_QUERY_KEYS.byEinsatz(einsatzId ?? ''),
    queryFn: async () => {
      if (!einsatzId) return null;
      try {
        return await api.einsatzTeilnehmer().einsatzTeilnehmerControllerGetMyTeilnahmeVAlpha({
          einsatzId,
        });
      } catch (error) {
        // 404 bedeutet "nicht beigetreten" - das ist OK
        if ((error as ResponseError)?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!einsatzId,
    staleTime: 30_000, // 30 Sekunden - Teilnahme ändert sich selten
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook zum Beitreten eines Einsatzes mit Funkrufname
 *
 * Erstellt oder aktualisiert die Teilnahme des Users am Einsatz.
 * Bei bestehendem Eintrag wird nur der Funkrufname aktualisiert.
 *
 * @returns Mutation für Einsatz-Beitritt
 *
 * @example
 * ```tsx
 * const joinEinsatz = useJoinEinsatz();
 *
 * const handleJoin = (funkrufname: string) => {
 *   joinEinsatz.mutate({
 *     einsatzId,
 *     data: { funkrufname },
 *   });
 * };
 * ```
 */
export const useJoinEinsatz = () => {
  const queryClient = useQueryClient();

  return useMutation<EinsatzTeilnehmerControllerJoinEinsatzVAlpha201Response, ResponseError, { einsatzId: string; data: JoinEinsatzDto }>({
    mutationFn: async ({ einsatzId, data }) => {
      return await api.einsatzTeilnehmer().einsatzTeilnehmerControllerJoinEinsatzVAlpha({
        einsatzId,
        joinEinsatzDto: data,
      });
    },
    onMutate: async ({ einsatzId }) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({
        queryKey: TEILNAHME_QUERY_KEYS.byEinsatz(einsatzId),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Dem Einsatz konnte nicht beigetreten werden.', 'joinEinsatz');
      logger.error('Failed to join Einsatz', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: (_data, { einsatzId }) => {
      toast.success('Einsatz beigetreten', {
        description: 'Du nimmst jetzt am Einsatz teil.',
      });
      // Teilnahme-Query invalidieren
      queryClient.invalidateQueries({
        queryKey: TEILNAHME_QUERY_KEYS.byEinsatz(einsatzId),
      });
    },
    onSettled: (_data, _error, { einsatzId }) => {
      // Einsatz-bezogene Queries invalidieren für UI-Updates
      queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TEILNAHME_QUERY_KEYS.byEinsatz(einsatzId) });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};

/**
 * Hook zum Aktualisieren des Funkrufnamens für einen Einsatz
 *
 * Kurzform von useJoinEinsatz für den Fall, dass nur der
 * Funkrufname aktualisiert werden soll.
 *
 * @returns Mutation für Funkrufname-Update
 */
export const useUpdateFunkrufname = () => {
  // Verwendet intern useJoinEinsatz - Backend behandelt Upsert
  return useJoinEinsatz();
};

/**
 * Hook zum Abrufen aller aktiven Teilnehmer eines Einsatzes
 *
 * Gibt alle aktiven Teilnehmer mit ihren Funkrufnamen zurück.
 * Wird für ETB-Absender/Empfänger Autocomplete-Vorschläge verwendet.
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query Result mit Liste aller Teilnehmer
 *
 * @example
 * ```tsx
 * const { data: teilnehmer } = useEinsatzTeilnehmer(einsatzId);
 * const personNames = teilnehmer?.data?.map(t => `${t.personVorname} ${t.personNachname}`) ?? [];
 * ```
 */
export const useEinsatzTeilnehmer = (einsatzId: string | null | undefined) => {
  return useQuery<EinsatzTeilnehmerControllerGetAllTeilnehmerVAlpha200Response | null, ResponseError>({
    queryKey: TEILNAHME_QUERY_KEYS.allTeilnehmer(einsatzId ?? ''),
    queryFn: async () => {
      if (!einsatzId) return null;
      return await api.einsatzTeilnehmer().einsatzTeilnehmerControllerGetAllTeilnehmerVAlpha({
        einsatzId,
      });
    },
    enabled: !!einsatzId,
    staleTime: 30_000, // 30 Sekunden - Teilnehmerliste ändert sich selten
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
