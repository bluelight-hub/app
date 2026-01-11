import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateStammFahrzeugDto, StammFahrzeugDto, UpdateStammFahrzeugDto } from '@/shared';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook für Admin StammFahrzeuge-Management.
 *
 * Bietet CRUD-Operationen für StammFahrzeuge mit TanStack Query.
 * Optimistic Updates für bessere UX.
 *
 * @param filters - Optional: Filter für includeArchived
 */
export const useAdminStammFahrzeugeManagement = (filters?: { includeArchived?: boolean }) => {
  const queryClient = useQueryClient();

  // Query: Liste aller StammFahrzeuge
  const stammFahrzeugeQuery = useQuery<StammFahrzeugDto[], ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.list(filters),
    queryFn: async () => {
      const response = await api.adminStammdatenFahrzeuge().adminStammFahrzeugeControllerFindAllVAlpha({
        includeArchived: filters?.includeArchived,
      });
      // TransformInterceptor wraps response in { data: [...], meta: {...} }
      return (response as unknown as { data: StammFahrzeugDto[] }).data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30_000,
  });

  // Mutation: StammFahrzeug erstellen
  const createMutation = useMutation<StammFahrzeugDto, ResponseError, CreateStammFahrzeugDto>({
    mutationFn: async (data: CreateStammFahrzeugDto) => {
      const response = await api.adminStammdatenFahrzeuge().adminStammFahrzeugeControllerCreateVAlpha({
        createStammFahrzeugDto: data,
      });
      return (response as unknown as { data: StammFahrzeugDto }).data;
    },
    onSuccess: async () => {
      toast.success('Fahrzeug erstellt', {
        description: 'Das Fahrzeug wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(),
        exact: false,
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Fahrzeug konnte nicht erstellt werden.', 'createStammFahrzeug');
      logger.error('Failed to create stamm fahrzeug', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: StammFahrzeug aktualisieren
  const updateMutation = useMutation<
    StammFahrzeugDto,
    ResponseError,
    { id: string; data: UpdateStammFahrzeugDto },
    { previousQueries: Array<{ queryKey: readonly unknown[]; data: StammFahrzeugDto[] }> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api.adminStammdatenFahrzeuge().adminStammFahrzeugeControllerUpdateVAlpha({
        id,
        updateStammFahrzeugDto: data,
      });
      return (response as unknown as { data: StammFahrzeugDto }).data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: StammFahrzeugDto[] }> = [];
      queryClient.getQueriesData<StammFahrzeugDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<StammFahrzeugDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all() }, (old) => {
        if (!old) return old;
        return old.map((f) => (f.id === id ? { ...f, ...data } : f));
      });

      return { previousQueries };
    },
    onError: async (error, _variables, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Das Fahrzeug konnte nicht aktualisiert werden.', 'updateStammFahrzeug');
      logger.error('Failed to update stamm fahrzeug', error);
      toast.error('Fehler beim Aktualisieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Fahrzeug aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(),
        exact: false,
      });
    },
  });

  // Mutation: StammFahrzeug archivieren
  const archiveMutation = useMutation<StammFahrzeugDto, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: StammFahrzeugDto[] }> }>({
    mutationFn: async (id: string) => {
      const response = await api.adminStammdatenFahrzeuge().adminStammFahrzeugeControllerArchiveVAlpha({ id });
      return (response as unknown as { data: StammFahrzeugDto }).data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: StammFahrzeugDto[] }> = [];
      queryClient.getQueriesData<StammFahrzeugDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<StammFahrzeugDto[]>({ queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all() }, (old) => {
        if (!old) return old;
        return old.map((f) => (f.id === id ? { ...f, archivedAt: new Date() } : f));
      });

      return { previousQueries };
    },
    onError: async (error, _id, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Das Fahrzeug konnte nicht archiviert werden.', 'archiveStammFahrzeug');
      logger.error('Failed to archive stamm fahrzeug', error);
      toast.error('Fehler beim Archivieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Fahrzeug archiviert', {
        description: 'Das Fahrzeug wurde archiviert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.all(),
        exact: false,
      });
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  return {
    // Query Data
    stammFahrzeuge: stammFahrzeugeQuery.data,
    isLoading: stammFahrzeugeQuery.isLoading,
    error: stammFahrzeugeQuery.error,
    refetch: stammFahrzeugeQuery.refetch,

    // Mutations
    createStammFahrzeug: createMutation.mutate,
    updateStammFahrzeug: updateMutation.mutate,
    archiveStammFahrzeug: archiveMutation.mutate,

    // Mutation States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isMutating,

    // Mutation Variables (für per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    archivingId: archiveMutation.isPending ? archiveMutation.variables : undefined,
  };
};
