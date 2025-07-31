import { IsString, IsEnum, IsObject, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ThreatSeverity as ThreatSeverityEnum,
  RuleStatus as RuleStatusEnum,
  ConditionType as ConditionTypeEnum,
  type ThreatSeverity,
  type RuleStatus,
  type ConditionType,
} from '@prisma/generated/prisma/enums';

/**
 * Data Transfer Object für die Erstellung einer neuen Threat Detection Rule
 *
 * Definiert die notwendigen Felder zur Erstellung von Bedrohungserkennungsregeln,
 * die automatisch verdächtige Aktivitäten im System identifizieren
 *
 * @class CreateThreatRuleDto
 */
export class CreateThreatRuleDto {
  /**
   * Name der Regel zur eindeutigen Identifikation
   * @example "Brute Force Detection"
   */
  @ApiProperty({
    description: 'Name der Regel zur eindeutigen Identifikation',
    example: 'Brute Force Detection',
  })
  @IsString()
  name: string;

  /**
   * Ausführliche Beschreibung der Regel und ihrer Funktion
   * @example "Erkennt wiederholte fehlgeschlagene Login-Versuche von derselben IP"
   */
  @ApiProperty({
    description: 'Ausführliche Beschreibung der Regel und ihrer Funktion',
    example: 'Erkennt wiederholte fehlgeschlagene Login-Versuche von derselben IP',
  })
  @IsString()
  description: string;

  /**
   * Schweregrad der erkannten Bedrohung
   */
  @ApiProperty({
    enum: ThreatSeverityEnum,
    description: 'Schweregrad der erkannten Bedrohung',
    example: ThreatSeverityEnum.HIGH,
  })
  @IsEnum(ThreatSeverityEnum)
  severity: ThreatSeverity;

  /**
   * Art der Regel-Bedingung
   */
  @ApiProperty({
    enum: ConditionTypeEnum,
    description: 'Art der Regel-Bedingung',
    example: ConditionTypeEnum.THRESHOLD,
  })
  @IsEnum(ConditionTypeEnum)
  conditionType: ConditionType;

  /**
   * Regel-spezifische Konfiguration
   * @example { "threshold": 5, "timeWindow": 300, "blockDuration": 3600 }
   */
  @ApiProperty({
    description: 'Regel-spezifische Konfiguration',
    example: { threshold: 5, timeWindow: 300, blockDuration: 3600 },
  })
  @IsObject()
  config: Record<string, any>;

