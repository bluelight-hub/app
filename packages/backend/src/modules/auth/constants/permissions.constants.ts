import { Permission, UserRole } from '../types/jwt.types';

/**
 * Gruppierung von Berechtigungen nach funktionalen Bereichen.
 * Erleichtert die Verwaltung und Zuweisung von Berechtigungen.
 */
export const PermissionGroups = {
  /**
   * Berechtigungen für die Benutzerverwaltung
   */
  USER_MANAGEMENT: {
    READ: Permission.USERS_READ,
    WRITE: Permission.USERS_WRITE,
    DELETE: Permission.USERS_DELETE,
  },

  /**
   * Berechtigungen für Systemeinstellungen
   */
  SYSTEM: {
    SETTINGS_READ: Permission.SYSTEM_SETTINGS_READ,
    SETTINGS_WRITE: Permission.SYSTEM_SETTINGS_WRITE,
    ROLE_MANAGE: Permission.ROLE_MANAGE,
  },

  /**
   * Berechtigungen für Audit-Logs
   */
  AUDIT: {
    READ: Permission.AUDIT_LOG_READ,
    WRITE: Permission.AUDIT_LOG_WRITE,
    DELETE: Permission.AUDIT_LOG_DELETE,
    EXPORT: Permission.AUDIT_LOG_EXPORT,
  },

  /**
   * Berechtigungen für Einsatztagebuch (ETB)
   */
  ETB: {
    READ: Permission.ETB_READ,
    WRITE: Permission.ETB_WRITE,
    DELETE: Permission.ETB_DELETE,
  },

  /**
   * Berechtigungen für Einsatzverwaltung
   */
  EINSATZ: {
    READ: Permission.EINSATZ_READ,
    WRITE: Permission.EINSATZ_WRITE,
    DELETE: Permission.EINSATZ_DELETE,
  },
} as const;

/**
 * Detaillierte Beschreibungen für jede Berechtigung.
 * Wird für Dokumentation und UI-Tooltips verwendet.
 */
export const PermissionDescriptions: Record<Permission, string> = {
  // Benutzerverwaltung
  [Permission.USERS_READ]: 'Berechtigung zum Anzeigen von Benutzerdaten und -listen',
  [Permission.USERS_WRITE]: 'Berechtigung zum Erstellen und Bearbeiten von Benutzern',
  [Permission.USERS_DELETE]: 'Berechtigung zum Löschen von Benutzern',

  // Systemeinstellungen
  [Permission.SYSTEM_SETTINGS_READ]: 'Berechtigung zum Anzeigen von Systemeinstellungen',
  [Permission.SYSTEM_SETTINGS_WRITE]: 'Berechtigung zum Ändern von Systemeinstellungen',
  [Permission.ROLE_MANAGE]: 'Berechtigung zum Verwalten von Rollen und Berechtigungen',

  // Audit-Logs
  [Permission.AUDIT_LOG_READ]: 'Berechtigung zum Einsehen von Audit-Logs und Systemprotokollen',
  [Permission.AUDIT_LOG_WRITE]: 'Berechtigung zum Erstellen von manuellen Audit-Log-Einträgen',
  [Permission.AUDIT_LOG_DELETE]: 'Berechtigung zum Löschen von Audit-Log-Einträgen',
  [Permission.AUDIT_LOG_EXPORT]: 'Berechtigung zum Exportieren von Audit-Logs',

  // ETB (Einsatztagebuch)
  [Permission.ETB_READ]: 'Berechtigung zum Anzeigen von Einsatztagebuch-Einträgen',
  [Permission.ETB_WRITE]: 'Berechtigung zum Erstellen und Bearbeiten von ETB-Einträgen',
  [Permission.ETB_DELETE]: 'Berechtigung zum Löschen von ETB-Einträgen',

  // Einsatzverwaltung
  [Permission.EINSATZ_READ]: 'Berechtigung zum Anzeigen von Einsätzen',
  [Permission.EINSATZ_WRITE]: 'Berechtigung zum Erstellen und Bearbeiten von Einsätzen',
  [Permission.EINSATZ_DELETE]: 'Berechtigung zum Löschen von Einsätzen',
};

/**
 * Definierte Rollen-zu-Berechtigungen-Matrix.
 * Diese Matrix definiert, welche Berechtigungen jede Rolle standardmäßig hat.
 *
 * @remarks
 * - SUPER_ADMIN: Vollzugriff auf alle Systemfunktionen
 * - ADMIN: Verwaltungszugriff ohne Rollenverwaltung
 * - SUPPORT: Lesezugriff auf die meisten Ressourcen
 * - USER: Basiszugriff auf ETB und Einsätze (nur lesen)
 */
export const DefaultRolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission), // Alle Berechtigungen

  [UserRole.ADMIN]: [
    // Benutzerverwaltung
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    // Systemeinstellungen (ohne Rollenverwaltung)
    Permission.SYSTEM_SETTINGS_READ,
    Permission.SYSTEM_SETTINGS_WRITE,
    // Audit-Logs
    Permission.AUDIT_LOG_READ,
    Permission.AUDIT_LOG_WRITE,
    Permission.AUDIT_LOG_EXPORT,
    // Anwendungsberechtigungen
    Permission.ETB_READ,
    Permission.ETB_WRITE,
    Permission.EINSATZ_READ,
    Permission.EINSATZ_WRITE,
  ],

  [UserRole.MANAGER]: [
    // Benutzerverwaltung (nur lesen)
    Permission.USERS_READ,
    // Audit-Logs (nur lesen)
    Permission.AUDIT_LOG_READ,
    // Anwendungsberechtigungen
    Permission.ETB_READ,
    Permission.ETB_WRITE,
    Permission.EINSATZ_READ,
    Permission.EINSATZ_WRITE,
  ],

  [UserRole.SUPPORT]: [
    // Nur Lesezugriff
    Permission.USERS_READ,
    Permission.AUDIT_LOG_READ,
    Permission.ETB_READ,
    Permission.EINSATZ_READ,
  ],

  [UserRole.USER]: [
    // Basiszugriff
    Permission.ETB_READ,
    Permission.EINSATZ_READ,
  ],
};

/**
 * Kritische Berechtigungen, die besondere Vorsicht erfordern.
 * Diese Berechtigungen sollten nur an vertrauenswürdige Benutzer vergeben werden.
 */
export const CriticalPermissions: Permission[] = [
  Permission.USERS_DELETE,
  Permission.ROLE_MANAGE,
  Permission.SYSTEM_SETTINGS_WRITE,
  Permission.AUDIT_LOG_DELETE,
];

/**
 * Überprüft, ob eine Berechtigung als kritisch eingestuft ist.
 */
export function isCriticalPermission(permission: Permission): boolean {
  return CriticalPermissions.includes(permission);
}

/**
 * Gibt alle Berechtigungen für eine bestimmte Ressource zurück.
 */
export function getPermissionsForResource(
  resource: 'users' | 'system' | 'audit' | 'etb' | 'einsatz',
): Permission[] {
  switch (resource) {
    case 'users':
      return Object.values(PermissionGroups.USER_MANAGEMENT);
    case 'system':
      return Object.values(PermissionGroups.SYSTEM);
    case 'audit':
      return Object.values(PermissionGroups.AUDIT);
    case 'etb':
      return Object.values(PermissionGroups.ETB);
    case 'einsatz':
      return Object.values(PermissionGroups.EINSATZ);
    default:
      return [];
  }
}
