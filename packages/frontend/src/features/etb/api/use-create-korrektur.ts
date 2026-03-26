/**
 * Create ETB Korrektur Entry Mutation Hook
 *
 * Hook fuer ETB-Korrektur-Eintrag-Erstellung (CQRS API).
 * Erstellt einen neuen Korrektur-Eintrag der den Original-Eintrag ersetzt.
 */

import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import type { AddKorrekturEintragDto, EintragDto, ResponseError } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ETB_QUERY_KEYS, calculateRetryDelay } from './queries';

export interface CreateKorrekturVariables {
  /**
   * ETB-ID
   */
  etbId: string;

  /**
   * Original-Eintrag-ID die korrigiert wird
   */
  eintragId: string;

  /**
   * Daten fuer den Korrektur-Eintrag
   */
  data: AddKorrekturEintragDto;
}

/**
 * Hook fuer ETB-Korrektur-Eintrag-Erstellung (CQRS API)
 *
 * Erstellt einen neuen Korrektur-Eintrag der den Original-Eintrag inhaltlich ersetzt.
 * Der Original-Eintrag bleibt unveraendert erhalten (Immutability).
 * Bei Erfolg werden automatisch alle ETB-Queries invalidiert.
 *
 * @returns Mutation fuer ETB-Korrektur-Erstellung
 *
 * @example
 * ```tsx
 * const createKorrektur = useCreateKorrektur();
 *
 * const handleKorrektur = (eintragId: string, data: AddKorrekturEintragDto) => {
 *   createKorrektur.mutate({
 *     etbId: 'etb-123',
 *     eintragId,
 *     data,
 *   });
 * };
 * ```
 */
export const useCreateKorrektur = () => {
  const queryClient = useQueryClient();

  return useMutation<EintragDto, ResponseError, CreateKorrekturVariables>({
    mutationFn: async ({ etbId, eintragId, data }) => {
      return await api.etb().etbCqrsControllerAddKorrekturEintragVAlpha({
        etbId,
        eintragId,
        addKorrekturEintragDto: data,
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ETB_QUERY_KEYS.all,
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Eintrag konnte nicht gespeichert werden.', 'createKorrekturEintrag');
      logger.error('Failed to save ETB entry (korrektur)', error);
      toast.error('Fehler', { description: message });
    },
    onSettled: async () => {
      // Invalidate all ETB queries to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ETB_QUERY_KEYS.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
