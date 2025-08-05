import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateUserDto,
  DeleteUserResponse,
  UsersListResponse,
} from '@bluelight-hub/shared/client';
import { api } from '@/api/api';
import { toaster } from '@/components/ui/toaster.instance';

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export const useUsers = () => {
  return useQuery<UsersListResponse>({
    queryKey: ['users'],
    queryFn: async () => {
      return await api.userManagement().userManagementControllerFindAllVAlpha();
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      return await api.userManagement().userManagementControllerCreateVAlpha({
        createUserDto: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toaster.create({
        title: 'Benutzer erstellt',
        description: 'Der Benutzer wurde erfolgreich erstellt.',
        type: 'success',
      });
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || error.message;
      toaster.create({
        title: 'Fehler',
        description:
          message.includes('duplicate') || message.includes('unique')
            ? 'Ein Benutzer mit diesem Namen existiert bereits.'
            : 'Der Benutzer konnte nicht erstellt werden.',
        type: 'error',
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DeleteUserResponse,
    Error,
    string,
    { previousUsers: UsersListResponse | undefined }
  >({
    mutationFn: async (id: string) => {
      return await api.userManagement().userManagementControllerRemoveVAlpha({ id });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });

      const previousUsers = queryClient.getQueryData<UsersListResponse>(['users']);

      queryClient.setQueryData<UsersListResponse>(['users'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((user) => user.id !== id),
        };
      });

      return { previousUsers };
    },
    onError: (error: ApiError, _id, context) => {
      queryClient.setQueryData(['users'], context?.previousUsers);

      const message = error.response?.data?.message || error.message;
      toaster.create({
        title: 'Fehler',
        description: message.includes('Super-Admin')
          ? 'Der letzte Super-Admin kann nicht gelöscht werden.'
          : 'Der Benutzer konnte nicht gelöscht werden.',
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
