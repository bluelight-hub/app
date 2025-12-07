import { useAuth } from '@/features/auth/hooks/useAuth';

export const useAdminAuth = () => {
  const { user, isAdminAuthenticated, isLoading } = useAuth();

  // isAdmin prüft sowohl Admin-Auth als auch die Rolle
  const isAdmin = isAdminAuthenticated && user?.role && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  // hasAdminSession prüft nur ob Admin-Token vorhanden ist (unabhängig von der Rolle)
  const hasAdminSession = isAdminAuthenticated;

  return {
    isAdmin,
    hasAdminSession,
    isAdminAuthenticated,
    isLoading,
    user,
  };
};
