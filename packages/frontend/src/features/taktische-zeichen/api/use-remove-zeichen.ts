/**
 * Mutation Hook zum Entfernen eines taktischen Zeichens.
 *
 * Löscht ein taktisches Zeichen aus dem Einsatz.
 * Entfernt das Zeichen auch von der Lagekarte falls platziert.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import { apiRemoveZeichen } from './taktische-zeichen-api';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from './queries';

/**
 * Hook zum Entfernen eines taktischen Zeichens.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate } = useRemoveZeichen(einsatzId);
 *
 * mutate('zeichen-id');
 * ```
 */
export const useRemoveZeichen = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zeichenId: string): Promise<void> => {
      await apiRemoveZeichen(einsatzId, zeichenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Taktisches Zeichen erfolgreich entfernt');
    },
    onError: (error) => {
      logger.error('Fehler beim Entfernen des taktischen Zeichens', error);
    },
  });
};
