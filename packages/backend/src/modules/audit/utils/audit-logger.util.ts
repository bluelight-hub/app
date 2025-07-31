import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueue } from '../queues/audit-log.queue';
import { AuditContextUtil, UserContext } from './audit-context.util';
import { CreateAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { logger } from '../../../logger/consola.logger';
import { ConfigService } from '@nestjs/config';

/**
 * Interface für vereinfachte Audit-Log-Erstellung
 *
 * Definiert die Struktur für Audit-Log-Eingaben mit allen notwendigen
 * und optionalen Feldern zur Protokollierung von Systemaktionen.
 * Wird verwendet, um Audit-Logs über den AuditLoggerUtil zu erstellen.
 *
 * @interface AuditLogInput
 */
export interface AuditLogInput {
  /**
   * Spezifische Bezeichnung der durchgeführten Aktion
   *
   * Beschreibt die konkrete Aktion, die protokolliert wird
   * Sollte präzise und konsistent benannt sein für bessere Suchbarkeit
   *
   * @example "create-user", "update-settings", "delete-record"
   * @type {string}
   * @required
   */
  action: string;

  /**
   * Art der betroffenen Ressource
   *
   * Kategorie oder Typ der Ressource, auf die sich die Aktion bezieht
   * Wird für Filterung und Kategorisierung von Audit-Logs verwendet
   *
   * @example "user", "organization", "settings"
   * @type {string}
   * @required
   */
  resource: string;

  /**
   * Eindeutige ID der betroffenen Ressource
   *
   * Identifiziert die spezifische Instanz der Ressource
   * Ermöglicht die Nachverfolgung von Änderungen an einzelnen Objekten
   *
   * @example "user_123", "org_456"
   * @type {string}
   */
  resourceId?: string;

  /**
   * Kategorie der Aktion gemäß Audit-Standards
   *
   * Standardisierte Klassifizierung der Aktion nach Audit-Richtlinien
   * Wichtig für Compliance-Berichte und Sicherheitsanalysen
   *
   * @type {AuditActionType}
   * @required
   */
  actionType: AuditActionType;

  /**
   * Schweregrad der Aktion für Sicherheits- und Compliance-Bewertung
   *
   * Bestimmt die Wichtigkeit und Kritikalität der protokollierten Aktion
   * Beeinflusst Alarmierungen und Priorisierung bei der Analyse
   *
   * @default AuditSeverity.MEDIUM
   * @type {AuditSeverity}
   */
  severity?: AuditSeverity;

  /**
   * Vorherige Werte vor der Änderung (für Updates/Deletes)
   *
   * Speichert den Zustand der Ressource vor der Änderung
   * Sensible Daten werden automatisch maskiert
   * Wichtig für Audit-Trails und Nachvollziehbarkeit von Änderungen
   *
   * @type {Record<string, any>}
   */
  oldValues?: Record<string, any>;

  /**
   * Neue Werte nach der Änderung (für Creates/Updates)
   *
   * Speichert den Zustand der Ressource nach der Änderung
   * Sensible Daten werden automatisch maskiert
   * Ermöglicht den Vergleich mit dem vorherigen Zustand
   *
   * @type {Record<string, any>}
   */
  newValues?: Record<string, any>;

  /**
   * Liste der geänderten Felder
   *
   * Enthält die Namen aller Attribute, die durch die Aktion geändert wurden
   * Ermöglicht eine schnelle Übersicht über den Umfang der Änderungen
   *
   * @example ["email", "role", "permissions"]
   * @type {string[]}
   */
  affectedFields?: string[];

  /**
   * Zusätzliche Kontextinformationen zur Aktion
   *
   * Beliebige zusätzliche Daten, die für das Verständnis der Aktion relevant sind
   * Kann spezifische Details enthalten, die nicht in anderen Feldern abgebildet werden
   *
   * @type {Record<string, any>}
   */
  metadata?: Record<string, any>;

  /**
   * Dauer der Operation in Millisekunden
   *
   * Misst die Ausführungszeit der protokollierten Aktion
   * Wichtig für Performance-Analysen und Optimierungen
   *
   * @example 1250
   * @type {number}
   * @minimum 0
   */
  duration?: number;

  /**
   * Gibt an, ob die Operation erfolgreich war
   *
   * Flag zur Kennzeichnung erfolgreicher oder fehlgeschlagener Operationen
   * Ermöglicht die Filterung nach Erfolgs- oder Fehlerszenarien
   *
   * @default true
   * @type {boolean}
   */
  success?: boolean;

  /**
   * Fehlermeldung bei fehlgeschlagenen Operationen
   *
   * Detaillierte Beschreibung des Fehlers, wenn die Operation fehlgeschlagen ist
   * Wird nur gesetzt, wenn success = false
   *
   * @example "Validation failed: Email already exists"
   * @type {string}
   */
  errorMessage?: string;

  /**
   * HTTP-Statuscode der Operation
   *
   * Standardisierter HTTP-Statuscode, der das Ergebnis der Operation angibt
   * Nützlich für API-bezogene Audit-Logs und Fehleranalysen
   *
   * @example 200, 400, 500
   * @type {number}
   * @minimum 100
   * @maximum 599
   */
  statusCode?: number;

  /**
   * Markiert, ob sensible Daten betroffen sind
   *
   * Flag zur Kennzeichnung von Operationen mit sensiblen oder personenbezogenen Daten
   * Wichtig für Datenschutz-Compliance und spezielle Behandlung sensibler Informationen
   *
   * @default false
   * @type {boolean}
   */
  sensitiveData?: boolean;

  /**
   * Gibt an, ob eine manuelle Überprüfung erforderlich ist
   *
   * Flag zur Kennzeichnung von Operationen, die eine zusätzliche Prüfung benötigen
   * Wird für kritische Änderungen oder potentiell riskante Operationen gesetzt
   *
   * @default false
   * @type {boolean}
   */
  requiresReview?: boolean;

  /**
   * Compliance-Tags für regulatorische Anforderungen
   *
   * Liste von Compliance-Standards, die für diese Aktion relevant sind
   * Ermöglicht die Filterung und Berichterstattung nach regulatorischen Anforderungen
   *
   * @example ["GDPR", "HIPAA", "SOX"]
   * @type {string[]}
   */
  compliance?: string[];

  /**
   * Aufbewahrungsdauer in Tagen
   *
   * Bestimmt, wie lange der Audit-Log-Eintrag aufbewahrt werden soll
   * Wichtig für Compliance-Anforderungen und Datenaufbewahrungsrichtlinien
   *
   * @example 365, 2555 (7 Jahre)
   * @type {number}
   * @minimum 1
   */
  retentionPeriod?: number;
}

/**
 * Utility-Service für vereinfachte Audit-Log-Erstellung
 * Integriert mit dem bestehenden Consola-Logger und AuditLogService
 * Unterstützt asynchrone Verarbeitung über Queue
 */
@Injectable()
export class AuditLoggerUtil {
  private readonly useQueue: boolean;

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogQueue: AuditLogQueue,
    private readonly configService: ConfigService,
  ) {
    // Queue kann über Umgebungsvariable aktiviert/deaktiviert werden
    this.useQueue = this.configService.get<boolean>('AUDIT_USE_QUEUE', true);
  }

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

      // Verwende Queue für asynchrone Verarbeitung oder direkten Service
      if (this.useQueue) {
        const jobId = await this.auditLogQueue.addAuditLog(auditLogDto);
        logger.trace('Audit log queued for async processing', { jobId });
        // Gebe ein Pseudo-Objekt zurück, da der tatsächliche Log noch nicht erstellt wurde
        return { id: jobId, ...auditLogDto } as any;
      } else {
        const auditLog = await this.auditLogService.create(auditLogDto);
        // Audit log created successfully
        return auditLog;
      }
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

    const auditLogDto: CreateAuditLogDto = {
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
    };

    if (this.useQueue) {
      const jobId = await this.auditLogQueue.addAuditLog(auditLogDto);
      return { id: jobId, ...auditLogDto } as any;
    } else {
      return this.auditLogService.create(auditLogDto);
    }
  }

  /**
   * Erstellt einen Audit-Log für Abmeldungen
   * @param req Express Request-Objekt
   * @param userContext Benutzer-Kontext
   */
  async logLogout(req: Request, userContext: UserContext) {
    const requestContext = AuditContextUtil.extractRequestContext(req);

    const auditLogDto: CreateAuditLogDto = {
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
    };

    if (this.useQueue) {
      const jobId = await this.auditLogQueue.addAuditLog(auditLogDto);
      return { id: jobId, ...auditLogDto } as any;
    } else {
      return this.auditLogService.create(auditLogDto);
    }
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
