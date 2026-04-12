/**
 * Mutation Hook zum Platzieren/Verschieben eines taktischen Zeichens.
 *
 * Setzt oder aktualisiert die Kartenposition (lat/lng) eines Zeichens
 * und verknüpft es mit einer Lagekarte.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import type { PlatziereZeichenDto, TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { apiPlaceZeichen } from './taktische-zeichen-api';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from './queries';

interface PlaceZeichenParams {
  zeichenId: string;
  dto: PlatziereZeichenDto;
}

/**
 * Hook zum Platzieren oder Verschieben eines taktischen Zeichens auf der Karte.
 *
 * Wird sowohl für die Erstplatzierung als auch für das Verschieben (Drag & Drop)
 * auf der Lagekarte verwendet.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate } = usePlaceZeichen(einsatzId);
 *
 * mutate({ zeichenId: 'abc123', dto: { lagekarteId: 'lk1', lat: 51.5, lng: 9.3 } });
 * ```
 */
export const usePlaceZeichen = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zeichenId, dto }: PlaceZeichenParams): Promise<TaktischesZeichenResponseDto> => {
      return await apiPlaceZeichen(einsatzId, zeichenId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Taktisches Zeichen erfolgreich platziert');
    },
    onError: (error) => {
      logger.error('Fehler beim Platzieren des taktischen Zeichens', error);
    },
  });
};
