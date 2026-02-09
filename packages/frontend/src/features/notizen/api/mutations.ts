import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { CreateNotizDto, NotizResponseDto, UpdateNotizDto } from '@bluelight-hub/shared/client';
import { NOTIZ_QUERY_KEYS } from './queries';
import { toast } from 'sonner';

export interface CreateNotizVariables {
  einsatzId: string;
  data: CreateNotizDto;
}

/**
 * Mutation zum Erstellen einer neuen Notiz.
 */
export const useCreateNotiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, data }: CreateNotizVariables) => {
      const response = await api.notizen().notizControllerCreateVAlpha({
        einsatzId,
        createNotizDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTIZ_QUERY_KEYS.list(variables.einsatzId) });
      toast.success('Notiz erstellt');
    },
    onError: () => {
      toast.error('Fehler beim Erstellen der Notiz');
    },
  });
};

export interface UpdateNotizVariables {
  einsatzId: string;
  notizId: string;
  data: UpdateNotizDto;
}

/**
 * Mutation zum Aktualisieren einer Notiz (Story 7.3).
 */
export const useUpdateNotiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, notizId, data }: UpdateNotizVariables) => {
      const response = await api.notizen().notizControllerUpdateVAlpha({
        einsatzId,
        notizId,
        updateNotizDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTIZ_QUERY_KEYS.list(variables.einsatzId) });
      toast.success('Notiz aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Notiz');
    },
  });
};

export interface DeleteNotizVariables {
  einsatzId: string;
  notizId: string;
}

interface DeleteNotizContext {
  previousNotizen?: NotizResponseDto[];
}

/**
 * Mutation zum Loeschen einer Notiz mit optimistischem Update (Story 7.4).
 * Löscht eine Notiz (Soft-Delete). Kein Offline-Support — erfordert aktive Verbindung.
 * Bewusste Entscheidung: Notizen sind kein kritisches Feature (im Gegensatz zu Erinnerungen).
 */
export const useDeleteNotiz = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteNotizVariables, DeleteNotizContext>({
    mutationFn: async ({ einsatzId, notizId }: DeleteNotizVariables) => {
      await api.notizen().notizControllerDeleteVAlpha({ einsatzId, notizId });
    },
    onMutate: async ({ einsatzId, notizId }) => {
      await queryClient.cancelQueries({
        queryKey: NOTIZ_QUERY_KEYS.list(einsatzId),
      });

      const previousNotizen = queryClient.getQueryData<NotizResponseDto[]>(NOTIZ_QUERY_KEYS.list(einsatzId));

      if (previousNotizen) {
        queryClient.setQueryData<NotizResponseDto[]>(
          NOTIZ_QUERY_KEYS.list(einsatzId),
          previousNotizen.filter((n) => n.id !== notizId),
        );
      }

      return { previousNotizen };
    },
    onError: (_error, { einsatzId }, context) => {
      if (context?.previousNotizen !== undefined) {
        queryClient.setQueryData(NOTIZ_QUERY_KEYS.list(einsatzId), context.previousNotizen);
      }
      toast.error('Fehler beim Löschen der Notiz');
    },
    onSettled: (_data, _error, { einsatzId }) => {
      queryClient.invalidateQueries({ queryKey: NOTIZ_QUERY_KEYS.list(einsatzId) });
    },
    onSuccess: () => {
      toast.success('Notiz gelöscht');
    },
  });
};
