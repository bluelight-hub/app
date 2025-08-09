import { useAuth } from '@/hooks/useAuth';

export const useAdminAuth = () => {
  const { user, isAdminAuthenticated, isLoading } = useAuth();

  const isAdmin =
    isAdminAuthenticated && user?.role && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  return {
    isAdmin,
    isLoading,
    user,
  };
};
