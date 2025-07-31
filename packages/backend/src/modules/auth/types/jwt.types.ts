/**
 * JWT-Payload-Struktur mit Benutzerauthentifizierungsdaten
 *
 * Wird für Access-Tokens mit Benutzeridentität und Berechtigungen verwendet.
 * Enthält alle notwendigen Informationen zur Autorisierung von API-Anfragen.
 *
 * @interface JWTPayload
 */
export interface JWTPayload {
  /**
   * Subject - Benutzer-ID
   * @example "user_abc123def456"
   */
  sub: string;

  /**
   * E-Mail-Adresse des Benutzers
   * @example "admin@bluelight-hub.com"
   */
  email: string;

  /**
   * Array der Benutzerrollen
   * @example ["ADMIN", "USER"]
   */
  roles: UserRole[];

  /**
   * Array der spezifischen Berechtigungen
   * @example ["USERS_READ", "USERS_WRITE"]
   */
  permissions: Permission[];

  /**
   * Organisations-ID (falls zutreffend)
   * @example "org_xyz789"
   */
  orgId?: string;

  /**
   * Session-ID für Session-Management
   * @example "sess_1234567890"
   */
  sessionId: string;

  /**
   * Ausstellungszeitpunkt (Unix-Timestamp)
   * @example 1642339200
   */
  iat: number;

  /**
   * Ablaufzeitpunkt (Unix-Timestamp)
   * @example 1642342800
   */
  exp: number;

  /**
   * JWT-ID für Token-Widerruf
   * @example "jti_unique123"
   */
  jti?: string;
}

/**
 * JWT-Refresh-Token-Payload für Token-Erneuerung
 *
 * Enthält minimale Daten für sichere Token-Aktualisierung.
 * Refresh-Tokens haben eine längere Lebensdauer und werden nur
 * für die Erneuerung von Access-Tokens verwendet.
 *
 * @interface JWTRefreshPayload
 */
export interface JWTRefreshPayload {
  /**
   * Subject - Benutzer-ID
   * @example "user_abc123def456"
   */
  sub: string;

  /**
   * Session-ID zur Validierung
   * @example "sess_1234567890"
   */
  sessionId: string;

  /**
   * Ausstellungszeitpunkt (Unix-Timestamp)
   * @example 1642339200
   */
  iat: number;

  /**
   * Ablaufzeitpunkt (Unix-Timestamp)
   * Optional für Refresh-Tokens ohne Ablauf
   * @example 1673875200
   */
  exp?: number;

  /**
   * JWT-ID für Token-Tracking und Widerruf
   * @example "jti_refresh_unique456"
   */
  jti: string;
}

/**
 * Benutzerrollen für rollenbasierte Zugriffskontrolle
 *
 * Definiert die Hierarchie administrativer Berechtigungen
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SUPPORT = 'SUPPORT',
  USER = 'USER',
}

/**
 * Granulare Berechtigungen für feingliedrige Zugriffskontrolle
 *
 * Wird verwendet, um den Zugriff auf spezifische Aktionen und Ressourcen zu steuern
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
  AUDIT_LOG_WRITE = 'AUDIT_LOG_WRITE',
  AUDIT_LOG_DELETE = 'AUDIT_LOG_DELETE',
  AUDIT_LOG_EXPORT = 'AUDIT_LOG_EXPORT',

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
 * Rollen-zu-Berechtigungen-Zuordnung
 *
 * Definiert, welche Berechtigungen jede Rolle hat.
 * Wird verwendet, um Berechtigungen automatisch basierend auf Benutzerrollen zuzuweisen.
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
    Permission.AUDIT_LOG_WRITE,
    Permission.AUDIT_LOG_EXPORT,
    Permission.ETB_READ,
    Permission.ETB_WRITE,
    Permission.EINSATZ_READ,
    Permission.EINSATZ_WRITE,
  ],
  [UserRole.MANAGER]: [
    Permission.USERS_READ,
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
