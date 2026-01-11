import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/shared';
import type { LagekarteControllerGetLagekarteVAlpha200Response, SaveLagekarteStateDto } from '@/shared';
import type * as GeoJSON from 'geojson';
import { z } from 'zod';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * Zod-Schema für GeoJSON FeatureCollection Validierung
 *
 * @remarks
 * Validiert die Grundstruktur einer GeoJSON FeatureCollection für Lagekarte-State.
 * Tiefe Validierung der Features wird nicht durchgeführt, da das Format variabel ist.
 */
const geoJsonFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      geometry: z.object({
        type: z.string(),
        coordinates: z.unknown(),
      }),
      properties: z.record(z.unknown()).nullable(),
    }),
  ),
});

/**
 * TanStack Mutation Hook zum Speichern des Lagekarte-State (GeoJSON)
 *
 * @param einsatzId - Die ID des Einsatzes (für Query Invalidation)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query Mutation für State-Persistierung
 * - State enthält GeoJSON FeatureCollection mit Zeichnungen (Polygone, Linien, Rechtecke)
 * - Nach erfolgreicher Speicherung wird die Lagekarte-Query neu gefetcht (invalidateQueries)
 * - OnSuccess: Invalidiert `LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId)` Query
 * - Security: Validiert GeoJSON-Struktur und Payload-Größe (max 2MB)
 *
 * @example
 * ```tsx
 * const saveLagekarteStateMutation = useSaveLagekarteState('einsatz-123');
 *
 * saveLagekarteStateMutation.mutate({
 *   type: 'FeatureCollection',
 *   features: [...shapes]
 * });
 * ```
 */
export const useSaveLagekarteState = (einsatzId: string): UseMutationResult<LagekarteControllerGetLagekarteVAlpha200Response, Error, GeoJSON.FeatureCollection> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (state: GeoJSON.FeatureCollection) => {
      // Validate GeoJSON structure with Zod schema
      const parseResult = geoJsonFeatureCollectionSchema.safeParse(state);
      if (!parseResult.success) {
        throw new Error(`Invalid GeoJSON FeatureCollection: ${parseResult.error.message}`);
      }

      // Validate payload size (max 2MB)
      const payloadSize = JSON.stringify(state).length;
      const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        throw new Error(`Payload zu groß: ${Math.round(payloadSize / 1024)}KB (max 2MB)`);
      }

      // Call API - parseResult.data ist bereits validiert und typsicher
      const dto: SaveLagekarteStateDto = {
        einsatzId,
        state: parseResult.data as object, // Sicher durch Zod-Validierung
      };

      return await api.lagekarte().lagekarteControllerSaveLagekarteStateVAlpha({
        einsatzId,
        saveLagekarteStateDto: dto,
      });
    },
    onSuccess: () => {
      // Invalidate Lagekarte-Query um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId) });
    },
    networkMode: 'offlineFirst', // Queue mutations when offline (AC: IV2)
  });
};
