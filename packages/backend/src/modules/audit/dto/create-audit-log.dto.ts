import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  IsObject,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

/**
 * Data Transfer Object für die Erstellung eines Audit-Log-Eintrags
 *
 * Enthält alle notwendigen und optionalen Felder zur vollständigen
 * Protokollierung von Benutzeraktionen und Systemereignissen im Audit-Log
 *
 * @class CreateAuditLogDto
 */
export class CreateAuditLogDto {
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
  @IsEnum(AuditActionType)
  actionType: AuditActionType;

  /**
   * Schweregrad der protokollierten Aktion
   *
   * Klassifiziert die Wichtigkeit oder Kritikalität der Aktion
   *
   * @enum AuditSeverity
   * @default AuditSeverity.MEDIUM
   */
  @ApiPropertyOptional({
    description: 'Schweregrad der Aktion',
    enum: AuditSeverity,
    default: AuditSeverity.MEDIUM,
    example: AuditSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity = AuditSeverity.MEDIUM;

  /**
   * Spezifische Bezeichnung der protokollierten Aktion
   *
   * Detaillierte Beschreibung der durchgeführten Aktion (z.B. 'create-user', 'update-profile')
   *
   * @maxLength 100
   * @required
   */
  @ApiProperty({
    description: 'Spezifische Bezeichnung der Aktion',
    maxLength: 100,
    example: 'create-user',
  })
  @IsString()
  action: string;

  /**
   * Betroffene Ressource im System
   *
   * Typ der Ressource, auf die sich die Aktion bezieht (z.B. 'user', 'einsatz')
   *
   * @maxLength 100
   * @required
   */
  @ApiProperty({
    description: 'Betroffene Ressource',
    maxLength: 100,
    example: 'user',
  })
  @IsString()
  resource: string;

  /**
   * ID der spezifischen Ressource, auf die sich die Aktion bezieht
   *
   * Eindeutige Kennung der betroffenen Ressource
   *
   * @maxLength 255
   */
  @ApiPropertyOptional({
    description: 'ID der spezifischen Ressource',
    maxLength: 255,
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  /**
   * ID des Benutzers, der die Aktion durchgeführt hat
   *
   * Eindeutige Kennung des handelnden Benutzers
   *
   * @maxLength 255
   */
  @ApiPropertyOptional({
    description: 'ID des handelnden Benutzers',
    maxLength: 255,
    example: 'user_67890',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * E-Mail-Adresse des Benutzers, der die Aktion durchgeführt hat
   *
   * Alternative zur Benutzer-ID, wenn die E-Mail-Adresse bekannt ist
   *
   * @maxLength 255
   */
  @ApiPropertyOptional({
    description: 'E-Mail des handelnden Benutzers',
    maxLength: 255,
    example: 'admin@bluelight-hub.com',
  })
  @IsOptional()
  @IsString()
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
  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  /**
   * ID des Benutzers, der die Aktion im Namen eines anderen Benutzers durchgeführt hat
   *
   * Wird verwendet, um Impersonation (Handeln im Namen eines anderen Benutzers) zu protokollieren
   *
   * @maxLength 255
   */
  @ApiPropertyOptional({
    description: 'ID des Benutzers, der diese Aktion via Impersonation durchgeführt hat',
    maxLength: 255,
    example: 'superadmin_99999',
  })
  @IsOptional()
  @IsString()
  impersonatedBy?: string;

  /**
   * Eindeutige ID der HTTP-Anfrage, die diese Aktion ausgelöst hat
   *
   * Ermöglicht die Korrelation mehrerer Audit-Log-Einträge, die zur selben Anfrage gehören
   *
   * @maxLength 100
   */
  @ApiPropertyOptional({
    description: 'Request-Korrelations-ID',
    maxLength: 100,
    example: 'req_abc123def',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  /**
   * Eindeutige ID der Benutzersession, in der die Aktion durchgeführt wurde
   *
   * Ermöglicht die Korrelation mehrerer Aktionen innerhalb derselben Benutzersession
   *
   * @maxLength 255
   */
  @ApiPropertyOptional({
    description: 'Session-Identifier',
    maxLength: 255,
    example: 'sess_xyz789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  /**
   * IP-Adresse des Clients, von dem die Aktion ausgeführt wurde
   *
   * Wichtig für Sicherheitsanalysen und Nachverfolgung von verdächtigen Aktivitäten
   *
   * @maxLength 45
   */
  @ApiPropertyOptional({
    description: 'Client-IP-Adresse',
    maxLength: 45,
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
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
  @IsOptional()
  @IsString()
  userAgent?: string;

  /**
   * API-Endpunkt, über den die Aktion ausgeführt wurde
   *
   * Vollständiger Pfad des aufgerufenen API-Endpunkts
   *
   * @maxLength 255
   */
  @ApiPropertyOptional({
    description: 'Aufgerufener API-Endpoint',
    maxLength: 255,
    example: '/api/v1/users',
  })
  @IsOptional()
  @IsString()
  endpoint?: string;

  /**
   * HTTP-Methode, mit der die Aktion ausgeführt wurde
   *
   * Speichert die HTTP-Methode (GET, POST, PUT, DELETE, etc.) der Anfrage
   *
   * @maxLength 10
   */
  @ApiPropertyOptional({
    description: 'HTTP-Methode',
    maxLength: 10,
    example: 'POST',
  })
  @IsOptional()
  @IsString()
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
  @IsOptional()
  @IsObject()
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
  @IsOptional()
  @IsObject()
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
    example: ['name', 'email'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  /**
   * Dauer der Operation in Millisekunden
   *
   * Speichert die Ausführungszeit der Aktion für Performance-Analysen
   *
   * @minimum 0
   * @maximum 300000
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'Dauer der Operation in Millisekunden',
    minimum: 0,
    maximum: 300000,
    example: 1250,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300000)
  duration?: number;

  /**
   * Erfolgs-Flag der Operation
   *
   * Gibt an, ob die Aktion erfolgreich ausgeführt wurde oder fehlgeschlagen ist
   *
   * @default true
   * @type {boolean}
   */
  @ApiPropertyOptional({
    description: 'Ob die Operation erfolgreich war',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  success?: boolean = true;

  /**
   * Fehlermeldung bei fehlgeschlagenen Operationen
   *
   * Speichert die Fehlermeldung, wenn die Aktion nicht erfolgreich war (success = false)
   */
  @ApiPropertyOptional({
    description: 'Fehlermeldung bei gescheiterten Operationen',
    example: 'Validation failed: Email already exists',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  /**
   * HTTP-Status-Code der Antwort
   *
   * Speichert den HTTP-Status-Code, der bei der Aktion zurückgegeben wurde
   *
   * @minimum 100
   * @maximum 599
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'HTTP-Status-Code',
    minimum: 100,
    maximum: 599,
    example: 201,
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
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
    example: ['GDPR', 'HIPAA'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compliance?: string[];

  /**
   * Kennzeichnet, ob bei der Aktion sensible Daten betroffen waren
   *
   * Wichtig für Datenschutz und spezielle Behandlung sensibler Informationen
   *
   * @default false
   * @type {boolean}
   */
  @ApiPropertyOptional({
    description: 'Markiert, ob sensible Daten betroffen waren',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  sensitiveData?: boolean = false;

  /**
   * Kennzeichnet, ob diese Aktion eine manuelle Überprüfung erfordert
   *
   * Ermöglicht das Markieren von Aktionen, die eine zusätzliche Prüfung benötigen
   *
   * @default false
   * @type {boolean}
   */
  @ApiPropertyOptional({
    description: 'Markiert, ob diese Aktion eine manuelle Überprüfung erfordert',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresReview?: boolean = false;

  /**
   * Aufbewahrungsdauer des Audit-Log-Eintrags in Tagen
   *
   * Bestimmt, wie lange der Eintrag aufbewahrt werden soll, bevor er archiviert oder gelöscht wird
   *
   * @minimum 1
   * @maximum 3650
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'Aufbewahrungsdauer in Tagen',
    minimum: 1,
    maximum: 3650,
    example: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionPeriod?: number;
}
