import {
  AuditActionType,
  AuditSeverity as PrismaAuditSeverity,
} from '@prisma/generated/prisma/client';

/**
 * Re-export AuditActionType as AuditAction for consistency
 */
export const AuditAction = {
  VIEW: AuditActionType.READ,
  CREATE: AuditActionType.CREATE,
  UPDATE: AuditActionType.UPDATE,
  DELETE: AuditActionType.DELETE,
  LOGIN: AuditActionType.LOGIN,
  LOGOUT: AuditActionType.LOGOUT,
  FAILED_LOGIN: 'FAILED_LOGIN' as const,
  EXPORT: AuditActionType.EXPORT,
  IMPORT: AuditActionType.IMPORT,
  APPROVE: 'APPROVE' as const,
  REJECT: 'REJECT' as const,
  BLOCK: 'BLOCK' as const,
  UNBLOCK: 'UNBLOCK' as const,
  GRANT_PERMISSION: AuditActionType.PERMISSION_CHANGE,
  REVOKE_PERMISSION: AuditActionType.PERMISSION_CHANGE,
  CHANGE_ROLE: AuditActionType.ROLE_CHANGE,
  RESTORE: 'RESTORE' as const,
  BACKUP: 'BACKUP' as const,
  CONFIG_CHANGE: AuditActionType.SYSTEM_CONFIG,
  BULK_OPERATION: AuditActionType.BULK_OPERATION,
  OTHER: 'OTHER' as const,
};

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/**
 * Re-export AuditSeverity from Prisma
 */
export const AuditSeverity = PrismaAuditSeverity;
export type AuditSeverity = PrismaAuditSeverity;

/**
 * Additional severity level for errors
 */
export const AuditSeverityExtended = {
  ...PrismaAuditSeverity,
  ERROR: 'ERROR' as const,
};

export type AuditSeverityExtended =
  (typeof AuditSeverityExtended)[keyof typeof AuditSeverityExtended];
