/**
 * Mutation Hook zum Erstellen eines taktischen Zeichens.
 *
 * Erstellt ein neues taktisches Zeichen im Einsatz.
 * Das Zeichen ist zunächst nicht auf der Karte platziert.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import type { CreateTaktischesZeichenDto, TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { apiCreateZeichen } from './taktische-zeichen-api';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from './queries';

/**
 * Hook zum Erstellen eines neuen taktischen Zeichens.
 *
 * Invalidiert die Zeichen-Liste des Einsatzes nach erfolgreicher Erstellung.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useCreateZeichen(einsatzId);
 *
 * mutate({ zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig' } });
 * ```
 */
export const useCreateZeichen = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTaktischesZeichenDto): Promise<TaktischesZeichenResponseDto> => {
      return await apiCreateZeichen(einsatzId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Taktisches Zeichen erfolgreich erstellt');
    },
    onError: (error) => {
      logger.error('Fehler beim Erstellen des taktischen Zeichens', error);
    },
  });
};
