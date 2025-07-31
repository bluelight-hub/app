import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

/**
 * Data Transfer Object für Audit-Log-Abfragen mit erweiterten Filtermöglichkeiten
 *
 * Ermöglicht das flexible Filtern und Durchsuchen von Audit-Log-Einträgen
 * mit Unterstützung für Paginierung, Sortierung und komplexe Suchkriterien
 *
 * @class QueryAuditLogDto
 */
export class QueryAuditLogDto {
  /**
   * Seitennummer für die Paginierung der Audit-Log-Einträge
   *
   * @minimum 1
   * @default 1
   */
  @ApiPropertyOptional({
    description: 'Seitennummer (1-basiert)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Anzahl der Audit-Log-Einträge pro Seite
   *
   * @minimum 1
   * @maximum 500
   * @default 50
   */
  @ApiPropertyOptional({
    description: 'Anzahl Einträge pro Seite',
    minimum: 1,
    maximum: 500,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  /**
   * Feld, nach dem die Audit-Log-Einträge sortiert werden
   *
   * @default 'timestamp'
   */
  @ApiPropertyOptional({
    description: 'Sortierfeld',
    default: 'timestamp',
    example: 'timestamp',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'timestamp';

  /**
   * Sortierrichtung für die Audit-Log-Einträge
   *
   * @enum ['asc', 'desc']
   * @default 'desc'
   */
  @ApiPropertyOptional({
    description: 'Sortierrichtung',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * Filter für Audit-Log-Einträge nach Aktionstyp
   *
   * @enum AuditActionType
   */
  @ApiPropertyOptional({
    description: 'Filter nach Aktionstyp',
    enum: AuditActionType,
    example: AuditActionType.CREATE,
  })
  @IsOptional()
  @IsEnum(AuditActionType)
  actionType?: AuditActionType;

  /**
   * Filter für Audit-Log-Einträge nach Schweregrad
   *
   * @enum AuditSeverity
   */
  @ApiPropertyOptional({
    description: 'Filter nach Schweregrad',
    enum: AuditSeverity,
    example: AuditSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  /**
   * Filter für Audit-Log-Einträge nach spezifischer Aktion
   *
   * Ermöglicht die Suche nach bestimmten Aktionen wie 'create-user', 'update-profile', etc.
   */
  @ApiPropertyOptional({
    description: 'Filter nach spezifischer Aktion',
    example: 'create-user',
  })
  @IsOptional()
  @IsString()
  action?: string;

  /**
   * Filter für Audit-Log-Einträge nach Ressourcentyp
   *
   * Ermöglicht die Suche nach bestimmten Ressourcentypen wie 'user', 'einsatz', etc.
   */
  @ApiPropertyOptional({
    description: 'Filter nach Ressource',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  /**
   * Filter für Audit-Log-Einträge nach Ressourcen-ID
   *
   * Ermöglicht die Suche nach Aktionen, die eine bestimmte Ressource betreffen
   */
  @ApiPropertyOptional({
    description: 'Filter nach Ressourcen-ID',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  /**
   * Filter für Audit-Log-Einträge nach Benutzer-ID
   *
   * Ermöglicht die Suche nach Aktionen eines bestimmten Benutzers
   */
  @ApiPropertyOptional({
    description: 'Filter nach Benutzer-ID',
    example: 'user_67890',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Filter für Audit-Log-Einträge nach Benutzer-E-Mail
   *
   * Alternative zum userId-Filter, wenn die E-Mail-Adresse bekannt ist
   */
  @ApiPropertyOptional({
    description: 'Filter nach Benutzer-E-Mail',
    example: 'admin@bluelight-hub.com',
  })
  @IsOptional()
  @IsString()
  userEmail?: string;

  /**
   * Filter für Audit-Log-Einträge nach Benutzerrolle
   *
   * Ermöglicht die Suche nach Aktionen von Benutzern mit einer bestimmten Rolle
   *
   * @enum UserRole
   */
  @ApiPropertyOptional({
    description: 'Filter nach Benutzerrolle',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  /**
   * Filter für Audit-Log-Einträge nach IP-Adresse
   *
   * Ermöglicht die Suche nach Aktionen, die von einer bestimmten IP-Adresse ausgeführt wurden
   */
  @ApiPropertyOptional({
    description: 'Filter nach IP-Adresse',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  /**
   * Filter für erfolgreiche oder fehlgeschlagene Aktionen
   *
   * Ermöglicht die Suche nach erfolgreichen (true) oder fehlgeschlagenen (false) Operationen
   */
  @ApiPropertyOptional({
    description: 'Filter nach Erfolg/Fehler',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  success?: boolean;

  /**
   * Filter für Einträge, die eine manuelle Überprüfung erfordern
   *
   * Ermöglicht die Suche nach Aktionen, die als überprüfungsbedürftig markiert wurden
   */
  @ApiPropertyOptional({
    description: 'Filter für Einträge, die eine Überprüfung erfordern',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiresReview?: boolean;

  /**
   * Filter für Einträge, die sensible Daten enthalten
   *
   * Ermöglicht die Suche nach Aktionen, die als sensibel markiert wurden
   */
  @ApiPropertyOptional({
    description: 'Filter für Einträge mit sensiblen Daten',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sensitiveData?: boolean;

  /**
   * Start-Zeitpunkt für die zeitliche Eingrenzung der Audit-Log-Einträge
   *
   * Ermöglicht die Suche nach Einträgen, die nach diesem Zeitpunkt erstellt wurden
   *
   * @format ISO 8601 Datum/Uhrzeit (z.B. '2024-01-01T00:00:00Z')
   */
  @ApiPropertyOptional({
    description: 'Start-Zeitpunkt für Zeitraum-Filter (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * End-Zeitpunkt für die zeitliche Eingrenzung der Audit-Log-Einträge
   *
   * Ermöglicht die Suche nach Einträgen, die vor diesem Zeitpunkt erstellt wurden
   *
   * @format ISO 8601 Datum/Uhrzeit (z.B. '2024-12-31T23:59:59Z')
   */
  @ApiPropertyOptional({
    description: 'End-Zeitpunkt für Zeitraum-Filter (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * Volltext-Suche über alle relevanten Felder der Audit-Log-Einträge
   *
   * Durchsucht Aktionen, Ressourcen, Fehlermeldungen und Metadaten nach dem angegebenen Suchbegriff
   */
  @ApiPropertyOptional({
    description: 'Volltext-Suche in Aktionen, Ressourcen und Metadaten',
    example: 'user creation failed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter für Audit-Log-Einträge nach HTTP-Methoden
   *
   * Ermöglicht die Suche nach Einträgen mit bestimmten HTTP-Methoden (z.B. GET, POST, PUT, DELETE)
   *
   * @type {string[]}
   */
  @ApiPropertyOptional({
    description: 'Filter nach HTTP-Methoden',
    type: [String],
    example: ['POST', 'PUT'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  httpMethods?: string[];

  /**
   * Filter für Audit-Log-Einträge nach Compliance-Tags
   *
   * Ermöglicht die Suche nach Einträgen, die mit bestimmten Compliance-Standards gekennzeichnet sind
   *
   * @type {string[]}
   */
  @ApiPropertyOptional({
    description: 'Filter nach Compliance-Tags',
    type: [String],
    example: ['GDPR', 'HIPAA'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  compliance?: string[];

  /**
   * Minimale Operationsdauer in Millisekunden für die Filterung
   *
   * Ermöglicht die Suche nach Einträgen, deren Operationen mindestens diese Dauer benötigten
   *
   * @minimum 0
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'Minimale Operationsdauer in Millisekunden',
    minimum: 0,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDuration?: number;

  /**
   * Maximale Operationsdauer in Millisekunden für die Filterung
   *
   * Ermöglicht die Suche nach Einträgen, deren Operationen höchstens diese Dauer benötigten
   *
   * @minimum 0
   * @type {number}
   */
  @ApiPropertyOptional({
    description: 'Maximale Operationsdauer in Millisekunden',
    minimum: 0,
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDuration?: number;

  /**
   * Filter für Audit-Log-Einträge nach Session-ID
   *
   * Ermöglicht die Suche nach Einträgen, die zu einer bestimmten Benutzersession gehören
   */
  @ApiPropertyOptional({
    description: 'Filter nach Session-ID',
    example: 'sess_xyz789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  /**
   * Filter für Audit-Log-Einträge nach Request-ID
   *
   * Ermöglicht die Suche nach Einträgen, die zu einer bestimmten HTTP-Anfrage gehören
   */
  @ApiPropertyOptional({
    description: 'Filter nach Request-ID',
    example: 'req_abc123def',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  /**
   * Option zum Ausschluss von archivierten Audit-Log-Einträgen
   *
   * Bei true werden archivierte Einträge aus den Suchergebnissen ausgeschlossen
   *
   * @default true
   */
  @ApiPropertyOptional({
    description: 'Ausschluss von archivierten Einträgen',
    default: true,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeArchived?: boolean = true;
}
