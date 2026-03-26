import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BefehlsgeberVorschlagDto, CreateBefehlsgeberVorschlagDto, UpdateBefehlsgeberVorschlagDto } from '@/shared';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook fuer Admin Befehlsgeber-Vorschlaege-Management.
 *
 * Bietet CRUD-Operationen fuer Befehlsgeber-Vorschlaege mit TanStack Query.
 * Optimistic Updates fuer bessere UX.
 *
 * @param filters - Optional: Filter fuer istAktiv
 */
export const useAdminBefehlsgeberVorschlaegeManagement = (filters?: { istAktiv?: boolean }) => {
  const queryClient = useQueryClient();

  // Query: Liste aller Befehlsgeber-Vorschlaege
  const befehlsgeberVorschlaegeQuery = useQuery<BefehlsgeberVorschlagDto[], ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.list(filters),
    queryFn: async () => {
      const response = await api.adminBefehleBefehlsgeberVorschlaege().adminBefehlsgeberVorschlaegeControllerFindAllVAlpha({
        istAktiv: filters?.istAktiv,
      });
      // TransformInterceptor wraps response in { data: [...], meta: {...} }
      // Extract data array from wrapped response
      return (response as unknown as { data: BefehlsgeberVorschlagDto[] }).data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential Backoff mit 30s Cap
    staleTime: 30_000, // 30 Sekunden - verhindert unnoetige Refetches bei Component Remounts
  });

  // Mutation: Befehlsgeber-Vorschlag erstellen
  const createMutation = useMutation<BefehlsgeberVorschlagDto, ResponseError, CreateBefehlsgeberVorschlagDto>({
    mutationFn: (data: CreateBefehlsgeberVorschlagDto) =>
      api.adminBefehleBefehlsgeberVorschlaege().adminBefehlsgeberVorschlaegeControllerCreateVAlpha({
        createBefehlsgeberVorschlagDto: data,
      }),
    onSuccess: async () => {
      toast.success('Befehlsgeber-Vorschlag erstellt', {
        description: 'Der Befehlsgeber-Vorschlag wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Befehlsgeber-Vorschlag konnte nicht erstellt werden.', 'createBefehlsgeberVorschlag');
      logger.error('Failed to create befehlsgeber-vorschlag', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Befehlsgeber-Vorschlag aktualisieren
  const updateMutation = useMutation<
    BefehlsgeberVorschlagDto,
    ResponseError,
    { id: string; data: UpdateBefehlsgeberVorschlagDto },
    { previousQueries: Array<{ queryKey: readonly unknown[]; data: BefehlsgeberVorschlagDto[] }> }
  >({
    mutationFn: ({ id, data }) =>
      api.adminBefehleBefehlsgeberVorschlaege().adminBefehlsgeberVorschlaegeControllerUpdateVAlpha({
        id,
        updateBefehlsgeberVorschlagDto: data,
      }),
    onMutate: async ({ id, data }) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(),
      });

      // Snapshot ALLER betroffenen Query Caches (mit verschiedenen Filtern)
      const previousQueries: Array<{ queryKey: readonly unknown[]; data: BefehlsgeberVorschlagDto[] }> = [];
      queryClient.getQueriesData<BefehlsgeberVorschlagDto[]>({ queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      // Update alle Query Caches (mit und ohne Filter)
      queryClient.setQueriesData<BefehlsgeberVorschlagDto[]>({ queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all() }, (old) => {
        if (!old) return old;
        return old.map((q) => (q.id === id ? { ...q, ...data } : q));
      });

      return { previousQueries };
    },
    onError: async (error, _variables, context) => {
      // Rollback auf vorherige Daten - Restore ALLE Query Caches mit ihren Original-Daten
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Der Befehlsgeber-Vorschlag konnte nicht aktualisiert werden.', 'updateBefehlsgeberVorschlag');
      logger.error('Failed to update befehlsgeber-vorschlag', error);
      toast.error('Fehler beim Aktualisieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Befehlsgeber-Vorschlag aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
  });

  // Mutation: Befehlsgeber-Vorschlag loeschen
  const deleteMutation = useMutation<void, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: BefehlsgeberVorschlagDto[] }> }>({
    mutationFn: (id: string) => api.adminBefehleBefehlsgeberVorschlaege().adminBefehlsgeberVorschlaegeControllerRemoveVAlpha({ id }),
    onMutate: async (id) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(),
      });

      // Snapshot ALLER betroffenen Query Caches (mit verschiedenen Filtern)
      const previousQueries: Array<{ queryKey: readonly unknown[]; data: BefehlsgeberVorschlagDto[] }> = [];
      queryClient.getQueriesData<BefehlsgeberVorschlagDto[]>({ queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      // Optimistic: Eintrag aus der Liste entfernen
      queryClient.setQueriesData<BefehlsgeberVorschlagDto[]>({ queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all() }, (old) => {
        if (!old) return old;
        return old.filter((q) => q.id !== id);
      });

      return { previousQueries };
    },
    onError: async (error, _id, context) => {
      // Rollback auf vorherige Daten - Restore ALLE Query Caches mit ihren Original-Daten
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      const message = await getApiErrorMessage(error, 'Der Befehlsgeber-Vorschlag konnte nicht gelöscht werden.', 'deleteBefehlsgeberVorschlag');
      logger.error('Failed to delete befehlsgeber-vorschlag', error);
      toast.error('Fehler beim Löschen', { description: message });
    },
    onSuccess: async () => {
      toast.success('Befehlsgeber-Vorschlag gelöscht', {
        description: 'Der Befehlsgeber-Vorschlag wurde gelöscht.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.befehle.befehlsgeberVorschlaege.all(),
        exact: false,
      });
    },
  });

  /**
   * Aggregiertes isMutating Flag - verhindert Race Conditions durch parallele Mutations.
   *
   * Wenn TRUE: User sollte keine neuen Mutations starten können.
   * Nutze dieses Flag zum Disablen von Create/Update/Deactivate Buttons.
   */
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return {
    // Query Data
    befehlsgeberVorschlaege: befehlsgeberVorschlaegeQuery.data,
    isLoading: befehlsgeberVorschlaegeQuery.isLoading,
    error: befehlsgeberVorschlaegeQuery.error,
    refetch: befehlsgeberVorschlaegeQuery.refetch,

    // Mutations
    createBefehlsgeberVorschlag: createMutation.mutate,
    updateBefehlsgeberVorschlag: updateMutation.mutate,
    deleteBefehlsgeberVorschlag: deleteMutation.mutate,

    // Mutation States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating,

    // Mutation Variables (fuer per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    deletingId: deleteMutation.isPending ? deleteMutation.variables : undefined,
  };
};
