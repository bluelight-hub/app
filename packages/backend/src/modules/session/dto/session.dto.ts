import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ActivityType, DeviceType, LoginMethod } from '@/modules/session/dto/enums.dto';

/**
 * Data Transfer Object für Session-Informationen
 *
 * Enthält alle relevanten Informationen einer Benutzersitzung
 * inklusive Geräteinformationen, Risikobewertung und Status.
 * Wird für die Session-Verwaltung und Sicherheitsüberwachung verwendet.
 *
 * @class SessionDto
 */
export class SessionDto {
  /**
   * Eindeutige Session-ID
   *
   * Primärschlüssel für die Session in der Datenbank
   *
   * @example "sess_1234567890abcdef"
   * @type {string}
   * @required
   */
  @ApiProperty({
    description: 'Eindeutige Session-ID',
    example: 'sess_1234567890abcdef',
  })
  @IsString()
  id: string;

  /**
   * ID des zugehörigen Benutzers
   *
   * Verknüpft die Session mit einem Benutzer im System
   *
   * @example "user_abc123"
   * @type {string}
   * @required
   */
  @ApiProperty({
    description: 'ID des zugehörigen Benutzers',
    example: 'user_abc123',
  })
  @IsString()
  userId: string;

  /**
   * Benutzername des Session-Inhabers
   *
   * Anzeigename des Benutzers für Logging und Benutzeroberfläche
   *
   * @example "max.mustermann"
   * @type {string}
   * @required
   */
  @ApiProperty({
    description: 'Benutzername des Session-Inhabers',
    example: 'max.mustermann',
  })
  @IsString()
  username: string;

  /**
   * E-Mail-Adresse des Session-Inhabers
   *
   * Wird für Benachrichtigungen und als alternative Benutzeridentifikation verwendet
   *
   * @example "max.mustermann@bluelight-hub.com"
   * @type {string}
   * @required
   */
  @ApiProperty({
    description: 'E-Mail-Adresse des Session-Inhabers',
    example: 'max.mustermann@bluelight-hub.com',
  })
  @IsString()
  email: string;

