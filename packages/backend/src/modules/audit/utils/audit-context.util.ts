import { Request } from 'express';
import { UserRole } from '@prisma/generated/prisma/client';
import { nanoid } from 'nanoid';

/**
 * Interface für Benutzer-Kontext aus dem Request
 *
 * Dieses Interface definiert die Struktur der Benutzerinformationen,
 * die für Audit-Logs und Sicherheitsüberprüfungen benötigt werden.
 *
 * @interface UserContext
 * @example
 * ```typescript
 * const userContext: UserContext = {
 *   id: 'user-123',
 *   email: 'user@example.com',
 *   role: UserRole.USER,
 *   sessionId: 'session-abc123'
 * };
 * ```
 */
export interface UserContext {
  /**
   * Eindeutige Benutzer-ID
   * @property {string} [id] - UUID oder andere eindeutige Kennung des Benutzers
   */
  id?: string;

  /**
   * E-Mail-Adresse des Benutzers
   * @property {string} [email] - Validierte E-Mail-Adresse
   */
  email?: string;

  /**
   * Rolle des Benutzers im System
   * @property {UserRole} [role] - Enum-Wert der Benutzerrolle (ADMIN, USER, etc.)
   */
  role?: UserRole;

  /**
   * Session-ID des aktuellen Logins
   * @property {string} [sessionId] - JWT Token ID (jti) oder Session-Cookie-ID
   */
  sessionId?: string;
}

/**
 * Utility-Klasse für die Extraktion von Audit-relevanten Kontext-Informationen
 *
 * Diese Klasse stellt statische Methoden zur Verfügung, um aus HTTP-Requests
 * alle für Audit-Logs relevanten Informationen zu extrahieren. Dies umfasst
 * Benutzer-Kontext, Request-Details, IP-Adressen und Session-Informationen.
 *
 * Die Klasse unterstützt auch die Erstellung von Metadaten für spezielle
 * Audit-Szenarien wie Bulk-Operationen und Systemkonfiguration-Änderungen.
 *
 * @class AuditContextUtil
 * @example
 * ```typescript
 * // Request-Kontext extrahieren
 * const context = AuditContextUtil.extractRequestContext(req);
 * logger.info(context.ipAddress); // '192.168.1.1'
 *
 * // Benutzer-Kontext extrahieren
 * const userContext = AuditContextUtil.extractUserContext(req);
 * logger.info(userContext?.email); // 'user@example.com'
 *
 * // Sensible Daten sanitisieren
 * const sanitized = AuditContextUtil.sanitizeSensitiveData({
 *   email: 'user@example.com',
 *   password: 'secret123'
 * });
 * logger.info(sanitized.password); // '[REDACTED]'
 * ```
 */
export class AuditContextUtil {
  /**
   * Extrahiert Request-Kontext für Audit-Logs
   * @param req Express Request-Objekt
   * @returns Kontext-Informationen für Audit-Logs
   */
  static extractRequestContext(req: Request) {
    const requestId = (req.headers['x-request-id'] as string) || nanoid(10);
    const ipAddress = this.getClientIpAddress(req);
    const userAgent = req.headers['user-agent'] || undefined;

    return {
      requestId,
      ipAddress,
      userAgent,
      endpoint: req.originalUrl || req.url,
      httpMethod: req.method,
      sessionId: this.extractSessionId(req),
    };
  }

  /**
   * Extrahiert Benutzer-Kontext aus dem Request
   * @param req Express Request-Objekt
   * @returns Benutzer-Kontext oder undefined
   */
  static extractUserContext(req: Request): UserContext | undefined {
    // Annahme: Benutzer-Informationen sind im Request verfügbar (z.B. durch JWT-Guard)
    const user = (req as any).user;

    if (!user) {
      return undefined;
    }

    return {
      id: user.id || user.sub,
      email: user.email,
      role: user.role,
      sessionId: user.sessionId || this.extractSessionId(req),
    };
  }

  /**
   * Extrahiert die Client-IP-Adresse unter Berücksichtigung von Proxies
   * @param req Express Request-Objekt
   * @returns Client-IP-Adresse
   */
  private static getClientIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;

    if (forwarded) {
      // X-Forwarded-For kann mehrere IPs enthalten, die erste ist die ursprüngliche Client-IP
      return forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    return remoteAddress || 'unknown';
  }

  /**
   * Extrahiert Session-ID aus dem Request
   * @param req Express Request-Objekt
   * @returns Session-ID oder undefined
   */
  private static extractSessionId(req: Request): string | undefined {
    // Session-ID kann aus verschiedenen Quellen kommen:
    // 1. JWT Token (als jti)
    // 2. Session Cookie
    // 3. Custom Header

    const user = (req as any).user;
    if (user?.jti) {
      return user.jti;
    }

    // Fallback: Session aus Cookie oder Header
    const sessionCookie = req.cookies?.['session-id'];
    const sessionHeader = req.headers['x-session-id'] as string;

    return sessionHeader || sessionCookie;
  }

  /**
   * Erstellt Metadaten für Bulk-Operationen
   * @param recordCount Anzahl der betroffenen Datensätze
   * @param batchId Batch-ID für die Operation
   * @param additionalMeta Zusätzliche Metadaten
   * @returns Metadaten-Objekt
   */
  static createBulkOperationMetadata(
    recordCount: number,
    batchId?: string,
    additionalMeta?: Record<string, any>,
  ) {
    return {
      bulkOperation: true,
      recordCount,
      batchId: batchId || nanoid(8),
      timestamp: new Date().toISOString(),
      ...additionalMeta,
    };
  }

  /**
   * Erstellt Metadaten für Systemkonfiguration-Änderungen
   * @param configKey Konfigurationsschlüssel
   * @param environment Umgebung (development, staging, production)
   * @param additionalMeta Zusätzliche Metadaten
   * @returns Metadaten-Objekt
   */
  static createSystemConfigMetadata(
    configKey: string,
    environment: string,
    additionalMeta?: Record<string, any>,
  ) {
    return {
      systemConfig: true,
      configKey,
      environment,
      timestamp: new Date().toISOString(),
      ...additionalMeta,
    };
  }

  /**
   * Sanitisiert sensible Daten für Audit-Logs
   * @param data Zu sanitisierende Daten
   * @param sensitiveFields Liste der sensiblen Felder
   * @returns Sanitisierte Daten
   */
  static sanitizeSensitiveData(
    data: Record<string, any>,
    sensitiveFields: string[] = ['password', 'passwordHash', 'token', 'secret', 'apiKey'],
  ): Record<string, any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Bestimmt die Compliance-Tags basierend auf den Daten
   * @param data Zu analysierende Daten
   * @param resource Ressourcentyp
   * @returns Array von Compliance-Tags
   */
  static determineComplianceTags(data: Record<string, any>, resource: string): string[] {
    const tags: string[] = [];

    // GDPR-relevante Felder
    const gdprFields = ['email', 'firstName', 'lastName', 'phoneNumber', 'address'];
    if (gdprFields.some((field) => field in data)) {
      tags.push('GDPR');
    }

    // Gesundheitsdaten (falls relevant)
    const healthFields = ['medicalData', 'diagnosis', 'treatment'];
    if (healthFields.some((field) => field in data)) {
      tags.push('HIPAA');
    }

    // Finanzielle Daten
    const financialFields = ['creditCard', 'bankAccount', 'payment'];
    if (financialFields.some((field) => field in data)) {
      tags.push('PCI-DSS');
    }

    // Basis-Audit für Admin-Aktionen
    if (['user', 'role', 'permission'].includes(resource)) {
      tags.push('AUDIT');
    }

    return tags;
  }
}
