import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateRollenDefinitionDto, RollenDefinitionDto, UpdateRollenDefinitionDto } from '@bluelight-hub/shared/client';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook für Admin RollenDefinitionen-Management.
 *
 * Bietet CRUD-Operationen für RollenDefinitionen mit TanStack Query.
 * Optimistic Updates für bessere UX.
 *
 * @param filters - Optional: Filter für istAktiv
 */
export const useAdminRollenDefinitionenManagement = (filters?: { istAktiv?: boolean }) => {
  const queryClient = useQueryClient();

  // Query: Liste aller RollenDefinitionen
  const rollenDefinitionenQuery = useQuery<RollenDefinitionDto[], ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.list(filters),
    queryFn: async () => {
      const response = await api.adminKraefteRollen().adminRollenControllerFindAllVAlpha({
        istAktiv: filters?.istAktiv,
      });
      // TransformInterceptor wraps response in { data: [...], meta: {...} }
      // Extract data array from wrapped response
      return (response as unknown as { data: RollenDefinitionDto[] }).data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential Backoff mit 30s Cap
    staleTime: 30_000, // 30 Sekunden - verhindert unnötige Refetches bei Component Remounts
  });

  // Mutation: RollenDefinition erstellen
  const createMutation = useMutation<RollenDefinitionDto, ResponseError, CreateRollenDefinitionDto>({
    mutationFn: (data: CreateRollenDefinitionDto) =>
      api.adminKraefteRollen().adminRollenControllerCreateVAlpha({
        createRollenDefinitionDto: data,
      }),
    onSuccess: async () => {
      toast.success('Rollendefinition erstellt', {
        description: 'Die Rollendefinition wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Rollendefinition konnte nicht erstellt werden.', 'createRollenDefinition');
      logger.error('Failed to create rollenDefinition', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: RollenDefinition aktualisieren
  const updateMutation = useMutation<
    RollenDefinitionDto,
    ResponseError,
    { id: string; data: UpdateRollenDefinitionDto },
    { previousQueries: Array<{ queryKey: readonly unknown[]; data: RollenDefinitionDto[] }> }
  >({
    mutationFn: ({ id, data }) =>
      api.adminKraefteRollen().adminRollenControllerUpdateVAlpha({
        id,
        updateRollenDefinitionDto: data,
      }),
    onMutate: async ({ id, data }) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(),
      });

      // Snapshot ALLER betroffenen Query Caches (mit verschiedenen Filtern)
      const previousQueries: Array<{ queryKey: readonly unknown[]; data: RollenDefinitionDto[] }> = [];
      queryClient.getQueriesData<RollenDefinitionDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      // Update alle Query Caches (mit und ohne Filter)
      queryClient.setQueriesData<RollenDefinitionDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all() }, (old) => {
        if (!old) return old;
        return old.map((r) => (r.id === id ? { ...r, ...data } : r));
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
      const message = await getApiErrorMessage(error, 'Die Rollendefinition konnte nicht aktualisiert werden.', 'updateRollenDefinition');
      logger.error('Failed to update rollenDefinition', error);
      toast.error('Fehler beim Aktualisieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Rollendefinition aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
  });

  // Mutation: RollenDefinition deaktivieren
  const deactivateMutation = useMutation<RollenDefinitionDto, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: RollenDefinitionDto[] }> }>({
    mutationFn: (id: string) => api.adminKraefteRollen().adminRollenControllerDeactivateVAlpha({ id }),
    onMutate: async (id) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(),
      });

      // Snapshot ALLER betroffenen Query Caches (mit verschiedenen Filtern)
      const previousQueries: Array<{ queryKey: readonly unknown[]; data: RollenDefinitionDto[] }> = [];
      queryClient.getQueriesData<RollenDefinitionDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      // Update alle Query Caches (mit und ohne Filter)
      queryClient.setQueriesData<RollenDefinitionDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all() }, (old) => {
        if (!old) return old;
        return old.map((r) => (r.id === id ? { ...r, istAktiv: false } : r));
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
      const message = await getApiErrorMessage(error, 'Die Rollendefinition konnte nicht deaktiviert werden.', 'deactivateRollenDefinition');
      logger.error('Failed to deactivate rollenDefinition', error);
      toast.error('Fehler beim Deaktivieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Rollendefinition deaktiviert', {
        description: 'Die Rollendefinition wurde deaktiviert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.rollenDefinitionen.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
  });

  /**
   * Aggregiertes isMutating Flag - verhindert Race Conditions durch parallele Mutations.
   *
   * Wenn TRUE: User sollte keine neuen Mutations starten können.
   * Nutze dieses Flag zum Disablen von Create/Update/Deactivate Buttons.
   */
  const isMutating = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

  return {
    // Query Data
    rollenDefinitionen: rollenDefinitionenQuery.data,
    isLoading: rollenDefinitionenQuery.isLoading,
    error: rollenDefinitionenQuery.error,
    refetch: rollenDefinitionenQuery.refetch,

    // Mutations
    createRollenDefinition: createMutation.mutate,
    updateRollenDefinition: updateMutation.mutate,
    deactivateRollenDefinition: deactivateMutation.mutate,

    // Mutation States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isMutating, // Aggregiertes Flag für globale Mutation-Tracking

    // Mutation Variables (für per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    deactivatingId: deactivateMutation.isPending ? deactivateMutation.variables : undefined, // String statt Objekt
  };
};
