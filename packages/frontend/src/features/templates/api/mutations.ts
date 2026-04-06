import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { ERINNERUNG_QUERY_KEYS } from '@/features/reminders';
import { FR_TEMPLATE_QUERY_KEYS, VORLAGE_QUERY_KEYS } from './queries';
import type {
  CreateErinnerungsvorlageDto,
  CreateFuehrungsrhythmusTemplateDto,
  UpdateFuehrungsrhythmusTemplateDto,
  UpdateErinnerungsvorlageDto,
  ErinnerungsvorlageResponseDto,
  ResponseError,
} from '@bluelight-hub/shared/client';
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
              beschreibung: data.beschreibung !== undefined ? data.beschreibung : v.beschreibung,
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
 * Hook: Neues globales Fuehrungsrhythmus-Template erstellen (Admin).
 */
export const useCreateGlobalFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: CreateFuehrungsrhythmusTemplateVariables) => {
      const response = await api.fuehrungsrhythmusTemplatesAdmin().fuehrungsrhythmusTemplateControllerCreateVAlpha({
        createFuehrungsrhythmusTemplateDto: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
    },
  });
};

export interface CreateEinsatzFuehrungsrhythmusTemplateVariables {
  einsatzId: string;
  data: CreateFuehrungsrhythmusTemplateDto;
}

/**
 * Hook: Neues Einsatz-spezifisches Fuehrungsrhythmus-Template erstellen.
 */
export const useCreateEinsatzFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, data }: CreateEinsatzFuehrungsrhythmusTemplateVariables) => {
      const response = await api.einsatzFuehrungsrhythmusTemplates().einsatzFuehrungsrhythmusTemplateControllerCreateVAlpha({
        einsatzId,
        createFuehrungsrhythmusTemplateDto: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
    },
  });
};

export interface UpdateFuehrungsrhythmusTemplateVariables {
  id: string;
  data: UpdateFuehrungsrhythmusTemplateDto;
}

/**
 * Hook: Globales Fuehrungsrhythmus-Template aktualisieren (Admin).
 */
export const useUpdateGlobalFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateFuehrungsrhythmusTemplateVariables) => {
      const response = await api.fuehrungsrhythmusTemplatesAdmin().fuehrungsrhythmusTemplateControllerUpdateVAlpha({
        id,
        updateFuehrungsrhythmusTemplateDto: data,
      });
      return response.data;
    },
    onError: (error: ResponseError) => {
      logger.error('Failed to update Fuehrungsrhythmus-Template', error);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
    },
  });
};

export interface UpdateEinsatzFuehrungsrhythmusTemplateVariables {
  einsatzId: string;
  id: string;
  data: UpdateFuehrungsrhythmusTemplateDto;
}

/**
 * Hook: Einsatz-Fuehrungsrhythmus-Template aktualisieren.
 */
export const useUpdateEinsatzFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, id, data }: UpdateEinsatzFuehrungsrhythmusTemplateVariables) => {
      const response = await api.einsatzFuehrungsrhythmusTemplates().einsatzFuehrungsrhythmusTemplateControllerUpdateVAlpha({
        einsatzId,
        id,
        updateFuehrungsrhythmusTemplateDto: data,
      });
      return response.data;
    },
    onError: (error: ResponseError) => {
      logger.error('Failed to update Einsatz-Fuehrungsrhythmus-Template', error);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
    },
  });
};

export interface DeleteFuehrungsrhythmusTemplateVariables {
  id: string;
}

/**
 * Hook: Globales Fuehrungsrhythmus-Template loeschen (Soft-Delete, Admin).
 */
export const useDeleteGlobalFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteFuehrungsrhythmusTemplateVariables) => {
      await api.fuehrungsrhythmusTemplatesAdmin().fuehrungsrhythmusTemplateControllerRemoveVAlpha({ id });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Template konnte nicht gelöscht werden.', 'deleteFrTemplate');
      logger.error('Failed to delete Fuehrungsrhythmus-Template', error);
      toast.error('Fehler', { description: message });
    },
    onSettled: async (_data, error) => {
      await queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
      if (!error) {
        toast.success('Template gelöscht', {
          description: 'Das Führungsrhythmus-Template wurde gelöscht.',
        });
      }
    },
  });
};

export interface DeleteEinsatzFuehrungsrhythmusTemplateVariables {
  einsatzId: string;
  id: string;
}

/**
 * Hook: Einsatz-Fuehrungsrhythmus-Template loeschen (Soft-Delete).
 */
export const useDeleteEinsatzFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, id }: DeleteEinsatzFuehrungsrhythmusTemplateVariables) => {
      await api.einsatzFuehrungsrhythmusTemplates().einsatzFuehrungsrhythmusTemplateControllerRemoveVAlpha({ einsatzId, id });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Template konnte nicht gelöscht werden.', 'deleteFrTemplate');
      logger.error('Failed to delete Einsatz-Fuehrungsrhythmus-Template', error);
      toast.error('Fehler', { description: message });
    },
    onSettled: async (_data, error) => {
      await queryClient.invalidateQueries({ queryKey: FR_TEMPLATE_QUERY_KEYS.all });
      if (!error) {
        toast.success('Template gelöscht', {
          description: 'Das Führungsrhythmus-Template wurde gelöscht.',
        });
      }
    },
  });
};

export interface ActivateFuehrungsrhythmusTemplateVariables {
  templateId: string;
  einsatzId: string;
}

/**
 * Hook: Globales Fuehrungsrhythmus-Template aktivieren (Admin, Story 6.7).
 */
export const useActivateGlobalFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, einsatzId }: ActivateFuehrungsrhythmusTemplateVariables) => {
      const response = await api.fuehrungsrhythmusTemplatesAdmin().fuehrungsrhythmusTemplateControllerActivateVAlpha({
        id: templateId,
        activateFuehrungsrhythmusTemplateDto: { einsatzId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ERINNERUNG_QUERY_KEYS.all });
    },
  });
};

/**
 * Hook: Einsatz-Fuehrungsrhythmus-Template aktivieren.
 */
export const useActivateEinsatzFuehrungsrhythmusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, einsatzId }: ActivateFuehrungsrhythmusTemplateVariables) => {
      const response = await api.einsatzFuehrungsrhythmusTemplates().einsatzFuehrungsrhythmusTemplateControllerActivateVAlpha({
        einsatzId,
        id: templateId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ERINNERUNG_QUERY_KEYS.all });
    },
  });
};
