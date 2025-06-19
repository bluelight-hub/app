import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { getBaseUrl } from '../utils/fetch';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  isMfaEnabled: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Remove mock user - we'll use real API

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      // For now, we'll trust the token exists
      // In production, you'd verify with the backend
      // TODO: Implement token verification endpoint
      logger.debug('Found existing auth token');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('Login successful', { email });

        // Store tokens
        if (data.accessToken) {
          localStorage.setItem('auth_token', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }

        // Set user
        if (data.user) {
          setUser(data.user);
        }

        setIsLoading(false);
        return true;
      } else {
        logger.error('Login failed', { status: response.status });
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      logger.error('Login error', { error });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${getBaseUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        credentials: 'include',
      });
    } catch (error) {
      logger.error('Logout error', { error });
    }

    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
