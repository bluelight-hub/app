import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { CreateHazardZoneDto, UpdateHazardZoneDto } from '@bluelight-hub/shared/client';
import { HAZARD_ZONES_QUERY_KEYS } from './queries';

export interface CreateHazardZoneVariables {
  einsatzId: string;
  data: CreateHazardZoneDto;
}

export interface UpdateHazardZoneVariables {
  einsatzId: string;
  zoneId: string;
  data: UpdateHazardZoneDto;
}

export interface DeleteHazardZoneVariables {
  einsatzId: string;
  zoneId: string;
}

/**
 * Mutation zum Erstellen einer neuen HazardZone (Issue #627).
 */
export const useCreateHazardZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, data }: CreateHazardZoneVariables) => {
      const response = await api.hazardZones().hazardZoneControllerCreateVAlpha({
        einsatzId,
        createHazardZoneDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: HAZARD_ZONES_QUERY_KEYS.byEinsatz(variables.einsatzId) });
    },
  });
};

/**
 * Mutation zum Aktualisieren einer HazardZone (Issue #627).
 */
export const useUpdateHazardZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, zoneId, data }: UpdateHazardZoneVariables) => {
      const response = await api.hazardZones().hazardZoneControllerUpdateVAlpha({
        einsatzId,
        zoneId,
        updateHazardZoneDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: HAZARD_ZONES_QUERY_KEYS.byEinsatz(variables.einsatzId) });
    },
  });
};

/**
 * Mutation zum Löschen einer HazardZone (Issue #627).
 */
export const useDeleteHazardZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, zoneId }: DeleteHazardZoneVariables) => {
      await api.hazardZones().hazardZoneControllerDeleteVAlpha({ einsatzId, zoneId });
      return { einsatzId, zoneId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: HAZARD_ZONES_QUERY_KEYS.byEinsatz(variables.einsatzId) });
    },
  });
};
