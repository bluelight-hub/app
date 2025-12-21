import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateStammPersonDto, StammPersonDto, UpdateStammPersonDto } from '@bluelight-hub/shared/client';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook für Admin StammPersonen-Management.
 *
 * Bietet CRUD-Operationen für StammPersonen mit TanStack Query.
 * Optimistic Updates für bessere UX.
 *
 * @param filters - Optional: Filter für includeArchived
 */
export const useAdminStammPersonenManagement = (filters?: { includeArchived?: boolean }) => {
  const queryClient = useQueryClient();

  // Query: Liste aller StammPersonen
  const stammPersonenQuery = useQuery<StammPersonDto[], ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.list(filters),
    queryFn: async () => {
      const response = await api.adminStammdatenPersonen().adminStammPersonenControllerFindAllVAlpha({
        includeArchived: filters?.includeArchived,
      });
      // TransformInterceptor wraps response in { data: [...], meta: {...} }
      return (response as unknown as { data: StammPersonDto[] }).data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30_000,
  });

  // Mutation: StammPerson erstellen
  const createMutation = useMutation<StammPersonDto, ResponseError, CreateStammPersonDto>({
    mutationFn: async (data: CreateStammPersonDto) => {
      const response = await api.adminStammdatenPersonen().adminStammPersonenControllerCreateVAlpha({
        createStammPersonDto: data,
      });
      return (response as unknown as { data: StammPersonDto }).data;
    },
    onSuccess: async () => {
      toast.success('Person erstellt', {
        description: 'Die Person wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
        exact: false,
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Person konnte nicht erstellt werden.', 'createStammPerson');
      logger.error('Failed to create stamm person', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: StammPerson aktualisieren
  const updateMutation = useMutation<StammPersonDto, ResponseError, { id: string; data: UpdateStammPersonDto }, { previousQueries: Array<{ queryKey: readonly unknown[]; data: StammPersonDto[] }> }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.adminStammdatenPersonen().adminStammPersonenControllerUpdateVAlpha({
        id,
        updateStammPersonDto: data,
      });
      return (response as unknown as { data: StammPersonDto }).data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: StammPersonDto[] }> = [];
      queryClient.getQueriesData<StammPersonDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<StammPersonDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() }, (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === id ? { ...p, ...data } : p));
      });

      return { previousQueries };
    },
    onError: async (error, _variables, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Die Person konnte nicht aktualisiert werden.', 'updateStammPerson');
      logger.error('Failed to update stamm person', error);
      toast.error('Fehler beim Aktualisieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Person aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
        exact: false,
      });
    },
  });

  // Mutation: StammPerson archivieren
  const archiveMutation = useMutation<StammPersonDto, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: StammPersonDto[] }> }>({
    mutationFn: async (id: string) => {
      const response = await api.adminStammdatenPersonen().adminStammPersonenControllerArchiveVAlpha({ id });
      return (response as unknown as { data: StammPersonDto }).data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: StammPersonDto[] }> = [];
      queryClient.getQueriesData<StammPersonDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<StammPersonDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() }, (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === id ? { ...p, archivedAt: new Date() } : p));
      });

      return { previousQueries };
    },
    onError: async (error, _id, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Die Person konnte nicht archiviert werden.', 'archiveStammPerson');
      logger.error('Failed to archive stamm person', error);
      toast.error('Fehler beim Archivieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Person archiviert', {
        description: 'Die Person wurde archiviert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
        exact: false,
      });
    },
  });

  // Mutation: StammPerson wiederherstellen
  const restoreMutation = useMutation<StammPersonDto, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: StammPersonDto[] }> }>({
    mutationFn: async (id: string) => {
      const response = await api.adminStammdatenPersonen().adminStammPersonenControllerRestoreVAlpha({ id });
      return (response as unknown as { data: StammPersonDto }).data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: StammPersonDto[] }> = [];
      queryClient.getQueriesData<StammPersonDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<StammPersonDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() }, (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === id ? { ...p, archivedAt: undefined, archivedBy: undefined } : p));
      });

      return { previousQueries };
    },
    onError: async (error, _id, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Die Person konnte nicht wiederhergestellt werden.', 'restoreStammPerson');
      logger.error('Failed to restore stamm person', error);
      toast.error('Fehler beim Wiederherstellen', { description: message });
    },
    onSuccess: async () => {
      toast.success('Person wiederhergestellt', {
        description: 'Die Person wurde wiederhergestellt.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
        exact: false,
      });
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending || restoreMutation.isPending;

  return {
    // Query Data
    stammPersonen: stammPersonenQuery.data,
    isLoading: stammPersonenQuery.isLoading,
    error: stammPersonenQuery.error,
    refetch: stammPersonenQuery.refetch,

    // Mutations
    createStammPerson: createMutation.mutate,
    updateStammPerson: updateMutation.mutate,
    archiveStammPerson: archiveMutation.mutate,
    restoreStammPerson: restoreMutation.mutate,

    // Mutation States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isMutating,

    // Mutation Variables (für per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    archivingId: archiveMutation.isPending ? archiveMutation.variables : undefined,
    restoringId: restoreMutation.isPending ? restoreMutation.variables : undefined,
  };
};
