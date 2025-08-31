import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { logger } from '@/utils/logger';
import type {
  CreateEinsatzDto,
  EinsatzControllerCreateVAlpha200Response,
  EinsatzControllerFindAllVAlpha200Response,
  EinsatzControllerFindAllVAlphaStatusEnum,
  EinsatzResponseDto,
  ResponseError,
  UpdateEinsatzDto,
} from '@bluelight-hub/shared/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Hook für Einsatz-API-Operationen
 *
 * Stellt alle API-Funktionen für Einsatz-Verwaltung bereit:
 * - Laden der Einsatzliste
 * - Erstellen neuer Einsätze
 * - Aktualisieren von Einsätzen
 * - Löschen von Einsätzen
 *
 * @param filters - Optionale Filter für die Einsatzliste
 * @returns Objekt mit Einsatzdaten, Ladezuständen und API-Aktionen
 */
export const useEinsaetze = (filters?: { status?: EinsatzControllerFindAllVAlphaStatusEnum; search?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  // Query für Einsatzliste mit verbessertem Caching und Backend-Filtering
  const einsaetzeQuery = useQuery<EinsatzControllerFindAllVAlpha200Response, ResponseError>({
    queryKey: QUERY_KEYS.einsatz.list(filters),
    queryFn: async () => {
      try {
        return await api.einsatz().einsatzControllerFindAllVAlpha({
          limit: filters?.limit,
          page: filters?.page,
          search: filters?.search,
          status: filters?.status,
        });
      } catch (error) {
        logger.error('Failed to fetch einsaetze', error);
        throw error;
      }
    },
    // Stale time für bessere Performance bei wiederholten Anfragen
    staleTime: 30000, // 30 seconds
  });

  // Mutation für Einsatz erstellen
  const createEinsatzMutation = useMutation<EinsatzResponseDto, ResponseError, CreateEinsatzDto>({
    mutationFn: async (data: CreateEinsatzDto) => {
      const response = await api.einsatz().einsatzControllerCreateVAlpha({
        createEinsatzDto: data,
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Einsatz erstellt', {
        description: 'Der Einsatz wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Einsatz konnte nicht erstellt werden.', 'createEinsatz');
      logger.error('Failed to create einsatz', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  // Mutation für Einsatz aktualisieren
  const updateEinsatzMutation = useMutation<EinsatzResponseDto, ResponseError, { id: string; data: UpdateEinsatzDto }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.einsatz().einsatzControllerUpdateVAlpha({
        id,
        updateEinsatzDto: data,
      });
      return response.data;
    },
    onSuccess: async (_, variables) => {
      toast.success('Einsatz aktualisiert', {
        description: 'Der Einsatz wurde erfolgreich aktualisiert.',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.detail(variables.id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Einsatz konnte nicht aktualisiert werden.', 'updateEinsatz');
      logger.error('Failed to update einsatz', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  return {
    // Einsatzdaten und Ladezustände
    einsaetze: einsaetzeQuery.data?.data || [],
    // total: einsaetzeQuery.data?.total || 0,
    // page: einsaetzeQuery.data?.page || 1,
    // limit: einsaetzeQuery.data?.limit || 10,
    isLoading: einsaetzeQuery.isLoading,
    error: einsaetzeQuery.error,
    refetch: einsaetzeQuery.refetch,

    // API-Aktionen
    createEinsatz: createEinsatzMutation.mutate,
    updateEinsatz: updateEinsatzMutation.mutate,

    // Mutation-Zustände
    isCreating: createEinsatzMutation.isPending,
    isUpdating: updateEinsatzMutation.isPending,
    createError: createEinsatzMutation.error,
    updateError: updateEinsatzMutation.error,
  };
};

export const useEinsatz = (id: string | null) => {
  const queryClient = useQueryClient();

  const einsatz = useQuery<EinsatzControllerCreateVAlpha200Response, ResponseError>({
    enabled: !!id,
    queryKey: QUERY_KEYS.einsatz.detail(id),
    queryFn: async () => {
      return await api.einsatz().einsatzControllerFindOneVAlpha({ id });
    },
  });

  const updateEinsatzMutation = useMutation<EinsatzResponseDto, ResponseError, { data: UpdateEinsatzDto }>({
    mutationFn: async ({ data }) => {
      if (!id) {
        throw new Error('ID is required');
      }
      const response = await api.einsatz().einsatzControllerUpdateVAlpha({
        id,
        updateEinsatzDto: data,
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Einsatz aktualisiert', {
        description: 'Der Einsatz wurde erfolgreich aktualisiert.',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.detail(id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Einsatz konnte nicht aktualisiert werden.', 'updateEinsatz');
      logger.error('Failed to update einsatz', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  return {
    isLoading: einsatz.isLoading,
    error: einsatz.error,
    einsatz: einsatz.data?.data,
    updateEinsatz: updateEinsatzMutation.mutate,

    isUpdating: updateEinsatzMutation.isPending,
    updateError: updateEinsatzMutation.error,
  };
};
