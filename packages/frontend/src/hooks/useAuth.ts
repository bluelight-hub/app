import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { milliseconds } from 'date-fns';
import type {
  AdminPasswordDto,
  AdminSetupDto,
  LoginUserDto,
  RegisterUserDto,
} from '@bluelight-hub/shared/dist';
import { QUERY_KEYS } from '@/queryKeys.ts';
import { api } from '@/api/api.ts';

/**
 * Provides authentication-related functionality and state handling.
 *
 * The `useAuth` hook manages multiple authentication queries and mutations,
 * including checking user authentication status, verifying admin status,
 * and handling user or admin logout operations.
 *
 * @returns {Object} An object containing authentication-related state and functions:
 * - isLoading: Indicates if any of the authentication-related queries are currently loading.
 * - user: The authenticated user's information, if available.
 * - isAdminAuthenticated: Indicates if the user is authenticated as an admin.
 * - logoutAdmin: A mutation function for logging out an admin.
 * - logout: A mutation function for logging out a regular user.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();
  const authCheckQuery = useQuery({
    queryKey: QUERY_KEYS.auth.queries.authCheck,
    queryFn: () => api.auth().authControllerCheckAuth(),
  });
  const adminStatusQuery = useQuery({
    queryKey: QUERY_KEYS.auth.queries.adminStatus,
    queryFn: () => api.auth().authControllerGetAdminStatus(),
    staleTime: milliseconds({ seconds: 30 }),
    refetchInterval: milliseconds({ seconds: 30 }),
    throwOnError: false,
  });
  const adminPresenceQuery = useQuery({
    queryKey: QUERY_KEYS.auth.queries.adminPresence,
    queryFn: () => api.auth().authControllerGetAdminStatus(),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.auth().authControllerLogout(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.queryKey });
    },
  });
  const logoutAdminMutation = useMutation({
    mutationFn: () => api.auth().authControllerAdminLogout(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.queryKey });
    },
  });
  const loginMutation = useMutation({
    mutationFn: (loginUserDto: LoginUserDto) => api.auth().authControllerLogin({ loginUserDto }),
    onSuccess: () => {
      void authCheckQuery.refetch();
    },
  });
  const loginAdminMutation = useMutation({
    mutationFn: (adminPasswordDto: AdminPasswordDto) =>
      api.auth().authControllerAdminLogin({ adminPasswordDto }),
    onSuccess: () => {
      void authCheckQuery.refetch();
    },
  });
  const registerMutation = useMutation({
    mutationFn: (registerUserDto: RegisterUserDto) =>
      api.auth().authControllerRegister({ registerUserDto }),
    onSuccess: () => {
      void authCheckQuery.refetch();
    },
  });
  const adminSetupMutation = useMutation({
    mutationFn: (adminSetupDto: AdminSetupDto) =>
      api.auth().authControllerAdminSetup({ adminSetupDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.auth.queries.adminStatus,
      });
    },
  });

  return {
    isLoading:
      authCheckQuery.isLoading || adminStatusQuery.isLoading || adminPresenceQuery.isLoading,
    user: authCheckQuery.data?.user,
    isAdminAuthenticated: authCheckQuery.data?.isAdminAuthenticated,
    logoutAdmin: logoutAdminMutation,
    logout: logoutMutation,
    login: loginMutation,
    loginAdmin: loginAdminMutation,
    register: registerMutation,
    adminSetup: adminSetupMutation,
    adminStatus: adminStatusQuery.isFetched
      ? {
          adminSetupAvailable: adminStatusQuery.data?.adminSetupAvailable,
        }
      : undefined,
  };
};
