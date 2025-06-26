import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditSeverityExtended as AuditSeverity } from '../types/audit.types';

/**
 * Metadaten-Schlüssel für Audit-Decorators
 */
export const AUDIT_ACTION_KEY = 'auditAction';
export const AUDIT_SEVERITY_KEY = 'auditSeverity';
export const AUDIT_RESOURCE_TYPE_KEY = 'auditResourceType';
export const AUDIT_CONTEXT_KEY = 'auditContext';
export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * Interface für Audit-Decorator-Optionen
 */
export interface AuditOptions {
  /**
   * Die Aktion, die protokolliert werden soll
   */
  action?: AuditAction;

  /**
   * Die Schwere der Aktion
   */
  severity?: AuditSeverity;

  /**
   * Der Typ der betroffenen Ressource
   */
  resourceType?: string;

  /**
   * Zusätzlicher Kontext für den Audit-Log
   */
  context?: Record<string, any>;

  /**
   * Beschreibung der Aktion
   */
  description?: string;
}

/**
 * Decorator zur Konfiguration von Audit-Logging für einen Controller oder eine Methode
 *
 * @example
 * ```typescript
 * @Audit({
 *   action: AuditAction.UPDATE,
 *   severity: AuditSeverity.HIGH,
 *   resourceType: 'user'
 * })
 * async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
 *   // ...
 * }
 * ```
 */
export const Audit = (options: AuditOptions = {}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (options.action) {
      SetMetadata(AUDIT_ACTION_KEY, options.action)(target, propertyKey, descriptor);
    }
    if (options.severity) {
      SetMetadata(AUDIT_SEVERITY_KEY, options.severity)(target, propertyKey, descriptor);
    }
    if (options.resourceType) {
      SetMetadata(AUDIT_RESOURCE_TYPE_KEY, options.resourceType)(target, propertyKey, descriptor);
    }
    if (options.context || options.description) {
      const context = {
        ...options.context,
        ...(options.description && { description: options.description }),
      };
      SetMetadata(AUDIT_CONTEXT_KEY, context)(target, propertyKey, descriptor);
    }
  };
};

/**
 * Decorator zum Überspringen des Audit-Loggings für eine Methode
 *
 * @example
 * ```typescript
 * @NoAudit()
 * async getPublicData() {
 *   // Diese Methode wird nicht auditiert
 * }
 * ```
 */
export const NoAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

/**
 * Vordefinierte Audit-Decorators für häufige Aktionen
 */

/**
 * Markiert eine Methode als Login-Aktion
 */
export const AuditLogin = (context?: Record<string, any>) =>
  Audit({
    action: AuditAction.LOGIN,
    severity: AuditSeverity.LOW,
    context,
  });

/**
 * Markiert eine Methode als Logout-Aktion
 */
export const AuditLogout = (context?: Record<string, any>) =>
  Audit({
    action: AuditAction.LOGOUT,
    severity: AuditSeverity.LOW,
    context,
  });

/**
 * Markiert eine Methode als Create-Aktion
 */
export const AuditCreate = (resourceType: string, context?: Record<string, any>) =>
  Audit({
    action: AuditAction.CREATE,
    severity: AuditSeverity.MEDIUM,
    resourceType,
    context,
  });

/**
 * Markiert eine Methode als Update-Aktion
 */
export const AuditUpdate = (resourceType: string, context?: Record<string, any>) =>
  Audit({
    action: AuditAction.UPDATE,
    severity: AuditSeverity.MEDIUM,
    resourceType,
    context,
  });

/**
 * Markiert eine Methode als Delete-Aktion
 */
export const AuditDelete = (resourceType: string, context?: Record<string, any>) =>
  Audit({
    action: AuditAction.DELETE,
    severity: AuditSeverity.HIGH,
    resourceType,
    context,
  });

/**
 * Markiert eine Methode als View-Aktion
 */
export const AuditView = (resourceType: string, context?: Record<string, any>) =>
  Audit({
    action: AuditAction.VIEW,
    severity: AuditSeverity.LOW,
    resourceType,
    context,
  });

/**
 * Markiert eine Methode als Export-Aktion
 */
export const AuditExport = (resourceType: string, context?: Record<string, any>) =>
  Audit({
    action: AuditAction.EXPORT,
    severity: AuditSeverity.MEDIUM,
    resourceType,
    context,
  });

/**
 * Markiert eine Methode als Import-Aktion
 */
export const AuditImport = (resourceType: string, context?: Record<string, any>) =>
  Audit({
    action: AuditAction.IMPORT,
    severity: AuditSeverity.HIGH,
    resourceType,
    context,
  });

/**
 * Markiert eine Methode als kritische Aktion
 */
export const AuditCritical = (action: AuditAction, resourceType: string, description: string) =>
  Audit({
    action,
    severity: AuditSeverity.HIGH,
    resourceType,
    description,
  });
