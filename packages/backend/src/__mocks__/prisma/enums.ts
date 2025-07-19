/**
 * Mock für Prisma-generierte Enums für Tests
 * Diese Datei reduziert die Abhängigkeit von Prisma-generierten Dateien in Tests
 */

export const EtbKategorie = {
  LAGEMELDUNG: 'LAGEMELDUNG',
  MELDUNG: 'MELDUNG',
  ANFORDERUNG: 'ANFORDERUNG',
  KORREKTUR: 'KORREKTUR',
  AUTO_KRAEFTE: 'AUTO_KRAEFTE',
  AUTO_PATIENTEN: 'AUTO_PATIENTEN',
  AUTO_TECHNISCH: 'AUTO_TECHNISCH',
  AUTO_SONSTIGES: 'AUTO_SONSTIGES',
} as const;

export type EtbKategorie = (typeof EtbKategorie)[keyof typeof EtbKategorie];

export const EtbEntryStatus = {
  AKTIV: 'AKTIV',
  UEBERSCHRIEBEN: 'UEBERSCHRIEBEN',
} as const;

export type EtbEntryStatus = (typeof EtbEntryStatus)[keyof typeof EtbEntryStatus];

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  USER: 'USER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Permission = {
  USERS_READ: 'USERS_READ',
  USERS_WRITE: 'USERS_WRITE',
  USERS_DELETE: 'USERS_DELETE',
  SYSTEM_SETTINGS_READ: 'SYSTEM_SETTINGS_READ',
  SYSTEM_SETTINGS_WRITE: 'SYSTEM_SETTINGS_WRITE',
  AUDIT_LOG_READ: 'AUDIT_LOG_READ',
  ROLE_MANAGE: 'ROLE_MANAGE',
  ETB_READ: 'ETB_READ',
  ETB_WRITE: 'ETB_WRITE',
  ETB_DELETE: 'ETB_DELETE',
  EINSATZ_READ: 'EINSATZ_READ',
  EINSATZ_WRITE: 'EINSATZ_WRITE',
  EINSATZ_DELETE: 'EINSATZ_DELETE',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const AuditActionType = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  BULK_OPERATION: 'BULK_OPERATION',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
} as const;

export type AuditActionType = (typeof AuditActionType)[keyof typeof AuditActionType];

export const AuditSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type AuditSeverity = (typeof AuditSeverity)[keyof typeof AuditSeverity];

export const ThreatSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type ThreatSeverity = (typeof ThreatSeverity)[keyof typeof ThreatSeverity];

export const RuleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TESTING: 'TESTING',
} as const;

export type RuleStatus = (typeof RuleStatus)[keyof typeof RuleStatus];

export const ConditionType = {
  THRESHOLD: 'THRESHOLD',
  PATTERN: 'PATTERN',
  ANOMALY: 'ANOMALY',
  TIME_BASED: 'TIME_BASED',
  GEO_BASED: 'GEO_BASED',
} as const;

export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];
