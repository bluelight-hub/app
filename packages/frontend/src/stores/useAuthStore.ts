import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { api } from '../api';
import { logger } from '../utils/logger';
import { authStorage } from '../utils/authStorage';
import {
  AuthUserDto,
  CreateAuditLogDtoActionTypeEnum as AuditActionType,
  CreateAuditLogDtoSeverityEnum as AuditSeverity,
} from '@bluelight-hub/shared/client';
import { auditLogger } from '../utils/audit';

interface AuthState {
  user: AuthUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  sessionExpiresAt: Date | null;
  lastRefreshAt: Date | null;
  refreshTimer: NodeJS.Timeout | null;
}

interface AuthActions {
  setUser: (user: AuthUserDto | null) => void;
  setTokens: (accessToken: string, refreshToken?: string, expiresIn?: number) => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    errorDetails?: {
      lockedUntil?: string;
      remainingAttempts?: number;
    };
  }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  checkAuthStatus: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  scheduleTokenRefresh: () => void;
  clearRefreshTimer: () => void;
}

export interface AuthStore extends AuthState, AuthActions {}

const REFRESH_BUFFER_SECONDS = 60; // Refresh 1 minute before expiry
const MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds between refresh attempts

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isRefreshing: false,
        accessToken: null,
        refreshToken: null,
        sessionExpiresAt: null,
        lastRefreshAt: null,
        refreshTimer: null,

        // Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),

        setTokens: async (accessToken, refreshToken, expiresIn) => {
          // Clear existing refresh timer
          get().clearRefreshTimer();

          // Calculate session expiry
          const sessionExpiresAt = expiresIn
            ? new Date(Date.now() + expiresIn * 1000)
            : new Date(Date.now() + 15 * 60 * 1000); // Default 15 minutes

          // Store tokens
          await authStorage.setTokens(accessToken, refreshToken);

          set({
            accessToken,
            refreshToken: refreshToken || get().refreshToken,
            sessionExpiresAt,
            lastRefreshAt: new Date(),
          });

          // Schedule next refresh
          get().scheduleTokenRefresh();

          logger.debug('Tokens updated', {
            expiresAt: sessionExpiresAt.toISOString(),
            hasRefreshToken: !!refreshToken,
          });
        },

        login: async (email, password) => {
          set({ isLoading: true });

          try {
            const response = await api.auth.authControllerLoginV1Raw({
              loginDto: { email, password },
            });
            const data = await response.value();

            if (data) {
              logger.info('Login successful', { email });

              // Log successful login
              await auditLogger.log({
                action: 'login',
                resource: 'auth',
                actionType: AuditActionType.Login,
                severity: AuditSeverity.High,
                metadata: {
                  email,
                  userId: data.user?.id,
                  userRole: data.user?.roles?.[0],
                },
              });

              // Set user and tokens
              if (data.user) {
                set({ user: data.user, isAuthenticated: true });
              }

              if (data.accessToken) {
                await get().setTokens(data.accessToken, data.refreshToken, data.expiresIn);
              }

              set({ isLoading: false });
              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: 'No data received from server',
              };
            }
          } catch (error) {
            logger.error('Login error', { error });

            // Log failed login attempt
            await auditLogger.logError('login', 'auth', error as Error, {
              actionType: AuditActionType.Login,
              severity: AuditSeverity.High,
              metadata: { email },
            });

            set({ isLoading: false });

            // Try to parse error response
            let errorCode: string | undefined;
            const errorDetails: {
              lockedUntil?: string;
              remainingAttempts?: number;
            } = {};
            let errorMessage = 'Network error';

            // Handle ResponseError from generated API client
            if (error?.response) {
              try {
                let errorText: string | undefined;

                // Try to read the response body
                try {
                  // Clone the response to read it
                  const clonedResponse = error.response.clone();
                  errorText = await clonedResponse.text();
                } catch (_cloneError) {
                  // If cloning fails, try to read directly
                  try {
                    errorText = await error.response.text();
                  } catch (readError) {
                    logger.error('Failed to read error response', { readError });
                  }
                }

                if (errorText) {
                  try {
                    const errorData = JSON.parse(errorText);

                    // NestJS returns error in 'message' field with nested structure
                    if (errorData.message && typeof errorData.message === 'object') {
                      errorCode = errorData.message.code;
                      errorMessage =
                        errorData.message.message || errorData.message || 'Login failed';

                      // Extract additional details
                      if (errorData.message.lockedUntil) {
                        errorDetails.lockedUntil = errorData.message.lockedUntil;
                      }
                      if (errorData.message.remainingAttempts !== undefined) {
                        errorDetails.remainingAttempts = errorData.message.remainingAttempts;
                      }
                    } else if (errorData.code) {
                      // Direct error structure
                      errorCode = errorData.code;
                      errorMessage = errorData.message || 'Login failed';

                      if (errorData.lockedUntil) {
                        errorDetails.lockedUntil = errorData.lockedUntil;
                      }
                      if (errorData.remainingAttempts !== undefined) {
                        errorDetails.remainingAttempts = errorData.remainingAttempts;
                      }
                    } else {
                      errorMessage = errorData.message || errorData.error || 'Login failed';
                    }
                  } catch (_jsonError) {
                    // If JSON parsing fails, use the text as message
                    errorMessage = errorText || 'Login failed';
                  }
                } else {
                  // No error text available, use status-based messages
                  if (error.response.status === 401) {
                    errorMessage = 'Invalid credentials';
                  } else if (error.response.status === 429) {
                    errorMessage = 'Too many login attempts. Please try again later.';
                  } else {
                    errorMessage = `Login failed (${error.response.status})`;
                  }
                }
              } catch (parseError) {
                logger.error('Failed to parse error response', { parseError });
                // Try to get status text as fallback
                try {
                  if (error.response.status === 401) {
                    errorMessage = 'Invalid credentials';
                  } else if (error.response.status === 429) {
                    errorMessage = 'Too many login attempts. Please try again later.';
                  } else {
                    errorMessage = `Login failed (${error.response.status})`;
                  }
                } catch {
                  errorMessage = 'Login failed';
                }
              }
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }

            return {
              success: false,
              error: errorMessage,
              errorCode,
              errorDetails,
            };
          }
        },

        logout: async () => {
          const currentUser = get().user;

          try {
            // Clear refresh timer first
            get().clearRefreshTimer();

            // Call logout endpoint to revoke session
            await api.auth.authControllerLogoutV1();
            logger.info('Logout successful');

            // Log successful logout
            await auditLogger.log({
              action: 'logout',
              resource: 'auth',
              actionType: AuditActionType.Logout,
              severity: AuditSeverity.Medium,
              metadata: {
                userId: currentUser?.id,
                userEmail: currentUser?.email,
              },
            });
          } catch (error) {
            logger.error('Logout error', { error });

            // Log logout error
            await auditLogger.logError('logout', 'auth', error as Error, {
              actionType: AuditActionType.Logout,
              severity: AuditSeverity.Medium,
              metadata: {
                userId: currentUser?.id,
                userEmail: currentUser?.email,
              },
            });
          } finally {
            // Clear local state and storage
            set({
              user: null,
              isAuthenticated: false,
              accessToken: null,
              refreshToken: null,
              sessionExpiresAt: null,
              lastRefreshAt: null,
            });
            await authStorage.clearTokens();
          }
        },

        refreshAccessToken: async () => {
          const state = get();

          // Prevent concurrent refresh attempts
          if (state.isRefreshing) {
            logger.debug('Refresh already in progress');
            return false;
          }

          // Check minimum interval between refresh attempts
          if (state.lastRefreshAt) {
            const timeSinceLastRefresh = Date.now() - state.lastRefreshAt.getTime();
            if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
              logger.debug('Skipping refresh - too soon since last attempt', {
                timeSinceLastRefresh,
              });
              return false;
            }
          }

          const { refreshToken } = state;
          if (!refreshToken) {
            logger.warn('No refresh token available');
            return false;
          }

          set({ isRefreshing: true });

          try {
            const response = await api.auth.authControllerRefreshTokenV1Raw({
              refreshTokenDto: { refreshToken },
            });

            const data = await response.value();
            if (data) {
              logger.info('Token refresh successful');

              // Update tokens and user data
              if (data.accessToken) {
                await get().setTokens(data.accessToken, data.refreshToken, data.expiresIn);
              }

              if (data.user) {
                set({ user: data.user });
              }

              set({ isRefreshing: false });
              return true;
            } else {
              set({ isRefreshing: false });
              return false;
            }
          } catch (error) {
            logger.error('Token refresh error', { error });

            // If refresh fails with 401, clear auth state
            if (error?.response?.status === 401 || error?.status === 401) {
              await get().logout();
            }

            set({ isRefreshing: false });
            return false;
          }
        },

        checkAuthStatus: async () => {
          set({ isLoading: true });

          try {
            const hasTokens = await authStorage.hasValidTokens();
            if (!hasTokens) {
              set({ isLoading: false });
              return;
            }

            // Load tokens from storage
            const tokens = await authStorage.getTokens();
            if (tokens.authToken) {
              set({
                accessToken: tokens.authToken,
                refreshToken: tokens.refreshToken || null,
              });
            }

            // Try to get current user
            try {
              const response = await api.auth.authControllerGetCurrentUserV1Raw();
              const userData = await response.value();
              if (userData) {
                set({
                  user: userData,
                  isAuthenticated: true,
                });
                logger.debug('User data loaded successfully');

                // Schedule token refresh
                get().scheduleTokenRefresh();
              } else {
                logger.warn('Failed to fetch user data');
                await get().logout();
              }
            } catch (error) {
              logger.error('Error fetching user data:', error);
              // Try to refresh token
              const refreshed = await get().refreshAccessToken();
              if (!refreshed) {
                await get().logout();
              }
            }
          } catch (error) {
            logger.error('Error checking auth status:', error);
          } finally {
            set({ isLoading: false });
          }
        },

        hasRole: (role) => {
          const { user } = get();
          return user?.roles?.includes(role) || false;
        },

        hasPermission: (permission) => {
          const { user } = get();
          return user?.permissions?.includes(permission) || false;
        },

        isAdmin: () => {
          const { user } = get();
          return (
            user?.roles?.some((role) => ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)) || false
          );
        },

        scheduleTokenRefresh: () => {
          const state = get();

          // Clear any existing timer
          get().clearRefreshTimer();

          if (!state.sessionExpiresAt || !state.refreshToken) {
            logger.debug('Cannot schedule refresh - missing expiry or refresh token');
            return;
          }

          const now = Date.now();
          const expiresAt = state.sessionExpiresAt.getTime();
          const refreshAt = expiresAt - REFRESH_BUFFER_SECONDS * 1000;
          const delay = Math.max(refreshAt - now, 0);

          if (delay > 0) {
            logger.debug('Scheduling token refresh', {
              expiresAt: state.sessionExpiresAt.toISOString(),
              refreshIn: Math.round(delay / 1000) + 's',
            });

            const timer = setTimeout(async () => {
              logger.debug('Executing scheduled token refresh');
              await get().refreshAccessToken();
            }, delay);

            set({ refreshTimer: timer });
          } else {
            // Token already expired or about to expire, refresh immediately
            logger.debug('Token expired or about to expire, refreshing immediately');
            get().refreshAccessToken();
          }
        },

        clearRefreshTimer: () => {
          const { refreshTimer } = get();
          if (refreshTimer) {
            clearTimeout(refreshTimer);
            set({ refreshTimer: null });
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          // Only persist non-sensitive data
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    {
      name: 'AuthStore',
    },
  ),
);
