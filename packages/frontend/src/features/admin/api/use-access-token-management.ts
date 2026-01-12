import { api } from '@/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import { toast } from 'sonner';
import type { AdminTokenControllerCreateTokenVAlpha201Response, AdminTokenControllerListTokensVAlpha200Response, CreateAccessTokenDto, ResponseError } from '@/shared';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Filter-Optionen fuer die Access-Token-Liste
 */
export interface AccessTokenFilters {
  page?: number;
  limit?: number;
}

/**
 * Hook fuer das Access-Token-Management
 *
 * Stellt alle CRUD-Operationen fuer Server-Access-Tokens bereit:
 * - Liste aller Tokens abrufen (paginiert)
 * - Neues Token erstellen
 *
 * @returns Objekt mit Query- und Mutation-Hooks
 */
export const useAccessTokenManagement = () => {
  const queryClient = useQueryClient();

  /**
   * Query fuer die Token-Liste
   *
   * Laed alle Access-Tokens mit optionaler Pagination.
   * Token-Hashes werden aus Sicherheitsgruenden nicht angezeigt.
   *
   * @param filters - Optionale Pagination-Parameter
   * @returns Query-Result mit Token-Liste
   */
  const useTokenList = (filters: AccessTokenFilters = {}) => {
    return useQuery<AdminTokenControllerListTokensVAlpha200Response, ResponseError>({
      queryKey: ADMIN_QUERY_KEYS.accessTokens.list(filters),
      queryFn: async () => {
        return await api.admin().adminTokenControllerListTokensVAlpha({
          page: filters.page,
          limit: filters.limit,
        });
      },
    });
  };

  /**
   * Mutation fuer das Erstellen eines neuen Tokens
   *
   * Erstellt ein neues Server-Access-Token mit dem angegebenen Namen.
   * Das vollstaendige Token wird NUR in der Response angezeigt und kann
   * danach nicht mehr abgerufen werden.
   *
   * @returns Mutation-Result fuer Create-Operation
   */
  const useCreateToken = () => {
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
          duration: 5000,
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

  return {
    useTokenList,
    useCreateToken,
  };
};

/**
 * Standalone Hook fuer die Token-Liste
 *
 * Convenience-Export fuer direkten Import ohne useAccessTokenManagement().
 *
 * @param filters - Optionale Pagination-Parameter
 * @returns Query-Result mit Token-Liste
 */
export const useListAccessTokens = (filters: AccessTokenFilters = {}) => {
  return useQuery<AdminTokenControllerListTokensVAlpha200Response, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.accessTokens.list(filters),
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
 * Convenience-Export fuer direkten Import ohne useAccessTokenManagement().
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
        duration: 5000,
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
