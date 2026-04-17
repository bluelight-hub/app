/**
 * Mutation-Hooks für Gefahrenzonen (Issue #627, G2).
 *
 * Alle Mutations arbeiten mit optimistic updates: Die UI reagiert sofort,
 * bei Fehler wird der Snapshot zurückgerollt, bei Erfolg invalidieren wir
 * den Query (Server-State als Source-of-Truth für id + Timestamps).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateGefahrenzoneDto, GefahrenzoneDto, UpdateGefahrenzoneGeometryDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared';
import { GEFAHRENZONE_QUERY_KEYS } from './queries';

export interface CreateGefahrenzoneVariables {
  einsatzId: string;
  data: CreateGefahrenzoneDto;
}

export interface UpdateGefahrenzoneGeometryVariables {
  einsatzId: string;
  zoneId: string;
  data: UpdateGefahrenzoneGeometryDto;
}

export interface DeleteGefahrenzoneVariables {
  einsatzId: string;
  zoneId: string;
}

interface MutationContext {
  previousZonen: GefahrenzoneDto[] | undefined;
}

/**
 * Fügt eine neue Zone optimistisch in den Query-Cache ein. Die temp-id wird
 * nach Server-Response durch Invalidation ersetzt. Gefahrentyp + Schutzobjekt
 * bilden den Matrix-Link; die Warnstufe wird server-side via Join abgeleitet.
 */
export function useCreateGefahrenzone() {
  const queryClient = useQueryClient();

  return useMutation<GefahrenzoneDto, Error, CreateGefahrenzoneVariables, MutationContext>({
    mutationFn: async ({ einsatzId, data }) => {
      const response = await api.gefahrenzonen().gefahrenzoneControllerCreateVAlpha({ einsatzId, createGefahrenzoneDto: data });
      return response.data;
    },
    onMutate: async ({ einsatzId, data }) => {
      const queryKey = GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId);
      await queryClient.cancelQueries({ queryKey });
      const previousZonen = queryClient.getQueryData<GefahrenzoneDto[]>(queryKey);

      const now = new Date();
      const optimisticZone: GefahrenzoneDto = {
        id: `temp-${Date.now()}`,
        einsatzId,
        gefahrentyp: data.gefahrentyp,
        schutzobjekt: data.schutzobjekt,
        geometryType: data.geometryType,
        geometry: data.geometry,
        bezeichnung: data.bezeichnung ?? null,
        warnstufe: null,
        erstelltVon: 'optimistic',
        aktualisiertVon: null,
        erstelltAm: now,
        aktualisiertAm: now,
      };
      queryClient.setQueryData<GefahrenzoneDto[]>(queryKey, (current) => [...(current ?? []), optimisticZone]);

      return { previousZonen };
    },
    onError: (_error, { einsatzId }, context) => {
      if (context?.previousZonen !== undefined) {
        queryClient.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), context.previousZonen);
      }
    },
    onSettled: (_data, _error, { einsatzId }) => {
      queryClient.invalidateQueries({ queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId) });
    },
  });
}

/**
 * Ersetzt die Geometrie einer bestehenden Zone optimistisch.
 */
export function useUpdateGefahrenzoneGeometry() {
  const queryClient = useQueryClient();

  return useMutation<GefahrenzoneDto, Error, UpdateGefahrenzoneGeometryVariables, MutationContext>({
    mutationFn: async ({ einsatzId, zoneId, data }) => {
      const response = await api.gefahrenzonen().gefahrenzoneControllerUpdateGeometryVAlpha({ einsatzId, zoneId, updateGefahrenzoneGeometryDto: data });
      return response.data;
    },
    onMutate: async ({ einsatzId, zoneId, data }) => {
      const queryKey = GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId);
      await queryClient.cancelQueries({ queryKey });
      const previousZonen = queryClient.getQueryData<GefahrenzoneDto[]>(queryKey);

      queryClient.setQueryData<GefahrenzoneDto[]>(queryKey, (current) => (current ?? []).map((z) => (z.id === zoneId ? { ...z, geometry: data.geometry, aktualisiertAm: new Date() } : z)));

      return { previousZonen };
    },
    onError: (_error, { einsatzId }, context) => {
      if (context?.previousZonen !== undefined) {
        queryClient.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), context.previousZonen);
      }
    },
    onSettled: (_data, _error, { einsatzId }) => {
      queryClient.invalidateQueries({ queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId) });
    },
  });
}

/**
 * Entfernt eine Zone optimistisch und rollt bei Fehler den Snapshot zurück.
 */
export function useDeleteGefahrenzone() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteGefahrenzoneVariables, MutationContext>({
    mutationFn: async ({ einsatzId, zoneId }) => {
      await api.gefahrenzonen().gefahrenzoneControllerDeleteVAlpha({ einsatzId, zoneId });
    },
    onMutate: async ({ einsatzId, zoneId }) => {
      const queryKey = GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId);
      await queryClient.cancelQueries({ queryKey });
      const previousZonen = queryClient.getQueryData<GefahrenzoneDto[]>(queryKey);

      queryClient.setQueryData<GefahrenzoneDto[]>(queryKey, (current) => (current ?? []).filter((z) => z.id !== zoneId));

      return { previousZonen };
    },
    onError: (_error, { einsatzId }, context) => {
      if (context?.previousZonen !== undefined) {
        queryClient.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), context.previousZonen);
      }
    },
    onSettled: (_data, _error, { einsatzId }) => {
      queryClient.invalidateQueries({ queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId) });
    },
  });
}
