import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';

/**
 * Hook für Admin-spezifische Authentifizierung und Autorisierung
 */
export const useAdminAuth = () => {
  const { user, isAuthenticated, isLoading, isAdmin: checkIsAdmin, hasRole } = useAuth();
  const navigate = useNavigate();

  const isAdmin = checkIsAdmin();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const isAdminRole = hasRole('ADMIN');
  const isSupport = hasRole('SUPPORT');
  
  // Berechtigungen basierend auf Rollen
  const canViewUsers = isAdmin;
  const canEditUsers = isSuperAdmin || isAdminRole;
  const canViewOrganizations = isAdmin;
  const canEditOrganizations = isSuperAdmin || isAdminRole;
  const canViewSystemSettings = isAdmin;
  const canEditSystemSettings = isSuperAdmin;
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
