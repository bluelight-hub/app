/**
 * Mutation Hook zum Platzieren/Verschieben eines taktischen Zeichens.
 *
 * Setzt oder aktualisiert die Kartenposition (lat/lng) eines Zeichens
 * und verknüpft es mit einer Lagekarte.
 * Optimistisches Update: Position wird sofort im Cache aktualisiert.
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

export const usePlaceZeichen = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zeichenId, dto }: PlaceZeichenParams): Promise<TaktischesZeichenResponseDto> => {
      return await apiPlaceZeichen(einsatzId, zeichenId, dto);
    },
    onMutate: async ({ zeichenId, dto }) => {
      // Laufende Queries abbrechen, damit sie das optimistische Update nicht überschreiben
      await queryClient.cancelQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });

      // Vorherigen Cache-Wert sichern (für Rollback bei Fehler)
      const previousZeichen = queryClient.getQueryData<TaktischesZeichenResponseDto[]>(TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId));

      // Optimistisches Update: Position sofort aktualisieren
      if (previousZeichen) {
        queryClient.setQueryData<TaktischesZeichenResponseDto[]>(TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId), (old) =>
          old?.map((z) => (z.id === zeichenId ? { ...z, lat: dto.lat, lng: dto.lng, lagekarteId: dto.lagekarteId, istPlatziert: true } : z)),
        );
      }

      return { previousZeichen };
    },
    onError: (error, _variables, context) => {
      // Rollback bei Fehler
      if (context?.previousZeichen) {
        queryClient.setQueryData(TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId), context.previousZeichen);
      }
      logger.error('Fehler beim Platzieren des taktischen Zeichens', error);
    },
    onSettled: () => {
      // Nach Erfolg oder Fehler: Cache revalidieren
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
    },
  });
};
