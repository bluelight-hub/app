/**
 * JWT payload structure containing user authentication data.
 * Used for access tokens with user identity and permissions.
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: UserRole[];
  permissions: Permission[];
  orgId?: string; // Organization ID if applicable
  sessionId: string; // For session management
  iat: number; // Issued at
  exp: number; // Expiration
  jti?: string; // JWT ID for revocation
}

/**
 * JWT refresh token payload for token renewal.
 * Contains minimal data needed for secure token refresh.
 */
export interface JWTRefreshPayload {
  sub: string;
  sessionId: string;
  iat: number;
  exp?: number;
  jti: string;
}

/**
 * User roles for role-based access control.
 * Defines hierarchy of administrative privileges.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  USER = 'USER',
}

/**
 * Granular permissions for fine-grained access control.
 * Used to control access to specific actions and resources.
 */
export enum Permission {
  // User Management
  USERS_READ = 'USERS_READ',
  USERS_WRITE = 'USERS_WRITE',
  USERS_DELETE = 'USERS_DELETE',

  // System Settings
  SYSTEM_SETTINGS_READ = 'SYSTEM_SETTINGS_READ',
  SYSTEM_SETTINGS_WRITE = 'SYSTEM_SETTINGS_WRITE',

  // Audit Logs
  AUDIT_LOG_READ = 'AUDIT_LOG_READ',

  // Role Management
  ROLE_MANAGE = 'ROLE_MANAGE',

  // Application Permissions
  ETB_READ = 'ETB_READ',
  ETB_WRITE = 'ETB_WRITE',
  ETB_DELETE = 'ETB_DELETE',
  EINSATZ_READ = 'EINSATZ_READ',
  EINSATZ_WRITE = 'EINSATZ_WRITE',
  EINSATZ_DELETE = 'EINSATZ_DELETE',
}

/**
 * Role to permission mapping defining what permissions each role has.
 * Used to automatically assign permissions based on user roles.
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission), // All permissions
  [UserRole.ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    Permission.SYSTEM_SETTINGS_READ,
    Permission.SYSTEM_SETTINGS_WRITE,
    Permission.AUDIT_LOG_READ,
    Permission.ETB_READ,
    Permission.ETB_WRITE,
    Permission.EINSATZ_READ,
    Permission.EINSATZ_WRITE,
  ],
  [UserRole.SUPPORT]: [
    Permission.USERS_READ,
    Permission.AUDIT_LOG_READ,
    Permission.ETB_READ,
    Permission.EINSATZ_READ,
  ],
  [UserRole.USER]: [Permission.ETB_READ, Permission.EINSATZ_READ],
};
