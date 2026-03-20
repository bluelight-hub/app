/**
 * Create ETB Entry Mutation Hook
 *
 * Hook für ETB-Eintrag-Erstellung (CQRS API).
 */

import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { AddEintragDto, EintragDto, ResponseError } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ETB_QUERY_KEYS, calculateRetryDelay } from './queries';

export interface CreateEtbEntryVariables {
  /**
   * ETB-ID
   */
  etbId: string;

  /**
   * Daten für neuen ETB-Eintrag
   */
  data: AddEintragDto;
}

/**
 * Hook für ETB-Eintrag-Erstellung (CQRS API)
 *
 * Erstellt einen neuen Eintrag im Einsatztagebuch. Bei Erfolg werden
 * automatisch alle ETB-Queries invalidiert um Konsistenz sicherzustellen.
 *
 * @returns Mutation für ETB-Eintrag-Erstellung
 *
 * @example
 * ```tsx
 * const createEntry = useCreateEtbEntry();
 *
 * const handleSubmit = (data: AddEintragDto) => {
 *   createEntry.mutate({
 *     etbId: 'etb-123',
 *     data,
 *   });
 * };
 * ```
 */
export const useCreateEtbEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<EintragDto, ResponseError, CreateEtbEntryVariables>({
    mutationFn: async ({ etbId, data }) => {
      return await api.etb().etbCqrsControllerAddEintragVAlpha({
        etbId,
        addEintragDto: data,
      });
    },
    onMutate: async ({ etbId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ETB_QUERY_KEYS.all,
      });

      return { etbId };
    },
    onError: (error: ResponseError) => {
      logger.error('Failed to create ETB entry', error);
    },
    onSettled: async () => {
      // Invalidate all ETB queries to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ETB_QUERY_KEYS.all });
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
