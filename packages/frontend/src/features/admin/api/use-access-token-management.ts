import { api } from '@/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import { toast } from 'sonner';
import type {
  AdminTokenControllerCreateTokenVAlpha201Response,
  AdminTokenControllerListTokensVAlpha200Response,
  AdminTokenControllerRevokeTokenVAlpha200Response,
  AdminTokenControllerRotateTokenVAlpha201Response,
  CreateAccessTokenDto,
  ResponseError,
} from '@/shared';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Verfuegbare Sortierfelder fuer die Token-Liste
 */
export type TokenSortField = 'createdAt' | 'lastUsedAt' | 'name';

/**
 * Sortierrichtung
 */
export type TokenSortOrder = 'asc' | 'desc';

/**
 * Filter-Optionen fuer die Access-Token-Liste
 *
 * Hinweis: sortBy, sortOrder und inactiveDays sind fuer zukuenftige
 * Backend-Integration vorbereitet. Aktuell erfolgt Sortierung client-seitig.
 */
export interface AccessTokenFilters {
  page?: number;
  limit?: number;
  /** Sortierfeld (client-seitig, Backend-Support geplant) */
  sortBy?: TokenSortField;
  /** Sortierrichtung (client-seitig, Backend-Support geplant) */
  sortOrder?: TokenSortOrder;
  /** Filter: Tokens die seit X Tagen inaktiv sind (Backend-Support geplant) */
  inactiveDays?: number;
}

/**
 * Standalone Hook fuer die Token-Liste
 *
 * Laed alle Access-Tokens mit optionaler Pagination.
 * Token-Hashes werden aus Sicherheitsgruenden nicht angezeigt.
 *
 * @param filters - Optionale Pagination-Parameter
 * @returns Query-Result mit Token-Liste
 */
export const useListAccessTokens = (filters: AccessTokenFilters = {}) => {
  // Extrahiere nur Pagination-Parameter fuer Query Key (Sortierung ist client-seitig)
  const paginationFilters = { page: filters.page, limit: filters.limit };

  return useQuery<AdminTokenControllerListTokensVAlpha200Response, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.accessTokens.list(paginationFilters),
    queryFn: async () => {
      return await api.admin().adminTokenControllerListTokensVAlpha({
        page: filters.page,
        limit: filters.limit,
      });
    },
  });
};

/**
 * Standalone Hook fuer das Erstellen eines Tokens
 *
 * Erstellt ein neues Server-Access-Token mit dem angegebenen Namen.
 * Das vollstaendige Token wird NUR in der Response angezeigt und kann
 * danach nicht mehr abgerufen werden.
 *
 * @returns Mutation-Result fuer Create-Operation
 */
export const useCreateAccessToken = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminTokenControllerCreateTokenVAlpha201Response, ResponseError, CreateAccessTokenDto>({
    mutationFn: async (data: CreateAccessTokenDto) => {
      return await api.admin().adminTokenControllerCreateTokenVAlpha({
        createAccessTokenDto: data,
      });
    },
    onSuccess: async (response) => {
      const tokenName = response.data?.name;
      const tokenPrefix = response.data?.prefix;

      toast.success('Access-Token erstellt', {
        description: `Token "${tokenName}" (${tokenPrefix}...) wurde erfolgreich erstellt.`,
      });

      // Invalidate alle Token-Queries
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Access-Token konnte nicht erstellt werden.', 'createAccessToken');

      logger.error('Failed to create access token', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });
};

/**
 * Standalone Hook fuer das Widerrufen eines Tokens
 *
 * Widerruft ein Access-Token. Das Token kann danach nicht mehr
 * fuer die Authentifizierung verwendet werden.
 * Alle Geraete mit diesem Token verlieren sofort den Zugriff.
 *
 * @returns Mutation-Result fuer Revoke-Operation
 */
export const useRevokeAccessToken = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminTokenControllerRevokeTokenVAlpha200Response, ResponseError, string>({
    mutationFn: async (tokenId: string) => {
      return await api.admin().adminTokenControllerRevokeTokenVAlpha({ id: tokenId });
    },
    onSuccess: async (response) => {
      const tokenName = response.data?.name;

      toast.success('Access-Token deaktiviert', {
        description: `Token "${tokenName}" wurde erfolgreich widerrufen.`,
      });

      // Invalidate alle Token-Queries
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Access-Token konnte nicht widerrufen werden.', 'revokeAccessToken');

      logger.error('Failed to revoke access token', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });
};

/**
 * Standalone Hook fuer das Reaktivieren eines Tokens
 *
 * Reaktiviert ein zuvor widerrufenes Access-Token.
 * Das Token kann danach wieder fuer die Authentifizierung verwendet werden.
 *
 * @returns Mutation-Result fuer Reactivate-Operation
 */
export const useReactivateAccessToken = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminTokenControllerRevokeTokenVAlpha200Response, ResponseError, string>({
    mutationFn: async (tokenId: string) => {
      return await api.admin().adminTokenControllerReactivateTokenVAlpha({ id: tokenId });
    },
    onSuccess: async (response) => {
      const tokenName = response.data?.name;

      toast.success('Access-Token reaktiviert', {
        description: `Token "${tokenName}" wurde erfolgreich reaktiviert.`,
      });

      // Invalidate alle Token-Queries
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Access-Token konnte nicht reaktiviert werden.', 'reactivateAccessToken');

      logger.error('Failed to reactivate access token', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });
};

/**
 * Input-Parameter fuer Token-Rotation
 */
export interface RotateAccessTokenInput {
  /** ID des zu rotierenden Tokens */
  tokenId: string;
  /** Optionaler neuer Name fuer das Token (3-50 Zeichen) */
  newName?: string;
}

/**
 * Standalone Hook fuer das Rotieren eines Tokens
 *
 * Rotiert ein Access-Token: Das alte Token wird widerrufen, ein neues wird erstellt.
 * Das neue Token ist NUR in der Response sichtbar und kann danach nicht mehr
 * abgerufen werden.
 *
 * @returns Mutation-Result fuer Rotate-Operation
 */
export const useRotateAccessToken = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminTokenControllerRotateTokenVAlpha201Response, ResponseError, RotateAccessTokenInput>({
    mutationFn: async ({ tokenId, newName }: RotateAccessTokenInput) => {
      return await api.admin().adminTokenControllerRotateTokenVAlpha({
        id: tokenId,
        rotateAccessTokenRequestDto: { newName },
      });
    },
    onSuccess: async () => {
      // Kein Toast - Modal zeigt eigene Success-UI mit Token-Anzeige
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Access-Token konnte nicht rotiert werden.', 'rotateAccessToken');

      logger.error('Failed to rotate access token', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });
};

/**
 * Hook fuer das Access-Token-Management
 *
 * Convenience-Wrapper der die standalone Hooks als Objekt bereitstellt.
 * Ermoeglicht gruppierte Verwendung aller Token-Operationen.
 *
 * @returns Objekt mit Query- und Mutation-Hooks
 * @example
 * const { useTokenList, useCreateToken, useRevokeToken, useReactivateToken, useRotateToken } = useAccessTokenManagement();
 * const tokenList = useTokenList();
 * const createMutation = useCreateToken();
 * const revokeMutation = useRevokeToken();
 * const rotateMutation = useRotateToken();
 */
export const useAccessTokenManagement = () => {
  return {
    useTokenList: useListAccessTokens,
    useCreateToken: useCreateAccessToken,
    useRevokeToken: useRevokeAccessToken,
    useReactivateToken: useReactivateAccessToken,
    useRotateToken: useRotateAccessToken,
  };
};
