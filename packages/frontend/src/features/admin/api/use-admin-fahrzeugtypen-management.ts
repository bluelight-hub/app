import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateFahrzeugtypDto, FahrzeugtypDto, UpdateFahrzeugtypDto } from '@/shared';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

export type FahrzeugtypKategorie = FahrzeugtypDto['kategorie'];
type SollbesatzungDto = NonNullable<CreateFahrzeugtypDto['sollbesatzung']>;
const SOLLBESATZUNG_KEYS = ['fahrer', 'sanitaeter', 'notarzt', 'funktrupp', 'helfer'] as const;
type SollbesatzungKey = (typeof SOLLBESATZUNG_KEYS)[number];

const toNonNegativeInteger = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
};

const sanitizeSollbesatzung = (value: unknown): SollbesatzungDto | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const sanitized: Partial<Record<SollbesatzungKey, number>> = {};

  for (const key of SOLLBESATZUNG_KEYS) {
    const parsed = toNonNegativeInteger(raw[key]);
    if (parsed !== undefined) {
      sanitized[key] = parsed;
    }
  }

  return Object.keys(sanitized).length > 0 ? (sanitized as SollbesatzungDto) : undefined;
};

const sanitizeCreatePayload = (data: CreateFahrzeugtypDto): CreateFahrzeugtypDto => {
  const sanitizedSollbesatzung = sanitizeSollbesatzung(data.sollbesatzung);

  return {
    ...data,
    sollbesatzung: sanitizedSollbesatzung,
  };
};

const sanitizeUpdatePayload = (data: UpdateFahrzeugtypDto): UpdateFahrzeugtypDto => {
  if (!Object.hasOwn(data, 'sollbesatzung')) {
    return data;
  }

  if (data.sollbesatzung && typeof data.sollbesatzung === 'object') {
    const rawKeys = Object.keys(data.sollbesatzung as Record<string, unknown>);
    if (rawKeys.length === 0) {
      return { ...data, sollbesatzung: {} };
    }
  }

  const sanitizedSollbesatzung = sanitizeSollbesatzung(data.sollbesatzung);

  if (sanitizedSollbesatzung) {
    return {
      ...data,
      sollbesatzung: sanitizedSollbesatzung,
    };
  }

  const { sollbesatzung: _ignored, ...rest } = data;
  return rest;
};

/**
 * Kategorie-Labels für Fahrzeugtypen (Deutsch).
 */
export const FAHRZEUGTYP_KATEGORIE_LABELS: Record<FahrzeugtypKategorie, string> = {
  RETTUNGSDIENST: 'Rettungsdienst',
  FUEHRUNG: 'Führung',
  TRANSPORT: 'Transport',
  SONSTIGES: 'Sonstiges',
};

/**
 * Kategorie zu Badge Variant Mapping.
 */
export const getFahrzeugtypKategorieBadgeVariant = (kategorie: FahrzeugtypKategorie): 'info' | 'success' | 'warning' | 'default' => {
  const mapping: Record<FahrzeugtypKategorie, 'info' | 'success' | 'warning' | 'default'> = {
    RETTUNGSDIENST: 'success',
    FUEHRUNG: 'info',
    TRANSPORT: 'warning',
    SONSTIGES: 'default',
  };

  return mapping[kategorie] || 'default';
};

/**
 * Hook für Admin Fahrzeugtypen-Management.
 *
 * Bietet CRUD-Operationen für Fahrzeugtypen mit TanStack Query.
 * Optimistic Updates für bessere UX.
 *
 * @param filters - Optional: Filter für istAktiv
 */
