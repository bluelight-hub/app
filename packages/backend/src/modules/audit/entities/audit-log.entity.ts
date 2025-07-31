import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

/**
 * Entity-Klasse für Audit-Log-Einträge
 *
 * Diese Klasse repräsentiert einen einzelnen Audit-Log-Eintrag im System.
 * Sie erfasst alle sicherheitsrelevanten Aktionen und Änderungen mit
 * umfassenden Metadaten für Compliance, Forensik und Monitoring.
 *
 * Features:
 * - Vollständige Erfassung von Benutzeraktionen
 * - Änderungsverfolgung mit Vorher/Nachher-Werten
 * - Compliance-Tagging für regulatorische Anforderungen
 * - Performance-Metriken für Operationen
 * - Review- und Archivierungsfunktionen
 *
 * @class AuditLogEntity
 */
export class AuditLogEntity {
  /**
   * Eindeutige ID des Audit-Log-Eintrags
   *
   * Primärschlüssel für den Audit-Log-Eintrag in der Datenbank
   *
   * @required
   */
  @ApiProperty({
    description: 'Eindeutige ID des Audit-Log-Eintrags',
    example: 'audit_12345abcdef',
  })
  id: string;

  /**
   * Art der durchgeführten Aktion im Audit-Log
   *
   * Klassifiziert die Aktion nach ihrem Typ (z.B. CREATE, READ, UPDATE, DELETE)
   *
   * @enum AuditActionType
   * @required
   */
  @ApiProperty({
    description: 'Art der durchgeführten Aktion',
    enum: AuditActionType,
    example: AuditActionType.CREATE,
  })
  actionType: AuditActionType;

  /**
   * Schweregrad der protokollierten Aktion
   *
   * Klassifiziert die Wichtigkeit oder Kritikalität der Aktion
   *
   * @enum AuditSeverity
   * @required
   */
  @ApiProperty({
    description: 'Schweregrad der Aktion',
    enum: AuditSeverity,
    example: AuditSeverity.MEDIUM,
  })
  severity: AuditSeverity;

  /**
   * Spezifische Bezeichnung der protokollierten Aktion
   *
   * Detaillierte Beschreibung der durchgeführten Aktion (z.B. 'create-user', 'update-profile')
   *
   * @required
   */
  @ApiProperty({
    description: 'Spezifische Bezeichnung der Aktion',
    example: 'create-user',
  })
  action: string;

  /**
   * Betroffene Ressource im System
   *
   * Typ der Ressource, auf die sich die Aktion bezieht (z.B. 'user', 'einsatz')
   *
   * @required
   */
  @ApiProperty({
    description: 'Betroffene Ressource',
    example: 'user',
  })
  resource: string;

  /**
   * ID der spezifischen Ressource, auf die sich die Aktion bezieht
   *
   * Eindeutige Kennung der betroffenen Ressource
   */
  @ApiPropertyOptional({
    description: 'ID der spezifischen Ressource',
    example: 'user_12345',
  })
  resourceId?: string;

  /**
   * ID des Benutzers, der die Aktion durchgeführt hat
   *
   * Eindeutige Kennung des handelnden Benutzers
   */
  @ApiPropertyOptional({
    description: 'ID des handelnden Benutzers',
    example: 'user_67890',
  })
  userId?: string;

  /**
   * E-Mail-Adresse des Benutzers, der die Aktion durchgeführt hat
   *
   * Alternative zur Benutzer-ID, wenn die E-Mail-Adresse bekannt ist
   */
  @ApiPropertyOptional({
    description: 'E-Mail des handelnden Benutzers',
    example: 'admin@bluelight-hub.com',
  })
  userEmail?: string;

