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
  // Use a single subscription to avoid multiple re-renders
  const authState = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login: state.login,
    logout: state.logout,
    hasRole: state.hasRole,
    hasPermission: state.hasPermission,
    isAdmin: state.isAdmin,
    checkAuthStatus: state.checkAuthStatus,
  }));

  useEffect(() => {
    // Check auth status on mount
    authState.checkAuthStatus();
  }, []); // Empty dependency array since checkAuthStatus is stable

  // Create the context value with the same interface as before
  const contextValue: AuthContextType = {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login: authState.login,
    logout: async () => {
      await authState.logout();
    },
    hasRole: authState.hasRole,
    hasPermission: authState.hasPermission,
    isAdmin: authState.isAdmin,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export default AuthContext;
