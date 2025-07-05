import { AuditAction, AuditSeverityExtended as AuditSeverity } from '../types/audit.types';

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
  actionMapping: Record<string, AuditAction>;

  /**
   * Mapping von Aktionen zu Schweregraden
   */
  severityMapping: Record<AuditAction, AuditSeverity>;

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
    'POST /admin/users/login': AuditAction.LOGIN,
    'POST /admin/users/logout': AuditAction.LOGOUT,
    'POST /admin/users/*/block': AuditAction.BLOCK,
    'POST /admin/users/*/unblock': AuditAction.UNBLOCK,
    'POST /admin/*/approve': AuditAction.APPROVE,
    'POST /admin/*/reject': AuditAction.REJECT,
    'POST /admin/*/export': AuditAction.EXPORT,
    'POST /admin/*/import': AuditAction.IMPORT,
    'POST /admin/backups/restore': AuditAction.RESTORE,
  },

  severityMapping: Object.assign(
    {},
    {
      [AuditAction.VIEW]: AuditSeverity.LOW,
      [AuditAction.CREATE]: AuditSeverity.MEDIUM,
      [AuditAction.UPDATE]: AuditSeverity.MEDIUM,
      [AuditAction.DELETE]: AuditSeverity.HIGH,
      [AuditAction.LOGIN]: AuditSeverity.LOW,
      [AuditAction.LOGOUT]: AuditSeverity.LOW,
      [AuditAction.FAILED_LOGIN]: AuditSeverity.HIGH,
      [AuditAction.EXPORT]: AuditSeverity.MEDIUM,
      [AuditAction.IMPORT]: AuditSeverity.HIGH,
      [AuditAction.APPROVE]: AuditSeverity.HIGH,
      [AuditAction.REJECT]: AuditSeverity.HIGH,
      [AuditAction.BLOCK]: AuditSeverity.HIGH,
      [AuditAction.UNBLOCK]: AuditSeverity.MEDIUM,
      [AuditAction.GRANT_PERMISSION]: AuditSeverity.HIGH,
      [AuditAction.CHANGE_ROLE]: AuditSeverity.HIGH,
      [AuditAction.RESTORE]: AuditSeverity.HIGH,
      [AuditAction.BACKUP]: AuditSeverity.MEDIUM,
      [AuditAction.CONFIG_CHANGE]: AuditSeverity.HIGH,
      [AuditAction.BULK_OPERATION]: AuditSeverity.MEDIUM,
      [AuditAction.OTHER]: AuditSeverity.LOW,
    },
    // Add REVOKE_PERMISSION with the same severity as GRANT_PERMISSION
    { [AuditAction.REVOKE_PERMISSION]: AuditSeverity.HIGH },
  ) as Record<AuditAction, AuditSeverity>,

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
