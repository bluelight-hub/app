/**
 * Mutation Hook zum Aktualisieren des taktischen Zeichens einer Einheit.
 *
 * Ruft PATCH auf den Einheit-Zeichen-Endpoint auf und invalidiert
 * anschließend sowohl den Einheit-Zeichen-Cache als auch die
 * Lagekarte-Zeichen (für Konsistenz der Kartenansicht).
 *
 * Issue #667 — Einsatz-Einheiten: Taktische Zeichen zuweisen & Lagekarte anzeigen
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { UpdateTaktischesZeichenDto } from '@bluelight-hub/shared/client';
import { KRAEFTE_QUERY_KEYS } from './queries';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from '@/features/taktische-zeichen/api/queries';

/** Parameter für die Einheit-Zeichen-Mutation */
interface UpdateEinheitZeichenParams {
  /** Aktualisierte Zeichendaten */
  dto: UpdateTaktischesZeichenDto;
}

/**
 * Hook zum Aktualisieren des taktischen Zeichens einer Einheit.
 *
 * Verwendet den generierten API-Client und invalidiert automatisch:
 * - Einheit-Zeichen-Query (lokaler Cache)
 * - Taktische-Zeichen-Query des Einsatzes (Lagekarte-Konsistenz)
 *
 * @param einsatzId - Die Einsatz-ID
 * @param einheitId - Die Einheit-ID
 * @returns TanStack Mutation Result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateEinheitZeichen(einsatzId, einheitId);
 *
 * const handleSave = (definition: ZeichenDefinition, label?: string) => {
 *   mutate({ dto: { zeichenDefinition: definition, label } });
 * };
 * ```
 */
export function useUpdateEinheitZeichen(einsatzId: string, einheitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dto }: UpdateEinheitZeichenParams) => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerUpdateZeichenVAlpha({
        einsatzId,
        einheitId,
        updateTaktischesZeichenDto: dto,
      });
      return response.data;
    },
    onSuccess: () => {
      // Einheit-Zeichen-Cache invalidieren
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.einheitZeichen(einsatzId, einheitId),
      });
      // Lagekarte-Zeichen invalidieren (Konsistenz)
      queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId),
      });
      logger.info('Einheit-Zeichen erfolgreich aktualisiert');
    },
    onError: (error) => {
      logger.error('Fehler beim Aktualisieren des Einheit-Zeichens', error);
    },
  });
}