  /**
   * Tags zur Kategorisierung und Filterung
   * @example ["authentication", "brute-force", "security"]
   */
  @ApiProperty({
    description: 'Tags zur Kategorisierung und Filterung',
    type: [String],
    example: ['authentication', 'brute-force', 'security'],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

/**
 * Data Transfer Object für die Aktualisierung einer Threat Detection Rule
 *
 * Ermöglicht die partielle Aktualisierung bestehender Regeln
 * ohne alle Felder angeben zu müssen
 *
 * @class UpdateThreatRuleDto
 */
export class UpdateThreatRuleDto {
  /**
   * Neuer Name der Regel
   * @example "Enhanced Brute Force Detection"
   */
  @ApiPropertyOptional({
    description: 'Neuer Name der Regel',
    example: 'Enhanced Brute Force Detection',
  })
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Neue Beschreibung der Regel
   * @example "Erweiterte Erkennung mit IP-Reputation und Geo-Lokalisierung"
   */
  @ApiPropertyOptional({
    description: 'Neue Beschreibung der Regel',
    example: 'Erweiterte Erkennung mit IP-Reputation und Geo-Lokalisierung',
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Neuer Status der Regel
   */
  @ApiPropertyOptional({
    enum: RuleStatusEnum,
    description: 'Neuer Status der Regel',
    example: RuleStatusEnum.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RuleStatusEnum)
  status?: RuleStatus;

  /**
   * Neuer Schweregrad
   */
  @ApiPropertyOptional({
    enum: ThreatSeverityEnum,
    description: 'Neuer Schweregrad',
    example: ThreatSeverityEnum.CRITICAL,
  })
  @IsOptional()
  @IsEnum(ThreatSeverityEnum)
  severity?: ThreatSeverity;

  /**
   * Aktualisierte Regel-Konfiguration
   * @example { "threshold": 3, "timeWindow": 180 }
   */
  @ApiPropertyOptional({
    description: 'Aktualisierte Regel-Konfiguration',
    example: { threshold: 3, timeWindow: 180 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  /**
   * Aktualisierte Tags
   * @example ["authentication", "advanced-threat"]
   */
  @ApiPropertyOptional({
    description: 'Aktualisierte Tags',
    type: [String],
    example: ['authentication', 'advanced-threat'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Data Transfer Object für Threat Rule Response
 *
 * Vollständige Darstellung einer Threat Detection Rule
 * mit allen Metadaten und Konfigurationen
 *
 * @class ThreatRuleDto
 */
export class ThreatRuleDto {
  /**
   * Eindeutige ID der Regel
   * @example "rule_abc123def456"
   */
  @ApiProperty({
    description: 'Eindeutige ID der Regel',
    example: 'rule_abc123def456',
  })
  id: string;

  /**
   * Name der Regel
   * @example "Brute Force Detection"
   */
  @ApiProperty({
    description: 'Name der Regel',
    example: 'Brute Force Detection',
  })
  name: string;

  /**
   * Beschreibung der Regel
   * @example "Erkennt wiederholte fehlgeschlagene Login-Versuche"
   */
  @ApiProperty({
    description: 'Beschreibung der Regel',
    example: 'Erkennt wiederholte fehlgeschlagene Login-Versuche',
  })
  description: string;

  /**
   * Version der Regel
   * @example "1.2.0"
   */
  @ApiProperty({
    description: 'Version der Regel',
    example: '1.2.0',
  })
  version: string;

  /**
   * Aktueller Status der Regel
   */
  @ApiProperty({
    enum: RuleStatusEnum,
    description: 'Aktueller Status der Regel',
    example: RuleStatusEnum.ACTIVE,
  })
  status: RuleStatus;

  /**
   * Schweregrad der Bedrohung
   */
  @ApiProperty({
    enum: ThreatSeverityEnum,
    description: 'Schweregrad der Bedrohung',
    example: ThreatSeverityEnum.HIGH,
  })
  severity: ThreatSeverity;

  /**
   * Typ der Regel-Bedingung
   */
  @ApiProperty({
    enum: ConditionTypeEnum,
    description: 'Typ der Regel-Bedingung',
    example: ConditionTypeEnum.THRESHOLD,
  })
  conditionType: ConditionType;

  /**
   * Regel-spezifische Konfiguration
   * @example { "threshold": 5, "timeWindow": 300 }
   */
  @ApiProperty({
    description: 'Regel-spezifische Konfiguration',
    example: { threshold: 5, timeWindow: 300 },
  })
  config: Record<string, any>;

  /**
   * Tags zur Kategorisierung
   * @example ["authentication", "security"]
   */
  @ApiProperty({
    description: 'Tags zur Kategorisierung',
    type: [String],
    example: ['authentication', 'security'],
  })
  tags: string[];

  /**
   * ID des Erstellers
   * @example "user_admin123"
   */
  @ApiProperty({
    description: 'ID des Erstellers',
    example: 'user_admin123',
  })
  createdBy?: string;

  /**
   * Erstellungszeitpunkt
   * @example "2024-01-15T10:00:00Z"
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  /**
   * ID des letzten Bearbeiters
   * @example "user_admin456"
   */
  @ApiProperty({
    description: 'ID des letzten Bearbeiters',
    example: 'user_admin456',
  })
  updatedBy?: string;

  /**
   * Letzter Aktualisierungszeitpunkt
   * @example "2024-01-20T15:30:00Z"
   */
  @ApiProperty({
    description: 'Letzter Aktualisierungszeitpunkt',
    example: '2024-01-20T15:30:00Z',
  })
  updatedAt: Date;
}

/**
 * Data Transfer Object für Regel-Filter
 *
 * Ermöglicht das Filtern von Threat Detection Rules
 * nach verschiedenen Kriterien
 *
 * @class ThreatRuleFilterDto
 */
export class ThreatRuleFilterDto {
  /**
   * Filter nach Regel-Status
   */
  @ApiPropertyOptional({
    enum: RuleStatusEnum,
    description: 'Filter nach Regel-Status',
    example: RuleStatusEnum.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RuleStatusEnum)
  status?: RuleStatus;

  /**
   * Filter nach Schweregrad
   */
  @ApiPropertyOptional({
    enum: ThreatSeverityEnum,
    description: 'Filter nach Schweregrad',
    example: ThreatSeverityEnum.HIGH,
  })
  @IsOptional()
  @IsEnum(ThreatSeverityEnum)
  severity?: ThreatSeverity;

  /**
   * Filter nach Tags
   * @example ["authentication", "critical"]
   */
  @ApiPropertyOptional({
    description: 'Filter nach Tags',
    type: [String],
    example: ['authentication', 'critical'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Data Transfer Object für Regel-Evaluierungs-Ergebnis
 *
 * Enthält die Ergebnisse der Regelauswertung gegen einen
 * bestimmten Sicherheitskontext mit detaillierten Informationen
 *
 * @class RuleEvaluationResultDto
 */
export class RuleEvaluationResultDto {
  /**
   * ID der evaluierten Regel
   * @example "rule_abc123"
   */
  @ApiProperty({
    description: 'ID der evaluierten Regel',
    example: 'rule_abc123',
  })
  ruleId: string;

  /**
   * Name der evaluierten Regel
   * @example "Brute Force Detection"
   */
  @ApiProperty({
    description: 'Name der evaluierten Regel',
    example: 'Brute Force Detection',
  })
  ruleName: string;

  /**
   * Ob die Regel einen Match gefunden hat
   * @example true
   */
  @ApiProperty({
    description: 'Ob die Regel einen Match gefunden hat',
    example: true,
  })
  matched: boolean;

  /**
   * Schweregrad der erkannten Bedrohung
   */
  @ApiPropertyOptional({
    enum: ThreatSeverityEnum,
    description: 'Schweregrad der erkannten Bedrohung',
    example: ThreatSeverityEnum.HIGH,
  })
  severity?: ThreatSeverity;

  /**
   * Risiko-Score (0-100)
   * @example 85
   */
  @ApiPropertyOptional({
    description: 'Risiko-Score (0-100)',
    example: 85,
  })
  score?: number;

  /**
   * Grund für den Match
   * @example "5 fehlgeschlagene Login-Versuche in 5 Minuten von IP 192.168.1.100"
   */
  @ApiPropertyOptional({
    description: 'Grund für den Match',
    example: '5 fehlgeschlagene Login-Versuche in 5 Minuten von IP 192.168.1.100',
  })
  reason?: string;

  /**
   * Beweise für den Match
   * @example { "attempts": 5, "timeWindow": 300, "ipAddress": "192.168.1.100" }
   */
  @ApiPropertyOptional({
    description: 'Beweise für den Match',
    example: { attempts: 5, timeWindow: 300, ipAddress: '192.168.1.100' },
  })
  evidence?: Record<string, any>;

  /**
   * Vorgeschlagene Aktionen
   * @example ["BLOCK_IP", "REQUIRE_2FA", "NOTIFY_ADMIN"]
   */
  @ApiPropertyOptional({
    description: 'Vorgeschlagene Aktionen',
    type: [String],
    example: ['BLOCK_IP', 'REQUIRE_2FA', 'NOTIFY_ADMIN'],
  })
  suggestedActions?: string[];

  /**
   * Evaluierungszeitpunkt
   * @example "2024-01-15T10:30:00Z"
   */
  @ApiProperty({
    description: 'Evaluierungszeitpunkt',
    example: '2024-01-15T10:30:00Z',
  })
  evaluatedAt: Date;

  /**
   * Ausführungszeit der Regel in Millisekunden
   * @example 15
   */
  @ApiPropertyOptional({
    description: 'Ausführungszeit der Regel in Millisekunden',
    example: 15,
  })
  executionTime?: number;
}

/**
 * Data Transfer Object für Regel-Statistiken
 *
 * Aggregierte Statistiken über alle Threat Detection Rules
 * für Dashboard-Anzeigen und Monitoring
 *
 * @class RuleStatisticsDto
 */
export class RuleStatisticsDto {
  /**
   * Gesamtanzahl aller Regeln im System
   * @example 42
   */
  @ApiProperty({
    description: 'Gesamtanzahl aller Regeln im System',
    example: 42,
  })
  totalRules: number;

  /**
   * Verteilung der Regeln nach Status
   * @example { "active": 35, "inactive": 5, "testing": 2 }
   */
  @ApiProperty({
    description: 'Verteilung der Regeln nach Status',
    example: { active: 35, inactive: 5, testing: 2 },
  })
  rulesByStatus: {
    active: number;
    inactive: number;
    testing: number;
  };

  /**
   * Verteilung der Regeln nach Schweregrad
   * @example { "low": 10, "medium": 15, "high": 12, "critical": 5 }
   */
  @ApiProperty({
    description: 'Verteilung der Regeln nach Schweregrad',
    example: { low: 10, medium: 15, high: 12, critical: 5 },
  })
  rulesBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  /**
   * Performance-Metriken der Rule Engine
   */
  @ApiProperty({
    description: 'Performance-Metriken der Rule Engine',
    example: {
      totalRules: 42,
      activeRules: 35,
      totalExecutions: 10000,
      totalMatches: 250,
      matchRate: 0.025,
      ruleStats: {},
    },
  })
  engineMetrics: {
    /**
     * Gesamtanzahl aller Regeln
     */
    totalRules: number;
    /**
     * Anzahl aktiver Regeln
     */
    activeRules: number;
    /**
     * Gesamtanzahl aller Regelausführungen
     */
    totalExecutions: number;
    /**
     * Gesamtanzahl aller Matches
     */
    totalMatches: number;
    /**
     * Match-Rate (Matches/Executions)
     */
    matchRate: number;
    /**
     * Detaillierte Statistiken pro Regel
     */
    ruleStats: Record<string, any>;
  };
}

/**
 * Data Transfer Object für manuelles Regel-Testing
 *
 * Ermöglicht das manuelle Testen von Regeln mit spezifischen
 * Kontextdaten zur Validierung der Regellogik
 *
 * @class TestRuleDto
 */
export class TestRuleDto {
  /**
   * ID der zu testenden Regel
   * @example "rule_abc123"
   */
  @ApiProperty({
    description: 'ID der zu testenden Regel',
    example: 'rule_abc123',
  })
  @IsString()
  ruleId: string;

  /**
   * Test-Kontext für die Regelauswertung
   */
  @ApiProperty({
    description: 'Test-Kontext für die Regelauswertung',
    example: {
      userId: 'user_123',
      email: 'test@example.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      eventType: 'LOGIN_FAILED',
      metadata: { attemptNumber: 5 },
    },
  })
  @IsObject()
  context: {
    /**
     * Benutzer-ID für den Test
     */
    userId?: string;
    /**
     * E-Mail-Adresse für den Test
     */
    email?: string;
    /**
     * IP-Adresse für den Test
     */
    ipAddress?: string;
    /**
     * User-Agent für den Test
     */
    userAgent?: string;
    /**
     * Event-Typ für den Test
     */
    eventType: string;
    /**
     * Zusätzliche Metadaten
     */
    metadata?: Record<string, any>;
  };

  /**
   * Historische Events für Pattern-basierte Regeln
   */
  @ApiPropertyOptional({
    description: 'Historische Events für Pattern-basierte Regeln',
    example: [
      {
        eventType: 'LOGIN_FAILED',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        ipAddress: '192.168.1.100',
        success: false,
        metadata: { reason: 'invalid_password' },
      },
    ],
  })
  @IsOptional()
  @IsArray()
  recentEvents?: Array<{
    /**
     * Typ des historischen Events
     */
    eventType: string;
    /**
     * Zeitstempel des Events
     */
    timestamp: Date;
    /**
     * IP-Adresse des Events
     */
    ipAddress?: string;
    /**
     * Erfolg des Events
     */
    success?: boolean;
    /**
     * Event-Metadaten
     */
    metadata?: Record<string, any>;
  }>;
}
