import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import type {
  AdminInviteControllerListInvitesVAlpha200Response,
  AdminInviteControllerListInvitesVAlphaStatusEnum,
  AdminInviteControllerRevokeInviteVAlpha200Response,
  AdminInviteControllerCreateInviteVAlpha201Response,
  CreateInviteDto,
  ResponseError,
} from '@/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Filter-Optionen für die Invite-Code-Liste
 */
export interface InviteFilters {
  status?: AdminInviteControllerListInvitesVAlphaStatusEnum;
  createdBy?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

/**
 * Hook für das Laden der Invite-Code-Liste
 *
 * Lädt alle Invite-Codes mit optionalen Filtern.
 * Unterstützt Pagination, Status-Filter und Sortierung.
 *
 * @param filters - Optionale Filter-Parameter
 * @returns Query-Result mit Invite-Codes
 */
export const useListInvites = (filters: InviteFilters = {}) => {
  return useQuery<AdminInviteControllerListInvitesVAlpha200Response, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.invites.list(filters),
    queryFn: async () => {
      return await api.admin().adminInviteControllerListInvitesVAlpha({
        status: filters.status,
        createdBy: filters.createdBy,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sort,
      });
    },
  });
};

/**
 * Hook für das Erstellen eines neuen Invite-Codes
 *
 * Erstellt einen neuen Invite-Code mit optionalen Parametern.
 * Zeigt den vollständigen Code im Success-Toast für einfaches Kopieren.
 * Invalidiert automatisch die Invite-Liste nach Erfolg.
 *
 * @returns Mutation-Result für Create-Operation
 */
export const useCreateInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminInviteControllerCreateInviteVAlpha201Response, ResponseError, CreateInviteDto>({
    mutationFn: async (data: CreateInviteDto) => {
      return await api.admin().adminInviteControllerCreateInviteVAlpha({ createInviteDto: data });
    },
    onSuccess: async (response) => {
      const inviteCode = response.data?.code;
      toast.success('Invite-Code erstellt', {
        description: `Code: ${inviteCode}`,
        duration: 10000, // Längere Anzeigedauer für Kopieren
      });
      // Invalidate alle Invite-Queries
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.invites.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Invite-Code konnte nicht erstellt werden.', 'createInvite');

      logger.error('Failed to create invite code', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });
};

/**
 * Hook für das Widerrufen eines Invite-Codes
 *
 * Widerruft einen Invite-Code permanent.
 * Invalidiert automatisch die Invite-Liste nach Erfolg.
 *
 * @returns Mutation-Result für Revoke-Operation
 */
export const useRevokeInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminInviteControllerRevokeInviteVAlpha200Response, ResponseError, string>({
    mutationFn: async (id: string) => {
      return await api.admin().adminInviteControllerRevokeInviteVAlpha({ id });
    },
    onSuccess: async () => {
      toast.success('Invite-Code widerrufen', {
        description: 'Der Invite-Code wurde erfolgreich widerrufen.',
      });
      // Invalidate alle Invite-Queries
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.invites.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Invite-Code konnte nicht widerrufen werden.', 'revokeInvite');

      logger.error('Failed to revoke invite code', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });
};
