import { UserRole } from './jwt.types';

export interface AuthUser {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  organizationId?: string;
  isActive: boolean;
  isMfaEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface MfaChallenge {
  challengeId: string;
  userId: string;
  type: 'totp' | 'sms' | 'email';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresMfa?: boolean;
  mfaChallengeId?: string;
}

export interface MfaVerifyRequest {
  challengeId: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}