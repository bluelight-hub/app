import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { AuditContextUtil, UserContext } from './audit-context.util';
import { CreateAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { logger } from '../../../logger/consola.logger';

/**
 * Interface für vereinfachte Audit-Log-Erstellung
 */
export interface AuditLogInput {
  action: string;
  resource: string;
  resourceId?: string;
  actionType: AuditActionType;
  severity?: AuditSeverity;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  affectedFields?: string[];
  metadata?: Record<string, any>;
  duration?: number;
  success?: boolean;
  errorMessage?: string;
  statusCode?: number;
  sensitiveData?: boolean;
  requiresReview?: boolean;
  compliance?: string[];
  retentionPeriod?: number;
}

/**
 * Utility-Service für vereinfachte Audit-Log-Erstellung
 * Integriert mit dem bestehenden Consola-Logger und AuditLogService
 */
@Injectable()
export class AuditLoggerUtil {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Erstellt einen Audit-Log-Eintrag mit automatischer Kontext-Extraktion
   * @param req Express Request-Objekt
   * @param input Audit-Log-Daten
   * @returns Promise für den erstellten Audit-Log-Eintrag
   */
  async logAction(req: Request, input: AuditLogInput) {
    try {
      const requestContext = AuditContextUtil.extractRequestContext(req);
      const userContext = AuditContextUtil.extractUserContext(req);

      // Automatische Compliance-Tag-Erkennung
      const autoComplianceTags = AuditContextUtil.determineComplianceTags(
        { ...input.oldValues, ...input.newValues },
        input.resource,
      );
      const compliance = [...new Set([...(input.compliance || []), ...autoComplianceTags])];

      // Sensible Daten sanitisieren
      const sanitizedOldValues = input.oldValues
        ? AuditContextUtil.sanitizeSensitiveData(input.oldValues)
        : undefined;
      const sanitizedNewValues = input.newValues
        ? AuditContextUtil.sanitizeSensitiveData(input.newValues)
        : undefined;

      const auditLogDto: CreateAuditLogDto = {
        actionType: input.actionType,
        severity: input.severity || AuditSeverity.MEDIUM,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,

        // Benutzer-Kontext
        userId: userContext?.id,
        userEmail: userContext?.email,
        userRole: userContext?.role,

        // Request-Kontext
        ...requestContext,

        // Daten-Kontext
        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,
        affectedFields: input.affectedFields,
        metadata: input.metadata,

        // Ergebnis
        duration: input.duration,
        success: input.success ?? true,
        errorMessage: input.errorMessage,
        statusCode: input.statusCode,

        // Compliance
        compliance,
        sensitiveData: input.sensitiveData || false,
        requiresReview: input.requiresReview || false,
        retentionPeriod: input.retentionPeriod,
      };

      const auditLog = await this.auditLogService.create(auditLogDto);

      // Audit log created successfully

      return auditLog;
    } catch (error) {
      // Fehler beim Audit-Logging sollten nicht die Hauptfunktionalität beeinträchtigen
      logger.error('Failed to create audit log', {
        error: error.message,
        action: input.action,
        resource: input.resource,
      });

      // Re-throw nur in Development, um Debugging zu ermöglichen
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }

  /**
   * Erstellt einen Audit-Log für Anmeldungen
   * @param req Express Request-Objekt
   * @param userContext Benutzer-Kontext
   * @param success Ob die Anmeldung erfolgreich war
   * @param errorMessage Fehlermeldung bei gescheiterter Anmeldung
   */
  async logLogin(req: Request, userContext: UserContext, success: boolean, errorMessage?: string) {
    const requestContext = AuditContextUtil.extractRequestContext(req);

    return this.auditLogService.create({
      actionType: AuditActionType.LOGIN,
      severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
      action: 'user-login',
      resource: 'authentication',

      userId: userContext.id,
      userEmail: userContext.email,
      userRole: userContext.role,

      ...requestContext,

      success,
      errorMessage,
      statusCode: success ? 200 : 401,

      metadata: {
        loginAttempt: true,
        timestamp: new Date().toISOString(),
      },

      compliance: ['AUDIT'],
    });
  }

  /**
   * Erstellt einen Audit-Log für Abmeldungen
   * @param req Express Request-Objekt
   * @param userContext Benutzer-Kontext
   */
  async logLogout(req: Request, userContext: UserContext) {
    const requestContext = AuditContextUtil.extractRequestContext(req);

    return this.auditLogService.create({
      actionType: AuditActionType.LOGOUT,
      severity: AuditSeverity.LOW,
      action: 'user-logout',
      resource: 'authentication',

      userId: userContext.id,
      userEmail: userContext.email,
      userRole: userContext.role,

      ...requestContext,

      success: true,
      statusCode: 200,

      metadata: {
        logoutEvent: true,
        timestamp: new Date().toISOString(),
      },

      compliance: ['AUDIT'],
    });
  }

  /**
   * Erstellt einen Audit-Log für Rollenänderungen
   * @param req Express Request-Objekt
   * @param targetUserId ID des Benutzers, dessen Rolle geändert wird
   * @param oldRole Alte Rolle
   * @param newRole Neue Rolle
   * @param changedBy ID des Benutzers, der die Änderung vornimmt
   */
  async logRoleChange(
    req: Request,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
  ) {
    return this.logAction(req, {
      actionType: AuditActionType.ROLE_CHANGE,
      severity: AuditSeverity.HIGH,
      action: 'role-change',
      resource: 'user',
      resourceId: targetUserId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      affectedFields: ['role'],
      metadata: {
        roleChange: true,
        changedBy,
        timestamp: new Date().toISOString(),
      },
      requiresReview: true,
      compliance: ['AUDIT', 'GDPR'],
    });
  }

  /**
   * Erstellt einen Audit-Log für Bulk-Operationen
   * @param req Express Request-Objekt
   * @param action Bezeichnung der Bulk-Operation
   * @param resource Betroffene Ressource
   * @param recordCount Anzahl betroffener Datensätze
   * @param success Erfolg der Operation
   * @param duration Dauer der Operation
   * @param errorMessage Fehlermeldung bei Fehlschlag
   */
  async logBulkOperation(
    req: Request,
    action: string,
    resource: string,
    recordCount: number,
    success: boolean,
    duration?: number,
    errorMessage?: string,
  ) {
    return this.logAction(req, {
      actionType: AuditActionType.BULK_OPERATION,
      severity: recordCount > 100 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
      action,
      resource,
      duration,
      success,
      errorMessage,
      metadata: AuditContextUtil.createBulkOperationMetadata(recordCount),
      requiresReview: recordCount > 1000,
    });
  }

  /**
   * Erstellt einen Audit-Log für Systemkonfiguration-Änderungen
   * @param req Express Request-Objekt
   * @param configKey Konfigurationsschlüssel
   * @param oldValue Alter Wert
   * @param newValue Neuer Wert
   * @param environment Umgebung
   */
  async logSystemConfigChange(
    req: Request,
    configKey: string,
    oldValue: any,
    newValue: any,
    environment: string,
  ) {
    return this.logAction(req, {
      actionType: AuditActionType.SYSTEM_CONFIG,
      severity: environment === 'production' ? AuditSeverity.CRITICAL : AuditSeverity.HIGH,
      action: 'config-change',
      resource: 'system-config',
      resourceId: configKey,
      oldValues: { [configKey]: oldValue },
      newValues: { [configKey]: newValue },
      affectedFields: [configKey],
      metadata: AuditContextUtil.createSystemConfigMetadata(configKey, environment),
      requiresReview: environment === 'production',
      compliance: ['AUDIT'],
    });
  }
}
