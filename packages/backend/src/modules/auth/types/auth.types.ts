import { UserRole } from './jwt.types';

/**
 * Authenticated user data structure.
 * Contains user identity, roles, permissions and status information.
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  organizationId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User session data for session management.
 * Tracks active sessions with refresh tokens and metadata.
 */
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Login request data structure.
 * Contains user credentials and options.
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response data structure.
 * Contains authentication tokens and user data.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Token refresh request data.
 * Contains the refresh token for renewal.
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Token response data structure.
 * Contains new access and refresh tokens.
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
