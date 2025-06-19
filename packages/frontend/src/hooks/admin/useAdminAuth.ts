import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';

/**
 * Hook für Admin-spezifische Authentifizierung und Autorisierung
 */
export const useAdminAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const canViewUsers = isAdmin;
  const canEditUsers = isAdmin;
  const canViewOrganizations = isAdmin;
  const canEditOrganizations = isAdmin;
  const canViewSystemSettings = isAdmin;
  const canEditSystemSettings = isAdmin;
  const canViewLogs = isAdmin;

  useEffect(() => {
    // Redirect wenn nicht authentifiziert oder kein Admin
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/app');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  return {
    isAdmin,
    isLoading,
    permissions: {
      canViewUsers,
      canEditUsers,
      canViewOrganizations,
      canEditOrganizations,
      canViewSystemSettings,
      canEditSystemSettings,
      canViewLogs,
    },
  };
};
