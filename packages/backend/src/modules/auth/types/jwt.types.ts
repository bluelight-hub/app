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

export interface JWTRefreshPayload {
  sub: string;
  sessionId: string;
  iat: number;
  exp: number;
  jti: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
}

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

// Role to Permission Mapping
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