export const useAdminFahrzeugtypenManagement = (filters?: { istAktiv?: boolean }) => {
  const queryClient = useQueryClient();

  // Query: Liste aller Fahrzeugtypen
  const fahrzeugtypenQuery = useQuery<FahrzeugtypDto[], ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list(filters),
    queryFn: async () => {
      const response = await api.adminKraefteFahrzeugtypen().adminFahrzeugtypenControllerFindAllVAlpha({
        istAktiv: filters?.istAktiv,
      });

      return response.data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential Backoff mit 30s Cap
    staleTime: 30_000,
  });

  // Mutation: Fahrzeugtyp erstellen
  const createMutation = useMutation<FahrzeugtypDto, ResponseError, CreateFahrzeugtypDto>({
    mutationFn: async (data: CreateFahrzeugtypDto) => {
      const sanitizedData = sanitizeCreatePayload(data);
      const response = await api.adminKraefteFahrzeugtypen().adminFahrzeugtypenControllerCreateVAlpha({
        createFahrzeugtypDto: sanitizedData,
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Fahrzeugtyp erstellt', {
        description: 'Der Fahrzeugtyp wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(),
        exact: false,
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Fahrzeugtyp konnte nicht erstellt werden.', 'createFahrzeugtyp');
      logger.error('Failed to create fahrzeugtyp', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Fahrzeugtyp aktualisieren
  const updateMutation = useMutation<FahrzeugtypDto, ResponseError, { id: string; data: UpdateFahrzeugtypDto }, { previousQueries: Array<{ queryKey: readonly unknown[]; data: FahrzeugtypDto[] }> }>({
    mutationFn: async ({ id, data }) => {
      const sanitizedData = sanitizeUpdatePayload(data);
      const response = await api.adminKraefteFahrzeugtypen().adminFahrzeugtypenControllerUpdateVAlpha({
        id,
        updateFahrzeugtypDto: sanitizedData,
      });
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      const sanitizedData = sanitizeUpdatePayload(data);

      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: FahrzeugtypDto[] }> = [];
      queryClient.getQueriesData<FahrzeugtypDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<FahrzeugtypDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all() }, (old) => {
        if (!old) return old;

        return old.map((fahrzeugtyp) => (fahrzeugtyp.id === id ? { ...fahrzeugtyp, ...sanitizedData } : fahrzeugtyp));
      });

      return { previousQueries };
    },
    onError: async (error, _variables, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      const message = await getApiErrorMessage(error, 'Der Fahrzeugtyp konnte nicht aktualisiert werden.', 'updateFahrzeugtyp');
      logger.error('Failed to update fahrzeugtyp', error);
      toast.error('Fehler beim Aktualisieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Fahrzeugtyp aktualisiert', {
        description: 'Die Änderungen wurden gespeichert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(),
        exact: false,
      });
    },
  });

  // Mutation: Fahrzeugtyp deaktivieren
  const deactivateMutation = useMutation<FahrzeugtypDto, ResponseError, string, { previousQueries: Array<{ queryKey: readonly unknown[]; data: FahrzeugtypDto[] }> }>({
    mutationFn: async (id: string) => {
      const response = await api.adminKraefteFahrzeugtypen().adminFahrzeugtypenControllerDeactivateVAlpha({ id });
      return response.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(),
      });

      const previousQueries: Array<{ queryKey: readonly unknown[]; data: FahrzeugtypDto[] }> = [];
      queryClient.getQueriesData<FahrzeugtypDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all() }).forEach(([queryKey, oldData]) => {
        if (oldData) {
          previousQueries.push({ queryKey, data: oldData });
        }
      });

      queryClient.setQueriesData<FahrzeugtypDto[]>({ queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all() }, (old) => {
        if (!old) return old;
        return old.map((fahrzeugtyp) => (fahrzeugtyp.id === id ? { ...fahrzeugtyp, istAktiv: false } : fahrzeugtyp));
      });

      return { previousQueries };
    },
    onError: async (error, _id, context) => {
      if (context?.previousQueries) {
        for (const { queryKey, data } of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      const message = await getApiErrorMessage(error, 'Der Fahrzeugtyp konnte nicht deaktiviert werden.', 'deactivateFahrzeugtyp');
      logger.error('Failed to deactivate fahrzeugtyp', error);
      toast.error('Fehler beim Deaktivieren', { description: message });
    },
    onSuccess: async () => {
      toast.success('Fahrzeugtyp deaktiviert', {
        description: 'Der Fahrzeugtyp wurde deaktiviert.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(),
        exact: false,
      });
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

  return {
    // Query Data
    fahrzeugtypen: fahrzeugtypenQuery.data,
    isLoading: fahrzeugtypenQuery.isLoading,
    error: fahrzeugtypenQuery.error,
    refetch: fahrzeugtypenQuery.refetch,

    // Mutations
    createFahrzeugtyp: createMutation.mutate,
    updateFahrzeugtyp: updateMutation.mutate,
    deactivateFahrzeugtyp: deactivateMutation.mutate,

    // Mutation States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isMutating,

    // Mutation Variables (für per-row tracking)
    updatingId: updateMutation.isPending ? updateMutation.variables?.id : undefined,
    deactivatingId: deactivateMutation.isPending ? deactivateMutation.variables : undefined,
  };
};