  /**
   * IP-Adresse des Clients
   *
   * Wird für Geolokalisierung und Sicherheitsanalysen verwendet
   *
   * @example "192.168.1.100"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'IP-Adresse des Clients',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  /**
   * User-Agent-String des Browsers
   *
   * Enthält Informationen über Browser, Betriebssystem und Gerät des Benutzers
   * Wichtig für Geräte-Fingerprinting und Anomalieerkennung
   *
   * @example "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'User-Agent-String des Browsers',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  /**
   * Geografischer Standort (aus IP-Adresse abgeleitet)
   *
   * Wird für Standortbasierte Sicherheitsanalysen und Anomalieerkennung verwendet
   *
   * @example "Munich, Germany"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Geografischer Standort (aus IP-Adresse abgeleitet)',
    example: 'Munich, Germany',
  })
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Erkannter Gerätetyp
   *
   * Klassifizierung des Geräts, von dem aus auf die Anwendung zugegriffen wird
   *
   * @example DeviceType.DESKTOP
   * @enum DeviceType
   * @type {DeviceType}
   */
  @ApiPropertyOptional({
    enum: DeviceType,
    description: 'Erkannter Gerätetyp',
    example: DeviceType.DESKTOP,
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  /**
   * Browser-Name
   *
   * Name des Browsers, der für den Zugriff verwendet wird
   *
   * @example "Chrome"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Browser-Name',
    example: 'Chrome',
  })
  @IsOptional()
  @IsString()
  browser?: string;

  /**
   * Browser-Version
   *
   * Versionsnummer des Browsers für Kompatibilitätsanalysen und Fingerprinting
   *
   * @example "120.0.0"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Browser-Version',
    example: '120.0.0',
  })
  @IsOptional()
  @IsString()
  browserVersion?: string;

  /**
   * Betriebssystem
   *
   * Name des Betriebssystems, auf dem der Client läuft
   *
   * @example "Windows"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Betriebssystem',
    example: 'Windows',
  })
  @IsOptional()
  @IsString()
  os?: string;

  /**
   * Betriebssystem-Version
   *
   * Versionsnummer des Betriebssystems für Kompatibilitätsanalysen
   *
   * @example "10"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Betriebssystem-Version',
    example: '10',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  /**
   * Verwendete Login-Methode
   *
   * Art der Authentifizierung, die für diese Session verwendet wurde
   *
   * @example LoginMethod.PASSWORD
   * @enum LoginMethod
   * @type {LoginMethod}
   */
  @ApiPropertyOptional({
    enum: LoginMethod,
    description: 'Verwendete Login-Methode',
    example: LoginMethod.PASSWORD,
  })
  @IsOptional()
  @IsEnum(LoginMethod)
  loginMethod?: LoginMethod;

  /**
   * Online-Status der Session
   *
   * Gibt an, ob die Session aktuell aktiv ist (true) oder inaktiv (false)
   * Wird durch regelmäßige Heartbeat-Signale aktualisiert
   *
   * @example true
   * @type {boolean}
   * @required
   */
  @ApiProperty({
    description: 'Online-Status der Session',
    example: true,
  })
  @IsBoolean()
  isOnline: boolean;

  /**
   * Zeitpunkt des letzten Heartbeat-Signals
   *
   * Zeitstempel des letzten Lebenszeichens vom Client
   * Wird verwendet, um den Online-Status zu bestimmen
   *
   * @example "2024-01-15T10:30:00Z"
   * @type {Date}
   */
  @ApiPropertyOptional({
    description: 'Zeitpunkt des letzten Heartbeat-Signals',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastHeartbeat?: Date;

  /**
   * Zeitpunkt der letzten Aktivität
   *
   * Zeitstempel der letzten Benutzeraktion in dieser Session
   * Wichtig für Inaktivitätserkennung und Session-Timeout
   *
   * @example "2024-01-15T10:25:00Z"
   * @type {Date}
   * @required
   */
  @ApiProperty({
    description: 'Zeitpunkt der letzten Aktivität',
    example: '2024-01-15T10:25:00Z',
  })
  @Type(() => Date)
  @IsDate()
  lastActivityAt: Date;

  /**
   * Anzahl der Aktivitäten in dieser Session
   *
   * Zähler für alle Benutzeraktionen innerhalb dieser Session
   * Wird für Aktivitätsanalysen und Verhaltensprofile verwendet
   *
   * @example 42
   * @type {number}
   * @required
   */
  @ApiProperty({
    description: 'Anzahl der Aktivitäten in dieser Session',
    example: 42,
  })
  @IsNumber()
  activityCount: number;

  /**
   * Risikobewertung der Session (0-100)
   *
   * Numerischer Wert, der das Sicherheitsrisiko dieser Session angibt
   * Höhere Werte bedeuten höheres Risiko
   *
   * @example 25
   * @type {number}
   * @minimum 0
   * @maximum 100
   * @required
   */
  @ApiProperty({
    description: 'Risikobewertung der Session (0-100)',
    example: 25,
  })
  @IsNumber()
  riskScore: number;

  /**
   * Liste verdächtiger Merkmale
   *
   * Sammlung von Flags, die auf verdächtige Aktivitäten hinweisen
   * Wird von Sicherheitsregeln gesetzt und für Risikoanalysen verwendet
   *
   * @example ['rapid_ip_change', 'unusual_location']
   * @type {string[]}
   * @required
   */
  @ApiProperty({
    description: 'Liste verdächtiger Merkmale',
    type: [String],
    example: ['rapid_ip_change', 'unusual_location'],
  })
  @IsArray()
  @IsString({ each: true })
  suspiciousFlags: string[];

  /**
   * Erstellungszeitpunkt der Session
   *
   * Zeitstempel, wann die Session erstellt wurde
   * Wichtig für Lebenszyklus-Management und Audit-Trails
   *
   * @example "2024-01-15T09:00:00Z"
   * @type {Date}
   * @required
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt der Session',
    example: '2024-01-15T09:00:00Z',
  })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  /**
   * Ablaufzeitpunkt der Session
   *
   * Zeitstempel, wann die Session automatisch ungültig wird
   * Wird bei der Erstellung basierend auf Konfigurationseinstellungen berechnet
   *
   * @example "2024-01-15T21:00:00Z"
   * @type {Date}
   * @required
   */
  @ApiProperty({
    description: 'Ablaufzeitpunkt der Session',
    example: '2024-01-15T21:00:00Z',
  })
  @Type(() => Date)
  @IsDate()
  expiresAt: Date;

  /**
   * Gibt an, ob die Session widerrufen wurde
   *
   * Flag, das anzeigt, ob die Session manuell oder automatisch ungültig gemacht wurde
   * Wird für Sicherheitsmaßnahmen wie Zwangsabmeldung verwendet
   *
   * @example false
   * @type {boolean}
   * @required
   */
  @ApiProperty({
    description: 'Gibt an, ob die Session widerrufen wurde',
    example: false,
  })
  @IsBoolean()
  isRevoked: boolean;

  /**
   * Zeitpunkt des Widerrufs
   *
   * Zeitstempel, wann die Session widerrufen wurde
   * Nur gesetzt, wenn isRevoked = true
   *
   * @example "2024-01-15T15:00:00Z"
   * @type {Date}
   */
  @ApiPropertyOptional({
    description: 'Zeitpunkt des Widerrufs',
    example: '2024-01-15T15:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  revokedAt?: Date;

  /**
   * Grund für den Widerruf
   *
   * Beschreibt, warum die Session widerrufen wurde
   * Wichtig für Audit-Trails und Sicherheitsanalysen
   *
   * @example "Suspicious activity detected"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Grund für den Widerruf',
    example: 'Suspicious activity detected',
  })
  @IsOptional()
  @IsString()
  revokedReason?: string;
}

/**
 * Data Transfer Object für Session-Aktivitäten
 *
 * Repräsentiert eine einzelne Aktivität innerhalb einer Session.
 * Wird für detailliertes Activity-Tracking und Verhaltensanalyse verwendet.
 *
 * @class SessionActivityDto
 */
export class SessionActivityDto {
  /**
   * Eindeutige Aktivitäts-ID
   *
   * Primärschlüssel für die Aktivität in der Datenbank
   *
   * @example "act_xyz789"
   * @type {string}
   * @required
   */
  @ApiProperty({
    description: 'Eindeutige Aktivitäts-ID',
    example: 'act_xyz789',
  })
  @IsString()
  id: string;

  /**
   * Zugehörige Session-ID
   *
   * Verknüpft die Aktivität mit einer Session
   * Fremdschlüssel zur SessionDto.id
   *
   * @example "sess_1234567890abcdef"
   * @type {string}
   * @required
   */
  @ApiProperty({
    description: 'Zugehörige Session-ID',
    example: 'sess_1234567890abcdef',
  })
  @IsString()
  sessionId: string;

  /**
   * Zeitstempel der Aktivität
   *
   * Zeitpunkt, zu dem die Aktivität stattgefunden hat
   * Wichtig für chronologische Analyse und Audit-Trails
   *
   * @example "2024-01-15T10:30:00Z"
   * @type {Date}
   * @required
   */
  @ApiProperty({
    description: 'Zeitstempel der Aktivität',
    example: '2024-01-15T10:30:00Z',
  })
  @Type(() => Date)
  @IsDate()
  timestamp: Date;

  /**
   * Art der Aktivität
   *
   * Kategorisierung der Benutzeraktion
   * Ermöglicht die Filterung und Analyse nach Aktivitätstypen
   *
   * @example ActivityType.API_CALL
   * @enum ActivityType
   * @type {ActivityType}
   * @required
   */
  @ApiProperty({
    enum: ActivityType,
    description: 'Art der Aktivität',
    example: ActivityType.API_CALL,
  })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  /**
   * Betroffene Ressource
   *
   * URL oder Bezeichner der Ressource, auf die zugegriffen wurde
   * Wichtig für Zugriffsanalysen und Audit-Trails
   *
   * @example "/api/v1/users/123"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'Betroffene Ressource',
    example: '/api/v1/users/123',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  /**
   * HTTP-Methode (bei API-Calls)
   *
   * HTTP-Verb der Anfrage (GET, POST, PUT, DELETE, etc.)
   * Relevant für API-Aufrufe und Zugriffsanalysen
   *
   * @example "GET"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'HTTP-Methode (bei API-Calls)',
    example: 'GET',
  })
  @IsOptional()
  @IsString()
  method?: string;

  /**
   * HTTP-Statuscode der Antwort
   *
   * Statuscode der API-Antwort
   * Wichtig für Fehleranalysen und Erfolgsmetriken
   *
   * @example 200
   * @type {number}
   * @minimum 100
   * @maximum 599
   */
  @ApiPropertyOptional({
    description: 'HTTP-Statuscode der Antwort',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  /**
   * Dauer der Operation in Millisekunden
   *
   * Ausführungszeit der Aktion
   * Wichtig für Performance-Analysen und Optimierungen
   *
   * @example 125
   * @type {number}
   * @minimum 0
   */
  @ApiPropertyOptional({
    description: 'Dauer der Operation in Millisekunden',
    example: 125,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  /**
   * IP-Adresse zum Zeitpunkt der Aktivität
   *
   * IP-Adresse des Clients bei dieser spezifischen Aktivität
   * Ermöglicht die Erkennung von IP-Änderungen innerhalb einer Session
   *
   * @example "192.168.1.100"
   * @type {string}
   */
  @ApiPropertyOptional({
    description: 'IP-Adresse zum Zeitpunkt der Aktivität',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  /**
   * Zusätzliche Metadaten zur Aktivität
   *
   * Beliebige zusätzliche Informationen zur Aktivität
   * Ermöglicht die Speicherung kontextspezifischer Daten
   *
   * @example { "pageTitle": "Dashboard", "buttonClicked": "Export" }
   * @type {Record<string, any>}
   */
  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten zur Aktivität',
    example: { pageTitle: 'Dashboard', buttonClicked: 'Export' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Data Transfer Object zum Erstellen von Session-Aktivitäten
 *
 * Wird verwendet, um neue Aktivitäten zu einer bestehenden Session hinzuzufügen.
 * Die Session-ID wird automatisch aus dem Kontext ermittelt.
 *
 * @class CreateSessionActivityDto
 */
export class CreateSessionActivityDto {
  /**
   * Art der Aktivität
   */
  @ApiProperty({
    enum: ActivityType,
    description: 'Art der Aktivität',
    example: ActivityType.PAGE_VIEW,
  })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  /**
   * Betroffene Ressource
   * @example "/dashboard"
   */
  @ApiPropertyOptional({
    description: 'Betroffene Ressource',
    example: '/dashboard',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  /**
   * HTTP-Methode (bei API-Calls)
   * @example "POST"
   */
  @ApiPropertyOptional({
    description: 'HTTP-Methode (bei API-Calls)',
    example: 'POST',
  })
  @IsOptional()
  @IsString()
  method?: string;

  /**
   * HTTP-Statuscode der Antwort
   * @example 201
   */
  @ApiPropertyOptional({
    description: 'HTTP-Statuscode der Antwort',
    example: 201,
  })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  /**
   * Dauer der Operation in Millisekunden
   * @example 250
   */
  @ApiPropertyOptional({
    description: 'Dauer der Operation in Millisekunden',
    example: 250,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  /**
   * Zusätzliche Metadaten zur Aktivität
   * @example { "action": "export", "format": "pdf" }
   */
  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten zur Aktivität',
    example: { action: 'export', format: 'pdf' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Data Transfer Object für Session-Filter
 *
 * Ermöglicht das Filtern von Sessions nach verschiedenen Kriterien.
 * Wird für Session-Management und Sicherheitsanalysen verwendet.
 *
 * @class SessionFilterDto
 */
export class SessionFilterDto {
  /**
   * Filter nach Benutzer-ID
   * @example "user_abc123"
   */
  @ApiPropertyOptional({
    description: 'Filter nach Benutzer-ID',
    example: 'user_abc123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Filter nach Online-Status
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Filter nach Online-Status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  /**
   * Filter nach Widerrufsstatus
   * @example false
   */
  @ApiPropertyOptional({
    description: 'Filter nach Widerrufsstatus',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRevoked?: boolean;

  /**
   * Minimaler Risiko-Score
   * @example 50
   */
  @ApiPropertyOptional({
    description: 'Minimaler Risiko-Score',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  minRiskScore?: number;

  /**
   * Maximaler Risiko-Score
   * @example 100
   */
  @ApiPropertyOptional({
    description: 'Maximaler Risiko-Score',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  maxRiskScore?: number;

  /**
   * Startdatum für Zeitraumfilter
   */
  @ApiPropertyOptional({
    description: 'Startdatum für Zeitraumfilter',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  /**
   * Enddatum für Zeitraumfilter
   */
  @ApiPropertyOptional({
    description: 'Enddatum für Zeitraumfilter',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  /**
   * Filter nach Gerätetyp
   */
  @ApiPropertyOptional({
    enum: DeviceType,
    description: 'Filter nach Gerätetyp',
    example: DeviceType.MOBILE,
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  /**
   * Filter nach Standort
   * @example "Munich"
   */
  @ApiPropertyOptional({
    description: 'Filter nach Standort',
    example: 'Munich',
  })
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Filter nach verdächtigen Merkmalen
   * @example ['rapid_ip_change']
   */
  @ApiPropertyOptional({
    description: 'Filter nach verdächtigen Merkmalen',
    type: [String],
    example: ['rapid_ip_change'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suspiciousFlags?: string[];
}

/**
 * Data Transfer Object für Session-Statistiken
 *
 * Enthält aggregierte Statistiken über Sessions für Dashboard-Anzeigen
 * und Sicherheitsberichte.
 *
 * @class SessionStatisticsDto
 */
export class SessionStatisticsDto {
  /**
   * Gesamtanzahl aller Sessions
   * @example 1250
   */
  @ApiProperty({
    description: 'Gesamtanzahl aller Sessions',
    example: 1250,
  })
  @IsNumber()
  totalSessions: number;

  /**
   * Anzahl aktiver Sessions
   * @example 125
   */
  @ApiProperty({
    description: 'Anzahl aktiver Sessions',
    example: 125,
  })
  @IsNumber()
  activeSessions: number;

  /**
   * Anzahl widerrufener Sessions
   * @example 50
   */
  @ApiProperty({
    description: 'Anzahl widerrufener Sessions',
    example: 50,
  })
  @IsNumber()
  revokedSessions: number;

  /**
   * Anzahl hochriskanter Sessions
   * @example 5
   */
  @ApiProperty({
    description: 'Anzahl hochriskanter Sessions',
    example: 5,
  })
  @IsNumber()
  highRiskSessions: number;

  /**
   * Verteilung nach Gerätetypen
   * @example { "desktop": 800, "mobile": 400, "tablet": 50 }
   */
  @ApiProperty({
    description: 'Verteilung nach Gerätetypen',
    example: { desktop: 800, mobile: 400, tablet: 50 },
  })
  @IsObject()
  deviceTypeDistribution: Record<DeviceType, number>;

  /**
   * Verteilung nach Standorten
   * @example { "Munich": 500, "Berlin": 300, "Hamburg": 200 }
   */
  @ApiProperty({
    description: 'Verteilung nach Standorten',
    example: { Munich: 500, Berlin: 300, Hamburg: 200 },
  })
  @IsObject()
  locationDistribution: Record<string, number>;

  /**
   * Verteilung nach Browsern
   * @example { "Chrome": 600, "Firefox": 300, "Safari": 200 }
   */
  @ApiProperty({
    description: 'Verteilung nach Browsern',
    example: { Chrome: 600, Firefox: 300, Safari: 200 },
  })
  @IsObject()
  browserDistribution: Record<string, number>;

  /**
   * Verteilung nach Betriebssystemen
   * @example { "Windows": 700, "macOS": 300, "Linux": 100 }
   */
  @ApiProperty({
    description: 'Verteilung nach Betriebssystemen',
    example: { Windows: 700, macOS: 300, Linux: 100 },
  })
  @IsObject()
  osDistribution: Record<string, number>;

  /**
   * Liste der neuesten Aktivitäten
   */
  @ApiProperty({
    description: 'Liste der neuesten Aktivitäten',
    type: [SessionActivityDto],
  })
  @IsArray()
  recentActivities: SessionActivityDto[];
}
