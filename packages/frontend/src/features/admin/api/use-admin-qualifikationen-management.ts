import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateQualifikationDto, QualifikationDto, QualifikationDtoKategorieEnum, UpdateQualifikationDto } from '@bluelight-hub/shared/client';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Qualifikation Kategorie Type (re-export für Frontend Convenience).
 */
export type QualifikationKategorie = QualifikationDtoKategorieEnum;

/**
 * Hook für Admin Qualifikationen-Management.
 *
 * Bietet CRUD-Operationen für Qualifikationen mit TanStack Query.
 * Optimistic Updates für bessere UX.
 *
 * @param filters - Optional: Filter für istAktiv
 */
export const useAdminQualifikationenManagement = (filters?: { istAktiv?: boolean }) => {
  const queryClient = useQueryClient();

  // Query: Liste aller Qualifikationen
  const qualifikationenQuery = useQuery<QualifikationDto[], ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.list(filters),
    queryFn: () =>
      api.adminKraefteQualifikationen().adminQualifikationenControllerFindAllVAlpha({
        istAktiv: filters?.istAktiv,
      }),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential Backoff mit 30s Cap
    staleTime: 30_000, // 30 Sekunden - verhindert unnötige Refetches bei Component Remounts
  });

  // Mutation: Qualifikation erstellen
  const createMutation = useMutation<QualifikationDto, ResponseError, CreateQualifikationDto>({
    mutationFn: (data: CreateQualifikationDto) =>
      api.adminKraefteQualifikationen().adminQualifikationenControllerCreateVAlpha({
        createQualifikationDto: data,
      }),
    onSuccess: async () => {
      toast.success('Qualifikation erstellt', {
        description: 'Die Qualifikation wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Qualifikation konnte nicht erstellt werden.', 'createQualifikation');
      logger.error('Failed to create qualifikation', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Qualifikation aktualisieren
  const updateMutation = useMutation<
    QualifikationDto,
    ResponseError,
    { id: string; data: UpdateQualifikationDto },
    { previousQueries: Array<{ queryKey: readonly unknown[]; data: QualifikationDto[] }> }
  >({
    mutationFn: ({ id, data }) =>
      api.adminKraefteQualifikationen().adminQualifikationenControllerUpdateVAlpha({
        id,
        updateQualifikationDto: data,
      }),
    onMutate: async ({ id, data }) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
      });

      // Snapshot ALLER betroffenen Query Caches (mit verschiedenen Filtern)
      const previousQueries: Array<{ queryKey: readonly unknown[]; data: QualifikationDto[] }> = [];
      queryClient.getQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      // Update alle Query Caches (mit und ohne Filter)
      queryClient.setQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }, (old) => {
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
      const message = await getApiErrorMessage(error, 'Die Qualifikation konnte nicht aktualisiert werden.', 'updateQualifikation');
      logger.error('Failed to update qualifikation', error);
      toast.error('Fehler beim Aktualisieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Qualifikation aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
        exact: false, // Invalidiert auch Detail-Queries
      });
    },
  });

  // Mutation: Qualifikation deaktivieren
  const deactivateMutation = useMutation<QualifikationDto, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: QualifikationDto[] }> }>({
    mutationFn: (id: string) => api.adminKraefteQualifikationen().adminQualifikationenControllerDeactivateVAlpha({ id }),
    onMutate: async (id) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
      });

      // Snapshot ALLER betroffenen Query Caches (mit verschiedenen Filtern)
      const previousQueries: Array<{ queryKey: readonly unknown[]; data: QualifikationDto[] }> = [];
      queryClient.getQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      // Update alle Query Caches (mit und ohne Filter)
      queryClient.setQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }, (old) => {
        if (!old) return old;
        return old.map((q) => (q.id === id ? { ...q, istAktiv: false } : q));
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
      const message = await getApiErrorMessage(error, 'Die Qualifikation konnte nicht deaktiviert werden.', 'deactivateQualifikation');
      logger.error('Failed to deactivate qualifikation', error);
      toast.error('Fehler beim Deaktivieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Qualifikation deaktiviert', {
        description: 'Die Qualifikation wurde deaktiviert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
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
    qualifikationen: qualifikationenQuery.data,
    isLoading: qualifikationenQuery.isLoading,
    error: qualifikationenQuery.error,
    refetch: qualifikationenQuery.refetch,

    // Mutations
    createQualifikation: createMutation.mutate,
    updateQualifikation: updateMutation.mutate,
    deactivateQualifikation: deactivateMutation.mutate,

    // Mutation States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isMutating, // CRITICAL FIX: Aggregiertes Flag für globale Mutation-Tracking

    // Mutation Variables (für per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    deactivatingId: deactivateMutation.isPending ? deactivateMutation.variables : undefined, // CRITICAL FIX: String statt Objekt
  };
};

/**
 * Qualifikation Kategorie Labels (Deutsch).
 */
export const KATEGORIE_LABELS: Record<QualifikationKategorie, string> = {
  FUEHRUNG: 'Führung',
  SANITAET: 'Sanitätsdienst',
  BETREUUNG: 'Betreuung',
  TECHNIK: 'Technik',
  SONSTIGES: 'Sonstiges',
};

/**
 * Kategorie zu Badge Variant Mapping.
 */
export const getKategorieBadgeVariant = (kategorie: QualifikationKategorie): 'info' | 'success' | 'warning' | 'error' | 'default' => {
  const mapping: Record<QualifikationKategorie, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
    FUEHRUNG: 'info',
    SANITAET: 'success',
    BETREUUNG: 'warning',
    TECHNIK: 'default',
    SONSTIGES: 'default',
  };
  return mapping[kategorie] || 'default';
};
