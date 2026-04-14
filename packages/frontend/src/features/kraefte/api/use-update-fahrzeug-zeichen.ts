/**
 * Mutation Hook zum Aktualisieren des taktischen Zeichens eines Fahrzeugs.
 *
 * Ruft PATCH auf den Fahrzeug-Zeichen-Endpoint auf und invalidiert
 * anschließend sowohl den Fahrzeug-Zeichen-Cache als auch die
 * Lagekarte-Zeichen (für Konsistenz der Kartenansicht).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { UpdateTaktischesZeichenDto } from '@bluelight-hub/shared/client';
import { KRAEFTE_QUERY_KEYS } from './queries';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from '@/features/taktische-zeichen/api/queries';

/** Parameter für die Fahrzeug-Zeichen-Mutation */
interface UpdateFahrzeugZeichenParams {
  /** Aktualisierte Zeichendaten */
  dto: UpdateTaktischesZeichenDto;
}

/**
 * Hook zum Aktualisieren des taktischen Zeichens eines Fahrzeugs.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch:
 * - Fahrzeug-Zeichen-Query (lokaler Cache)
 * - Taktische-Zeichen-Query des Einsatzes (Lagekarte-Konsistenz)
 *
 * @param einsatzId - Die Einsatz-ID
 * @param fahrzeugId - Die Fahrzeug-ID
 * @returns TanStack Mutation Result
 */
export function useUpdateFahrzeugZeichen(einsatzId: string, fahrzeugId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dto }: UpdateFahrzeugZeichenParams) => {
      const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerUpdateZeichenVAlpha({
        einsatzId,
        id: fahrzeugId,
        updateTaktischesZeichenDto: dto,
      });
      return response.data;
    },
    onSuccess: () => {
      // Fahrzeug-Zeichen-Cache invalidieren
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.fahrzeugZeichen(einsatzId, fahrzeugId),
      });
      // Lagekarte-Zeichen invalidieren (Konsistenz)
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Fahrzeug-Zeichen erfolgreich aktualisiert');
    },
    onError: (error) => {
      logger.error('Fehler beim Aktualisieren des Fahrzeug-Zeichens', error);
    },
  });
}
