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
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Qualifikation konnte nicht erstellt werden.', 'createQualifikation');
      logger.error('Failed to create qualifikation', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Qualifikation aktualisieren
  const updateMutation = useMutation<QualifikationDto, ResponseError, { id: string; data: UpdateQualifikationDto }, { previousData: QualifikationDto[] | undefined }>({
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

      const previousData = queryClient.getQueryData<QualifikationDto[]>(ADMIN_QUERY_KEYS.kraefte.qualifikationen.list(filters));

      // Update alle Query Caches (mit und ohne Filter), nicht nur den aktuellen
      queryClient.setQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }, (old) => {
        if (!old) return old;
        return old.map((q) => (q.id === id ? { ...q, ...data } : q));
      });

      return { previousData };
    },
    onError: async (error, _variables, context) => {
      // Rollback auf vorherige Daten - Update ALLE Query Caches (mit und ohne Filter)
      if (context?.previousData) {
        // Rollback für alle Query-Varianten, nicht nur den aktuellen Filter
        queryClient.setQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }, () => context.previousData);
        toast.info('Änderung rückgängig gemacht', {
          description: 'Die Änderungen wurden aufgrund eines Fehlers zurückgesetzt.',
        });
      }
      const message = await getApiErrorMessage(error, 'Die Qualifikation konnte nicht aktualisiert werden.', 'updateQualifikation');
      logger.error('Failed to update qualifikation', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: async () => {
      toast.success('Qualifikation aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
      });
    },
  });

  // Mutation: Qualifikation deaktivieren
  const deactivateMutation = useMutation<QualifikationDto, ResponseError, string, { previousData: QualifikationDto[] | undefined }>({
    mutationFn: (id: string) => api.adminKraefteQualifikationen().adminQualifikationenControllerDeactivateVAlpha({ id }),
    onMutate: async (id) => {
      // Optimistic Update
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
      });

      const previousData = queryClient.getQueryData<QualifikationDto[]>(ADMIN_QUERY_KEYS.kraefte.qualifikationen.list(filters));

      // Update alle Query Caches (mit und ohne Filter), nicht nur den aktuellen
      queryClient.setQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }, (old) => {
        if (!old) return old;
        return old.map((q) => (q.id === id ? { ...q, istAktiv: false } : q));
      });

      return { previousData };
    },
    onError: async (error, _id, context) => {
      // Rollback auf vorherige Daten - Update ALLE Query Caches (mit und ohne Filter)
      if (context?.previousData) {
        // Rollback für alle Query-Varianten, nicht nur den aktuellen Filter
        queryClient.setQueriesData<QualifikationDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all() }, () => context.previousData);
        toast.info('Änderung rückgängig gemacht', {
          description: 'Die Deaktivierung wurde aufgrund eines Fehlers zurückgesetzt.',
        });
      }
      const message = await getApiErrorMessage(error, 'Die Qualifikation konnte nicht deaktiviert werden.', 'deactivateQualifikation');
      logger.error('Failed to deactivate qualifikation', error);
      toast.error('Fehler', { description: message });
    },
    onSuccess: async () => {
      toast.success('Qualifikation deaktiviert', {
        description: 'Die Qualifikation wurde deaktiviert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.qualifikationen.all(),
      });
    },
  });

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

    // Mutation Variables (für per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    deactivatingId: deactivateMutation.isPending ? deactivateMutation.variables : undefined,
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
