import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import { broadcastInvalidation } from '@/shared/lib/cross-window-sync';
import type { CreateUserDto, DeleteManagedUserResponse, ResponseError, UpdateUserDto, ManagedUserResponse, ManagedUsersListResponse, ChangeOperativeRoleDtoOperativeRoleEnum } from '@/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_QUERY_KEYS } from './queries';

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
  const usersQuery = useQuery<ManagedUsersListResponse, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.users,
    queryFn: async () => {
      return await api.userManagement().userManagementControllerFindAllVAlpha();
    },
  });

  // Mutation für Benutzer erstellen
  const createUserMutation = useMutation<ManagedUserResponse, ResponseError, CreateUserDto>({
    mutationFn: async (data: CreateUserDto) => {
      return await api.userManagement().userManagementControllerCreateVAlpha({
        createUserDto: data,
      });
    },
    onSuccess: async () => {
      toast.success('Benutzer erstellt', {
        description: 'Der Benutzer wurde erfolgreich erstellt.',
      });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Benutzer konnte nicht erstellt werden.', 'createUser');

      logger.error('Failed to create a user', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  // Mutation für Benutzer aktualisieren
  const updateUserMutation = useMutation<ManagedUserResponse, ResponseError, { id: string; data: UpdateUserDto }>({
    mutationFn: async ({ id, data }) => {
      return await api.userManagement().userManagementControllerUpdateVAlpha({
        id,
        updateUserDto: data,
      });
    },
    onSuccess: async () => {
      toast.success('Benutzer aktualisiert', {
        description: 'Die Änderungen wurden erfolgreich gespeichert.',
      });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Benutzer konnte nicht aktualisiert werden.', 'updateUser');

      logger.error('Failed to update user', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  // Mutation für Benutzer löschen (mit optionalem Downgrade)
  const deleteUserMutation = useMutation<DeleteManagedUserResponse, ResponseError, { id: string; downgradeAdmin?: boolean }, { previousUsers: ManagedUsersListResponse | undefined }>({
    mutationFn: async ({ id, downgradeAdmin }) => {
      return await api.userManagement().userManagementControllerRemoveVAlpha({
        id,
        deleteUserDto: downgradeAdmin ? { downgradeAdmin } : undefined,
      });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.users });

      const previousUsers = queryClient.getQueryData<ManagedUsersListResponse>(ADMIN_QUERY_KEYS.users);

      queryClient.setQueryData<ManagedUsersListResponse>(ADMIN_QUERY_KEYS.users, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((user) => user.id !== id),
        };
      });

      return { previousUsers };
    },
    onError: async (error: ResponseError, _id, context) => {
      queryClient.setQueryData(ADMIN_QUERY_KEYS.users, context?.previousUsers);

      const message = await getApiErrorMessage(error, 'Der Benutzer konnte nicht gelöscht werden.', 'deleteUser');

      logger.error('Failed to delete user', error);
      toast.error('Fehler', {
        description: message,
      });
    },
    onSuccess: (_, { downgradeAdmin }) => {
      if (downgradeAdmin) {
        toast.success('Admin herabgestuft', {
          description: 'Der Admin wurde erfolgreich zu einem normalen Benutzer herabgestuft.',
        });
      } else {
        toast.success('Benutzer gelöscht', {
          description: 'Der Benutzer wurde erfolgreich gelöscht.',
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
  });

  // Mutation für Benutzer sperren
  const lockUserMutation = useMutation<ManagedUserResponse, ResponseError, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      return await api.userManagement().userManagementControllerLockVAlpha({
        id,
        lockUserDto: reason ? { reason } : undefined,
      });
    },
    onSuccess: async () => {
      toast.success('Benutzer gesperrt', {
        description: 'Der Benutzer wurde erfolgreich gesperrt.',
      });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Benutzer konnte nicht gesperrt werden.', 'lockUser');

      logger.error('Failed to lock user', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  // Mutation für Benutzer entsperren
  const unlockUserMutation = useMutation<ManagedUserResponse, ResponseError, string>({
    mutationFn: async (id: string) => {
      return await api.userManagement().userManagementControllerUnlockVAlpha({ id });
    },
    onSuccess: async () => {
      toast.success('Benutzer entsperrt', {
        description: 'Der Benutzer wurde erfolgreich entsperrt.',
      });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Benutzer konnte nicht entsperrt werden.', 'unlockUser');

      logger.error('Failed to unlock user', error);
      toast.error('Fehler', {
        description: message,
      });
    },
  });

  // Mutation für operative Rolle ändern
  const changeOperativeRoleMutation = useMutation({
    mutationFn: async ({ id, operativeRole }: { id: string; operativeRole: ChangeOperativeRoleDtoOperativeRoleEnum }) => {
      return await api.admin().adminOperativeRoleControllerChangeOperativeRoleVAlpha({
        id,
        changeOperativeRoleDto: { operativeRole },
      });
    },
    onSuccess: async () => {
      toast.success('Operative Rolle geändert', {
        description: 'Die operative Rolle wurde erfolgreich aktualisiert.',
      });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die operative Rolle konnte nicht geändert werden.', 'changeOperativeRole');
      logger.error('Failed to change operative role', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation für Stammperson zuweisen
  const assignStammpersonMutation = useMutation({
    mutationFn: async ({ id, stammpersonId }: { id: string; stammpersonId: string | null }) => {
      return await api.admin().adminOperativeRoleControllerAssignStammpersonVAlpha({
        id,
        assignStammpersonDto: { stammpersonId },
      });
    },
    onSuccess: async () => {
      toast.success('Stammperson aktualisiert', {
        description: 'Die Stammperson-Zuweisung wurde erfolgreich aktualisiert.',
      });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
      broadcastInvalidation('admin.users');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Stammperson konnte nicht zugewiesen werden.', 'assignStammperson');
      logger.error('Failed to assign stammperson', error);
      toast.error('Fehler', { description: message });
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
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutate,
    lockUser: lockUserMutation.mutate,
    unlockUser: unlockUserMutation.mutate,
    changeOperativeRole: changeOperativeRoleMutation.mutateAsync,
    assignStammperson: assignStammpersonMutation.mutateAsync,

    // Mutation-Zustände
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isLocking: lockUserMutation.isPending,
    isUnlocking: unlockUserMutation.isPending,
    isChangingOperativeRole: changeOperativeRoleMutation.isPending,
    isAssigningStammperson: assignStammpersonMutation.isPending,
    createUserError: createUserMutation.error,
    updateUserError: updateUserMutation.error,
    deleteUserError: deleteUserMutation.error,
    lockUserError: lockUserMutation.error,
    unlockUserError: unlockUserMutation.error,
  };
};
