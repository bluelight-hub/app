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
 * Hook zum Abrufen aller Benutzer aus dem System
 *
 * Lädt die Liste aller Benutzer über die User Management API und
 * cached die Daten mit React Query für optimale Performance.
 *
 * @returns {UseQueryResult<UsersListResponse>} Query-Objekt mit Benutzerliste, Ladezustand und Fehlerinformationen
 */
export const useUsers = () => {
  return useQuery<UsersListResponse>({
    queryKey: QUERY_KEYS.user.users,
    queryFn: async () => {
      return await api.userManagement().userManagementControllerFindAllVAlpha();
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<UserResponse, ResponseError, CreateUserDto>({
    mutationFn: async (data: CreateUserDto) => {
      return await api.userManagement().userManagementControllerCreateVAlpha({
        createUserDto: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user.users });
      toaster.create({
        title: 'Benutzer erstellt',
        description: 'Der Benutzer wurde erfolgreich erstellt.',
        type: 'success',
      });
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
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DeleteUserResponse,
    ResponseError,
    string,
    { previousUsers: UsersListResponse | undefined }
  >({
    mutationFn: async (id: string) => {
      return await api.userManagement().userManagementControllerRemoveVAlpha({ id });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.user.users });

      const previousUsers = queryClient.getQueryData<UsersListResponse>(QUERY_KEYS.user.users);

      queryClient.setQueryData<UsersListResponse>(QUERY_KEYS.user.users, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((user) => user.id !== id),
        };
      });

      return { previousUsers };
    },
    onError: async (error: ResponseError, _id, context) => {
      queryClient.setQueryData(QUERY_KEYS.user.users, context?.previousUsers);

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user.users });
    },
  });
};
