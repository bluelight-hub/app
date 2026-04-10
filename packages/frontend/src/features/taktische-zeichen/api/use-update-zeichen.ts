/**
 * Mutation Hook zum Aktualisieren eines taktischen Zeichens.
 *
 * Aktualisiert die Zeichendefinition, das Label oder die Notiz
 * eines bestehenden taktischen Zeichens.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import type { TaktischesZeichenResponseDto, UpdateTaktischesZeichenDto } from '@bluelight-hub/shared/client';
import { apiUpdateZeichen } from './taktische-zeichen-api';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from './queries';

interface UpdateZeichenParams {
  zeichenId: string;
  dto: UpdateTaktischesZeichenDto;
}

/**
 * Hook zum Aktualisieren eines taktischen Zeichens.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate } = useUpdateZeichen(einsatzId);
 *
 * mutate({ zeichenId: 'abc123', dto: { label: 'ELW-1' } });
 * ```
 */
export const useUpdateZeichen = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zeichenId, dto }: UpdateZeichenParams): Promise<TaktischesZeichenResponseDto> => {
      return await apiUpdateZeichen(einsatzId, zeichenId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Taktisches Zeichen erfolgreich aktualisiert');
    },
    onError: (error) => {
      logger.error('Fehler beim Aktualisieren des taktischen Zeichens', error);
    },
  });
};
