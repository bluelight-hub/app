import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { FR_TEMPLATE_QUERY_KEYS, VORLAGE_QUERY_KEYS } from './queries';
import type { CreateErinnerungsvorlageDto, CreateFuehrungsrhythmusTemplateDto, UpdateErinnerungsvorlageDto, ErinnerungsvorlageResponseDto, ResponseError } from '@bluelight-hub/shared/client';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import { toast } from 'sonner';

export interface CreateVorlageVariables {
  data: CreateErinnerungsvorlageDto;
}

/**
 * Hook: Neue Erinnerungsvorlage erstellen.
 */
export const useCreateVorlage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: CreateVorlageVariables) => {
      const response = await api.erinnerungsvorlagen().erinnerungsvorlageControllerCreateVAlpha({
        createErinnerungsvorlageDto: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VORLAGE_QUERY_KEYS.all });
    },
  });
};

export interface UpdateVorlageVariables {
  id: string;
  data: UpdateErinnerungsvorlageDto;
}

interface UpdateVorlageContext {
  previousVorlagen: ErinnerungsvorlageResponseDto[] | undefined;
}

/**
 * Hook: Erinnerungsvorlage aktualisieren mit Optimistic Updates (Story 6.2 AC1).
 *
 * Bei Erfolg werden automatisch alle Vorlagen-Queries invalidiert.
 * Bei Fehler wird der vorherige Zustand wiederhergestellt (Rollback).
 */
export const useUpdateVorlage = () => {
  const queryClient = useQueryClient();

  return useMutation<ErinnerungsvorlageResponseDto, ResponseError, UpdateVorlageVariables, UpdateVorlageContext>({
    mutationFn: async ({ id, data }: UpdateVorlageVariables) => {
      const response = await api.erinnerungsvorlagen().erinnerungsvorlageControllerUpdateVAlpha({
        id,
        updateErinnerungsvorlageDto: data,
      });
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: VORLAGE_QUERY_KEYS.list(),
      });

      // Snapshot the previous value
      const previousVorlagen = queryClient.getQueryData<ErinnerungsvorlageResponseDto[]>(VORLAGE_QUERY_KEYS.list());

      // Optimistically update to the new value
      if (previousVorlagen) {
        const updatedVorlagen = previousVorlagen.map((v) => {
          if (v.id === id) {
            return {
              ...v,
              titel: data.titel ?? v.titel,
              minuten: data.minuten ?? v.minuten,
              beschreibung: data.beschreibung !== undefined ? (data.beschreibung as object | null) : v.beschreibung,
              updatedAt: new Date().toISOString(),
            };
          }
          return v;
        });

        queryClient.setQueryData<ErinnerungsvorlageResponseDto[]>(VORLAGE_QUERY_KEYS.list(), updatedVorlagen);
      }

      // Return context object with previous value for rollback
      return { previousVorlagen };
    },
    onError: async (error: ResponseError, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousVorlagen !== undefined) {
        queryClient.setQueryData(VORLAGE_QUERY_KEYS.list(), context.previousVorlagen);
      }
      // KEIN toast.error hier - Dialog handled Error via apiErrorMessage (verhindert Double Error Display)
      logger.error('Failed to update Vorlage', error);
    },
    onSettled: async () => {
      // Ensure consistency - invalidate all Vorlagen queries
      await queryClient.invalidateQueries({
        queryKey: VORLAGE_QUERY_KEYS.all,
      });
    },
  });
};

export interface DeleteVorlageVariables {
  id: string;
}

interface DeleteVorlageContext {
  previousVorlagen: ErinnerungsvorlageResponseDto[] | undefined;
}

/**
 * Hook: Erinnerungsvorlage löschen mit Optimistic Updates (Soft-Delete, Story 6.2 AC2).
 *
 * Bei Erfolg werden automatisch alle Vorlagen-Queries invalidiert.
 * Bei Fehler wird der vorherige Zustand wiederhergestellt (Rollback).
 */
export const useDeleteVorlage = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ResponseError, DeleteVorlageVariables, DeleteVorlageContext>({
    mutationFn: async ({ id }: DeleteVorlageVariables) => {
      await api.erinnerungsvorlagen().erinnerungsvorlageControllerDeleteVAlpha({ id });
    },
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: VORLAGE_QUERY_KEYS.list(),
      });

      // Snapshot the previous value
      const previousVorlagen = queryClient.getQueryData<ErinnerungsvorlageResponseDto[]>(VORLAGE_QUERY_KEYS.list());

      // Optimistically remove the vorlage from the list
      if (previousVorlagen) {
        const filteredVorlagen = previousVorlagen.filter((v) => v.id !== id);
        queryClient.setQueryData<ErinnerungsvorlageResponseDto[]>(VORLAGE_QUERY_KEYS.list(), filteredVorlagen);
      }

      // Return context object with previous value for rollback
      return { previousVorlagen };
    },
    onError: async (error: ResponseError, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousVorlagen !== undefined) {
        queryClient.setQueryData(VORLAGE_QUERY_KEYS.list(), context.previousVorlagen);
      }

      const message = await getApiErrorMessage(error, 'Die Vorlage konnte nicht gelöscht werden.', 'deleteVorlage');
      logger.error('Failed to delete Vorlage', error);
      toast.error('Fehler', { description: message });
    },
    onSettled: async (_data, error) => {
      // Ensure consistency - invalidate all Vorlagen queries
      await queryClient.invalidateQueries({
        queryKey: VORLAGE_QUERY_KEYS.all,
      });

      // Success-Toast nach Cache-Update anzeigen (Race Condition vermeiden)
      if (!error) {
        toast.success('Vorlage gelöscht', {
          description: 'Die Vorlage wurde erfolgreich gelöscht.',
        });
      }
    },
  });
};

export interface CreateFuehrungsrhythmusTemplateVariables {
  data: CreateFuehrungsrhythmusTemplateDto;
}

/**
 * Hook: Neues Fuehrungsrhythmus-Template erstellen (Story 6.6).
 */
export const useCreateFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: CreateFuehrungsrhythmusTemplateVariables) => {
      const response = await api.fuehrungsrhythmusTemplates().fuehrungsrhythmusTemplateControllerCreateVAlpha({
        createFuehrungsrhythmusTemplateDto: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
    },
  });
};
