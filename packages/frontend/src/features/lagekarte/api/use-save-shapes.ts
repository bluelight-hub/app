import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { toast } from 'sonner';
import type * as GeoJSON from 'geojson';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * Hook zum Speichern von Shapes (GeoJSON FeatureCollection)
 *
 * @param einsatzId - Einsatz-ID
 * @returns TanStack Mutation für Shape-Speicherung
 *
 * @example
 * ```tsx
 * const saveMutation = useSaveShapes(einsatzId);
 *
 * // Shapes speichern
 * saveMutation.mutate(shapes, {
 *   onSuccess: () => toast.success('Gespeichert'),
 * });
 * ```
 */
export const useSaveShapes = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shapes: GeoJSON.FeatureCollection) => {
      return await api.lagekarte().lagekarteControllerSaveLagekarteStateVAlpha({
        einsatzId,
        saveLagekarteStateDto: {
          state: shapes,
        },
      });
    },
    onSuccess: (_data) => {
      // Invalidate Lagekarte Query um frischen State zu holen
      queryClient.invalidateQueries({
        queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
      });

      // Optional: Optimistic Update (wird aktuell nicht verwendet, da Backend als Source of Truth gilt)
    },
    onError: (error) => {
      console.error('[useSaveShapes] Error saving shapes:', error);
      toast.error('Fehler beim Speichern der Lagekarte');
    },
  });
};
