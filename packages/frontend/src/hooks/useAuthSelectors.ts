import { useAuthStore } from '../stores/useAuthStore';

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    hasRole: state.hasRole,
    hasPermission: state.hasPermission,
    isAdmin: state.isAdmin,
  }));
