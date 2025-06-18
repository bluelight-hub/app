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
  exp: number;
  jti: string;
}

/**
 * User roles for role-based access control.
 * Defines hierarchy of administrative privileges.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
}

/**
 * Granular permissions for fine-grained access control.
 * Used to control access to specific actions and resources.
 */
export enum Permission {
  // User Management
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',
  
  // Organization Management
  ORGS_READ = 'orgs:read',
  ORGS_WRITE = 'orgs:write',
  ORGS_DELETE = 'orgs:delete',
  
  // Content Management
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',
  
  // Settings Management
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  
  // Analytics
  ANALYTICS_READ = 'analytics:read',
  
  // System Administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_BACKUP = 'system:backup',
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
    Permission.ORGS_READ,
    Permission.ORGS_WRITE,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_PUBLISH,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.MODERATOR]: [
    Permission.USERS_READ,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.CONTENT_PUBLISH,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.USER]: [
    Permission.CONTENT_READ,
  ],
};