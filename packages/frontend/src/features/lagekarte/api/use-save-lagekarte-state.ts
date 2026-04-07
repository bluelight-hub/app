import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FeatureCollection } from 'geojson';
import { api } from '@/shared';
import { LAGEKARTE_QUERY_KEYS } from './queries';

/**
 * Mutation Hook zum Speichern des Lagekarte-Zeichnungs-States
 *
 * Sendet eine GeoJSON FeatureCollection an das Backend und
 * invalidiert anschließend den Lagekarte-Cache.
 */
export function useSaveLagekarteState(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (state: FeatureCollection) => {
      return api.lagekarte().lagekarteControllerSaveLagekarteStateVAlpha({
        einsatzId,
        saveLagekarteStateDto: { einsatzId, state: state as unknown as object },
      });
    },
    onSuccess: (_data, savedState) => {
      // Cache optimistisch aktualisieren (kein Refetch nötig)
      queryClient.setQueryData(
        LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => (old ? { ...old, state: savedState } : old),
      );
    },
  });
}
