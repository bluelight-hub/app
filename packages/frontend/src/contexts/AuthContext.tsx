/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { api } from '../api';
import { logger } from '../utils/logger';
import { authStorage } from '../utils/authStorage';

interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const hasTokens = await authStorage.hasValidTokens();
        if (hasTokens) {
          logger.debug('Found existing auth token, fetching user data');

          // Get current user data from backend
          try {
            const response = await api.auth.authControllerGetCurrentUserV1Raw();
            if (response.raw.ok) {
              const userData = await response.raw.json();
              setUser(userData);
              logger.debug('User data loaded successfully');
            } else {
              logger.warn('Failed to fetch user data, clearing tokens');
              await authStorage.clearTokens();
            }
          } catch (error) {
            logger.error('Error fetching user data:', error);
            await authStorage.clearTokens();
          }
        }
      } catch (error) {
        logger.error('Error checking auth tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean }> => {
    setIsLoading(true);

    try {
      // Use the raw method to get access to the response
      const response = await api.auth.authControllerLoginV1Raw({
        loginDto: { email, password },
      });

      if (response.raw.ok) {
        const data = await response.raw.json();
        logger.info('Login response received', { email });

        // Store tokens using authStorage
        if (data.accessToken) {
          await authStorage.setTokens(data.accessToken, data.refreshToken);
        }

        // Set user
        if (data.user) {
          setUser(data.user);
        }

        setIsLoading(false);
        return { success: true };
      } else {
        logger.error('Login failed', { status: response.raw.status });
        setIsLoading(false);
        return { success: false };
      }
    } catch (error) {
      logger.error('Login error', { error });
      setIsLoading(false);
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await api.auth.authControllerLogoutV1();
    } catch (error) {
      logger.error('Logout error', { error });
    }

    setUser(null);
    await authStorage.clearTokens();
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  // Check if user is any type of admin
  const isAdmin = (): boolean => {
    return user?.roles?.some((role) => ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
