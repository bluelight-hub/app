import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateUserDto,
  DeleteUserResponse,
  ResponseError,
  UserResponse,
  UsersListResponse,
} from '@bluelight-hub/shared/client';
import { api } from '@/api/api';
import { toaster } from '@/components/ui/toaster.instance';
import { QUERY_KEYS } from '@/queryKeys';
import { logger } from '@/utils/logger';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';

/**
 * Hook für Admin-Benutzerverwaltung
 *
 * Stellt alle Funktionen für Admin-Benutzerverwaltung bereit:
 * - Laden der Benutzerliste
 * - Erstellen neuer Benutzer
 * - Löschen von Benutzern
 *
 * @returns Objekt mit Benutzerdaten, Ladezuständen und Aktionen
 */
export const useAdminUserManagement = () => {
  const queryClient = useQueryClient();

  // Query für Benutzerliste
  const usersQuery = useQuery<UsersListResponse>({
    queryKey: QUERY_KEYS.admin.users,
    queryFn: async () => {
      return await api.userManagement().userManagementControllerFindAllVAlpha();
    },
  });

  // Mutation für Benutzer erstellen
  const createUserMutation = useMutation<UserResponse, ResponseError, CreateUserDto>({
    mutationFn: async (data: CreateUserDto) => {
      return await api.userManagement().userManagementControllerCreateVAlpha({
        createUserDto: data,
      });
    },
    onSuccess: async () => {
      toaster.create({
        title: 'Benutzer erstellt',
        description: 'Der Benutzer wurde erfolgreich erstellt.',
        type: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(
        error,
        'Der Benutzer konnte nicht erstellt werden.',
        'createUser',
      );

      logger.error('Failed to create user', error);
      toaster.create({
        title: 'Fehler',
        description: message,
        type: 'error',
      });
    },
  });

  // Mutation für Benutzer löschen
  const deleteUserMutation = useMutation<
    DeleteUserResponse,
    ResponseError,
    string,
    { previousUsers: UsersListResponse | undefined }
  >({
    mutationFn: async (id: string) => {
      return await api.userManagement().userManagementControllerRemoveVAlpha({ id });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.admin.users });

      const previousUsers = queryClient.getQueryData<UsersListResponse>(QUERY_KEYS.admin.users);

      queryClient.setQueryData<UsersListResponse>(QUERY_KEYS.admin.users, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((user) => user.id !== id),
        };
      });

      return { previousUsers };
    },
    onError: async (error: ResponseError, _id, context) => {
      queryClient.setQueryData(QUERY_KEYS.admin.users, context?.previousUsers);

      const message = await getApiErrorMessage(
        error,
        'Der Benutzer konnte nicht gelöscht werden.',
        'deleteUser',
      );

      logger.error('Failed to delete user', error);
      toaster.create({
        title: 'Fehler',
        description: message,
        type: 'error',
      });
    },
    onSuccess: () => {
      toaster.create({
        title: 'Benutzer gelöscht',
        description: 'Der Benutzer wurde erfolgreich gelöscht.',
        type: 'success',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users });
    },
  });

  return {
    // Benutzerdaten und Ladezustände
    users: usersQuery.data?.data,
    usersData: usersQuery.data,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    refetch: usersQuery.refetch,

    // Aktionen
    createUser: createUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,

    // Mutation-Zustände
    isCreating: createUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    createUserError: createUserMutation.error,
    deleteUserError: deleteUserMutation.error,
  };
};