  /**
   * Rolle des Benutzers zum Zeitpunkt der Aktion
   *
   * Speichert die Benutzerrolle, die zum Zeitpunkt der Aktion aktiv war
   *
   * @enum UserRole
   */
  @ApiPropertyOptional({
    description: 'Rolle des handelnden Benutzers zur Zeit der Aktion',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  userRole?: UserRole;

  /**
   * ID des Benutzers, der die Aktion im Namen eines anderen Benutzers durchgeführt hat
   *
   * Wird verwendet, um Impersonation (Handeln im Namen eines anderen Benutzers) zu protokollieren
   */
  @ApiPropertyOptional({
    description: 'ID des Benutzers, der diese Aktion via Impersonation durchgeführt hat',
    example: 'superadmin_99999',
  })
  impersonatedBy?: string;

  /**
   * Eindeutige ID der HTTP-Anfrage, die diese Aktion ausgelöst hat
   *
   * Ermöglicht die Korrelation mehrerer Audit-Log-Einträge, die zur selben Anfrage gehören
   */
  @ApiPropertyOptional({
    description: 'Request-Korrelations-ID',
    example: 'req_abc123def',
  })
  requestId?: string;

  /**
   * Eindeutige ID der Benutzersession, in der die Aktion durchgeführt wurde
   *
   * Ermöglicht die Korrelation mehrerer Aktionen innerhalb derselben Benutzersession
   */
  @ApiPropertyOptional({
    description: 'Session-Identifier',
    example: 'sess_xyz789',
  })
  sessionId?: string;

  /**
   * IP-Adresse des Clients, von dem die Aktion ausgeführt wurde
   *
   * Wichtig für Sicherheitsanalysen und Nachverfolgung von verdächtigen Aktivitäten
   */
  @ApiPropertyOptional({
    description: 'Client-IP-Adresse',
    example: '192.168.1.100',
  })
  ipAddress?: string;

  /**
   * User-Agent-String des Clients, von dem die Aktion ausgeführt wurde
   *
   * Enthält Informationen über Browser, Betriebssystem und Gerät des Benutzers
   */
  @ApiPropertyOptional({
    description: 'Client User-Agent',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  userAgent?: string;

  /**
   * API-Endpunkt, über den die Aktion ausgeführt wurde
   *
   * Vollständiger Pfad des aufgerufenen API-Endpunkts
   */
  @ApiPropertyOptional({
    description: 'Aufgerufener API-Endpoint',
    example: '/api/v1/users',
  })
  endpoint?: string;

  /**
   * HTTP-Methode, mit der die Aktion ausgeführt wurde
   *
   * Speichert die HTTP-Methode (GET, POST, PUT, DELETE, etc.) der Anfrage
   */
  @ApiPropertyOptional({
    description: 'HTTP-Methode',
    example: 'POST',
  })
  httpMethod?: string;

  /**
   * Vorheriger Zustand der Ressource vor der Änderung
   *
   * Speichert den Zustand der Ressource vor Updates oder Löschungen
   * Wichtig für Audit-Trails und Nachvollziehbarkeit von Änderungen
   *
   * @type {Record<string, any>}
   */
  @ApiPropertyOptional({
    description: 'Vorheriger Zustand (für Updates/Deletes)',
    example: { name: 'Old Name', email: 'old@example.com' },
  })
  oldValues?: Record<string, any>;

  /**
   * Neuer Zustand der Ressource nach der Änderung
   *
   * Speichert den Zustand der Ressource nach Creates oder Updates
   * Ermöglicht den Vergleich mit dem vorherigen Zustand
   *
   * @type {Record<string, any>}
   */
  @ApiPropertyOptional({
    description: 'Neuer Zustand (für Creates/Updates)',
    example: { name: 'New Name', email: 'new@example.com' },
  })
  newValues?: Record<string, any>;

  /**
   * Liste der Felder, die durch die Aktion geändert wurden
   *
   * Ermöglicht eine schnelle Übersicht über die betroffenen Attribute
   *
   * @type {string[]}
   */
  @ApiPropertyOptional({
    description: 'Geänderte Felder',
    type: [String],
    example: ['name', 'email'],
  })
  affectedFields?: string[];

  /**
   * Zusätzliche Kontext-Daten zur Aktion
   *
   * Ermöglicht die Speicherung beliebiger zusätzlicher Informationen zur Aktion,
   * die nicht durch die anderen Felder abgedeckt werden
   *
   * @type {Record<string, any>}
   */
  @ApiPropertyOptional({
    description: 'Zusätzliche Kontext-Daten',
    example: { bulkOperation: true, recordCount: 50 },
  })
  metadata?: Record<string, any>;

  /**
   * Zeitstempel, wann die Aktion durchgeführt wurde
   *
   * Speichert den genauen Zeitpunkt, zu dem die Aktion stattgefunden hat
   *
   * @required
   * @type {Date}
   */
  @ApiProperty({
    description: 'Zeitstempel der Aktion',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;

  /**
   * Dauer der Operation in Millisekunden
   *
   * Speichert die Ausführungszeit der Aktion für Performance-Analysen
   *
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'Dauer der Operation in Millisekunden',
    example: 1250,
  })
  duration?: number;

  /**
   * Erfolgs-Flag der Operation
   *
   * Gibt an, ob die Aktion erfolgreich ausgeführt wurde oder fehlgeschlagen ist
   *
   * @required
   * @type {boolean}
   */
  @ApiProperty({
    description: 'Ob die Operation erfolgreich war',
    example: true,
  })
  success: boolean;

  /**
   * Fehlermeldung bei fehlgeschlagenen Operationen
   *
   * Speichert die Fehlermeldung, wenn die Aktion nicht erfolgreich war (success = false)
   */
  @ApiPropertyOptional({
    description: 'Fehlermeldung bei gescheiterten Operationen',
    example: 'Validation failed: Email already exists',
  })
  errorMessage?: string;

  /**
   * HTTP-Status-Code der Antwort
   *
   * Speichert den HTTP-Status-Code, der bei der Aktion zurückgegeben wurde
   *
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'HTTP-Status-Code',
    example: 201,
  })
  statusCode?: number;

  /**
   * Compliance-relevante Tags für die Aktion
   *
   * Kennzeichnet die Aktion mit relevanten Compliance-Standards (z.B. GDPR, HIPAA)
   * Wichtig für Compliance-Berichte und Audits
   *
   * @type {string[]}
   */
  @ApiPropertyOptional({
    description: 'Compliance-Tags',
    type: [String],
    example: ['GDPR', 'HIPAA'],
  })
  compliance?: string[];

  /**
   * Kennzeichnet, ob bei der Aktion sensible Daten betroffen waren
   *
   * Wichtig für Datenschutz und spezielle Behandlung sensibler Informationen
   *
   * @required
   * @type {boolean}
   */
  @ApiProperty({
    description: 'Markiert, ob sensible Daten betroffen waren',
    example: false,
  })
  sensitiveData: boolean;

  /**
   * Kennzeichnet, ob diese Aktion eine manuelle Überprüfung erfordert
   *
   * Ermöglicht das Markieren von Aktionen, die eine zusätzliche Prüfung benötigen
   *
   * @required
   * @type {boolean}
   */
  @ApiProperty({
    description: 'Markiert, ob diese Aktion eine manuelle Überprüfung erfordert',
    example: false,
  })
  requiresReview: boolean;

  /**
   * ID des Benutzers, der diesen Audit-Log-Eintrag überprüft hat
   *
   * Wird gesetzt, wenn ein Benutzer den Eintrag manuell überprüft hat
   * Ermöglicht die Nachverfolgung von Überprüfungen
   */
  @ApiPropertyOptional({
    description: 'Benutzer, der diesen Eintrag überprüft hat',
    example: 'superadmin_99999',
  })
  reviewedBy?: string;

  /**
   * Zeitpunkt, zu dem der Audit-Log-Eintrag überprüft wurde
   *
   * Wird zusammen mit reviewedBy gesetzt, wenn ein Benutzer den Eintrag überprüft hat
   *
   * @type {Date}
   */
  @ApiPropertyOptional({
    description: 'Zeitpunkt der Überprüfung',
    example: '2024-01-15T12:00:00Z',
  })
  reviewedAt?: Date;

  /**
   * Aufbewahrungsdauer des Audit-Log-Eintrags in Tagen
   *
   * Bestimmt, wie lange der Eintrag aufbewahrt werden soll, bevor er archiviert oder gelöscht wird
   *
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'Aufbewahrungsdauer in Tagen',
    example: 365,
  })
  retentionPeriod?: number;

  /**
   * Zeitpunkt, zu dem der Audit-Log-Eintrag archiviert wurde
   *
   * Wenn gesetzt, wurde der Eintrag archiviert und ist nicht mehr aktiv
   *
   * @type {Date}
   */
  @ApiPropertyOptional({
    description: 'Zeitpunkt der Archivierung',
    example: '2025-01-15T10:30:00Z',
  })
  archivedAt?: Date;
}
