/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { AuthUserDto } from '@bluelight-hub/shared/client';

// Legacy User type for backward compatibility
type User = AuthUserDto;

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that wraps the application and provides authentication context.
 * This is now a thin wrapper around the Zustand auth store for backward compatibility.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use individual selectors to prevent unnecessary re-renders
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Create the context value with the same interface as before
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout: async () => {
      await logout();
    },
    hasRole,
    hasPermission,
    isAdmin,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export default AuthContext;
