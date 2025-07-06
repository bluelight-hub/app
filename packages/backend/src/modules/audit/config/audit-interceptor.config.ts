import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

/**
 * Konfiguration für den Audit-Interceptor
 */
export interface AuditInterceptorConfig {
  /**
   * Pfade, die von der Auditierung ausgeschlossen werden sollen
   */
  excludePaths: string[];

  /**
   * Pfade, die immer auditiert werden sollen
   */
  includePaths: string[];

  /**
   * Felder, die aus den Logs entfernt werden sollen
   */
  sensitiveFields: string[];

  /**
   * Mapping von Pfaden zu Ressourcentypen
   */
  resourceMapping: Record<string, string>;

  /**
   * Mapping von Pfaden zu Aktionen
   */
  actionMapping: Record<string, AuditActionType>;

  /**
   * Mapping von Aktionen zu Schweregraden
   */
  severityMapping: Record<AuditActionType, AuditSeverity>;

  /**
   * Maximale Größe für Request/Response Bodies in Bytes
   */
  maxBodySize: number;

  /**
   * Ob Stack Traces in Entwicklungsumgebung geloggt werden sollen
   */
  logStackTraces: boolean;
}

/**
 * Standard-Konfiguration für den Audit-Interceptor
 */
export const defaultAuditInterceptorConfig: AuditInterceptorConfig = {
  excludePaths: [
    '/health',
    '/metrics',
    '/api-docs',
    '/swagger',
    '/favicon.ico',
    '/public',
    '/robots.txt',
    '/_next',
    '/static',
  ],

  includePaths: ['/', '/api', '/admin', '/api/admin'],

  sensitiveFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'creditCard',
    'credit_card',
    'ssn',
    'social_security_number',
    'bank_account',
    'pin',
    'cvv',
    'private_key',
    'privateKey',
    'refresh_token',
    'refreshToken',
    'access_token',
    'accessToken',
  ],

  resourceMapping: {
    '/admin/users': 'user',
    '/admin/groups': 'group',
    '/admin/roles': 'role',
    '/admin/permissions': 'permission',
    '/admin/audit-logs': 'audit_log',
    '/admin/settings': 'settings',
    '/admin/templates': 'template',
    '/admin/organizations': 'organization',
    '/admin/sessions': 'session',
    '/admin/backups': 'backup',
    '/admin/reports': 'report',
    '/admin/system': 'system',
    '/admin/database': 'database',
    '/admin/monitoring': 'monitoring',
  },

  actionMapping: {
    'POST /admin/users/login': AuditActionType.LOGIN,
    'POST /admin/users/logout': AuditActionType.LOGOUT,
    'POST /admin/users/*/block': AuditActionType.BLOCK,
    'POST /admin/users/*/unblock': AuditActionType.UNBLOCK,
    'POST /admin/*/approve': AuditActionType.APPROVE,
    'POST /admin/*/reject': AuditActionType.REJECT,
    'POST /admin/*/export': AuditActionType.EXPORT,
    'POST /admin/*/import': AuditActionType.IMPORT,
    'POST /admin/backups/restore': AuditActionType.RESTORE,
  },

  severityMapping: {
    [AuditActionType.READ]: AuditSeverity.LOW,
    [AuditActionType.CREATE]: AuditSeverity.MEDIUM,
    [AuditActionType.UPDATE]: AuditSeverity.MEDIUM,
    [AuditActionType.DELETE]: AuditSeverity.HIGH,
    [AuditActionType.LOGIN]: AuditSeverity.LOW,
    [AuditActionType.LOGOUT]: AuditSeverity.LOW,
    [AuditActionType.FAILED_LOGIN]: AuditSeverity.MEDIUM,
    [AuditActionType.EXPORT]: AuditSeverity.MEDIUM,
    [AuditActionType.IMPORT]: AuditSeverity.HIGH,
    [AuditActionType.APPROVE]: AuditSeverity.MEDIUM,
    [AuditActionType.REJECT]: AuditSeverity.MEDIUM,
    [AuditActionType.BLOCK]: AuditSeverity.MEDIUM,
    [AuditActionType.UNBLOCK]: AuditSeverity.MEDIUM,
    [AuditActionType.PERMISSION_CHANGE]: AuditSeverity.HIGH,
    [AuditActionType.ROLE_CHANGE]: AuditSeverity.HIGH,
    [AuditActionType.RESTORE]: AuditSeverity.MEDIUM,
    [AuditActionType.BACKUP]: AuditSeverity.MEDIUM,
    [AuditActionType.SYSTEM_CONFIG]: AuditSeverity.HIGH,
    [AuditActionType.BULK_OPERATION]: AuditSeverity.MEDIUM,
  } as Record<AuditActionType, AuditSeverity>,

  maxBodySize: 10 * 1024, // 10KB

  logStackTraces: process.env.NODE_ENV === 'development',
};

/**
 * Factory-Funktion zum Erstellen einer benutzerdefinierten Konfiguration
 */
export function createAuditInterceptorConfig(
  customConfig?: Partial<AuditInterceptorConfig>,
): AuditInterceptorConfig {
  return {
    ...defaultAuditInterceptorConfig,
    ...customConfig,
    // Merge arrays instead of replacing
    excludePaths: [
      ...defaultAuditInterceptorConfig.excludePaths,
      ...(customConfig?.excludePaths || []),
    ],
    includePaths: [
      ...defaultAuditInterceptorConfig.includePaths,
      ...(customConfig?.includePaths || []),
    ],
    sensitiveFields: [
      ...defaultAuditInterceptorConfig.sensitiveFields,
      ...(customConfig?.sensitiveFields || []),
    ],
    // Merge objects
    resourceMapping: {
      ...defaultAuditInterceptorConfig.resourceMapping,
      ...(customConfig?.resourceMapping || {}),
    },
    actionMapping: {
      ...defaultAuditInterceptorConfig.actionMapping,
      ...(customConfig?.actionMapping || {}),
    },
    severityMapping: {
      ...defaultAuditInterceptorConfig.severityMapping,
      ...(customConfig?.severityMapping || {}),
    },
  };
}
