import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { CreateKategorieDto, KategorieResponseDto } from '@bluelight-hub/shared/client';
import { KATEGORIE_QUERY_KEYS } from './queries';
import { toast } from 'sonner';

export interface CreateKategorieVariables {
  einsatzId: string;
  data: CreateKategorieDto;
}

/**
 * Mutation zum Erstellen einer neuen Kategorie (Story 8.1).
 */
export const useCreateKategorie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, data }: CreateKategorieVariables) => {
      const response = await api.kategorien().kategorieControllerCreateVAlpha({
        einsatzId,
        createKategorieDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KATEGORIE_QUERY_KEYS.list(variables.einsatzId) });
      toast.success('Kategorie erstellt');
    },
    onError: () => {
      toast.error('Fehler beim Erstellen der Kategorie');
    },
  });
};

export interface DeleteKategorieVariables {
  einsatzId: string;
  kategorieId: string;
}

interface DeleteKategorieContext {
  previousKategorien?: KategorieResponseDto[];
}

/**
 * Mutation zum Loeschen einer Kategorie (Soft-Delete, Story 8.1).
 */
export const useDeleteKategorie = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteKategorieVariables, DeleteKategorieContext>({
    mutationFn: async ({ kategorieId }: DeleteKategorieVariables) => {
      await api.kategorien().kategorieControllerDeleteVAlpha({ id: kategorieId });
    },
    onMutate: async ({ einsatzId, kategorieId }) => {
      await queryClient.cancelQueries({
        queryKey: KATEGORIE_QUERY_KEYS.list(einsatzId),
      });

      const previousKategorien = queryClient.getQueryData<KategorieResponseDto[]>(KATEGORIE_QUERY_KEYS.list(einsatzId));

      if (previousKategorien) {
        queryClient.setQueryData<KategorieResponseDto[]>(
          KATEGORIE_QUERY_KEYS.list(einsatzId),
          previousKategorien.filter((k) => k.id !== kategorieId),
        );
      }

      return { previousKategorien };
    },
    onError: (_error, { einsatzId }, context) => {
      if (context?.previousKategorien !== undefined) {
        queryClient.setQueryData(KATEGORIE_QUERY_KEYS.list(einsatzId), context.previousKategorien);
      }
      toast.error('Fehler beim Löschen der Kategorie');
    },
    onSettled: (_data, _error, { einsatzId }) => {
      queryClient.invalidateQueries({ queryKey: KATEGORIE_QUERY_KEYS.list(einsatzId) });
    },
    onSuccess: () => {
      toast.success('Kategorie gelöscht');
    },
  });
};
