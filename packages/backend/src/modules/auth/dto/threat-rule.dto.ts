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
 * DTO für die Erstellung einer neuen Threat Detection Rule
 */
export class CreateThreatRuleDto {
  @ApiProperty({ description: 'Name der Regel' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Beschreibung der Regel' })
  @IsString()
  description: string;

  @ApiProperty({ enum: ThreatSeverityEnum, description: 'Schweregrad der Bedrohung' })
  @IsEnum(ThreatSeverityEnum)
  severity: ThreatSeverity;

  @ApiProperty({ enum: ConditionTypeEnum, description: 'Typ der Regel-Bedingung' })
  @IsEnum(ConditionTypeEnum)
  conditionType: ConditionType;

  @ApiProperty({ description: 'Regel-spezifische Konfiguration' })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: 'Tags zur Kategorisierung', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

/**
 * DTO für die Aktualisierung einer Threat Detection Rule
 */
export class UpdateThreatRuleDto {
  @ApiPropertyOptional({ description: 'Name der Regel' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Beschreibung der Regel' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RuleStatusEnum, description: 'Status der Regel' })
  @IsOptional()
  @IsEnum(RuleStatusEnum)
  status?: RuleStatus;

  @ApiPropertyOptional({ enum: ThreatSeverityEnum, description: 'Schweregrad der Bedrohung' })
  @IsOptional()
  @IsEnum(ThreatSeverityEnum)
  severity?: ThreatSeverity;

  @ApiPropertyOptional({ description: 'Regel-spezifische Konfiguration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tags zur Kategorisierung', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO für Threat Rule Response
 */
export class ThreatRuleDto {
  @ApiProperty({ description: 'Eindeutige ID der Regel' })
  id: string;

  @ApiProperty({ description: 'Name der Regel' })
  name: string;

  @ApiProperty({ description: 'Beschreibung der Regel' })
  description: string;

  @ApiProperty({ description: 'Version der Regel' })
  version: string;

  @ApiProperty({ enum: RuleStatusEnum, description: 'Status der Regel' })
  status: RuleStatus;

  @ApiProperty({ enum: ThreatSeverityEnum, description: 'Schweregrad der Bedrohung' })
  severity: ThreatSeverity;

  @ApiProperty({ enum: ConditionTypeEnum, description: 'Typ der Regel-Bedingung' })
  conditionType: ConditionType;

  @ApiProperty({ description: 'Regel-spezifische Konfiguration' })
  config: Record<string, any>;

  @ApiProperty({ description: 'Tags zur Kategorisierung', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Erstellt von' })
  createdBy?: string;

  @ApiProperty({ description: 'Erstellungsdatum' })
  createdAt: Date;

  @ApiProperty({ description: 'Aktualisiert von' })
  updatedBy?: string;

  @ApiProperty({ description: 'Aktualisierungsdatum' })
  updatedAt: Date;
}

/**
 * DTO für Regel-Filter
 */
export class ThreatRuleFilterDto {
  @ApiPropertyOptional({ enum: RuleStatusEnum, description: 'Filter nach Status' })
  @IsOptional()
  @IsEnum(RuleStatusEnum)
  status?: RuleStatus;

  @ApiPropertyOptional({ enum: ThreatSeverityEnum, description: 'Filter nach Schweregrad' })
  @IsOptional()
  @IsEnum(ThreatSeverityEnum)
  severity?: ThreatSeverity;

  @ApiPropertyOptional({ description: 'Filter nach Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO für Regel-Evaluierungs-Ergebnis
 */
export class RuleEvaluationResultDto {
  @ApiProperty({ description: 'ID der evaluierten Regel' })
  ruleId: string;

  @ApiProperty({ description: 'Name der evaluierten Regel' })
  ruleName: string;

  @ApiProperty({ description: 'Ob die Regel gematcht hat' })
  matched: boolean;

  @ApiPropertyOptional({
    enum: ThreatSeverityEnum,
    description: 'Schweregrad der erkannten Bedrohung',
  })
  severity?: ThreatSeverity;

  @ApiPropertyOptional({ description: 'Risiko-Score (0-100)' })
  score?: number;

  @ApiPropertyOptional({ description: 'Grund für den Match' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Beweise für den Match' })
  evidence?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Vorgeschlagene Aktionen', type: [String] })
  suggestedActions?: string[];

  @ApiProperty({ description: 'Evaluierungszeitpunkt' })
  evaluatedAt: Date;

  @ApiPropertyOptional({ description: 'Ausführungszeit in ms' })
  executionTime?: number;
}

/**
 * DTO für Regel-Statistiken
 */
export class RuleStatisticsDto {
  @ApiProperty({ description: 'Gesamtanzahl der Regeln' })
  totalRules: number;

  @ApiProperty({ description: 'Regeln nach Status' })
  rulesByStatus: {
    active: number;
    inactive: number;
    testing: number;
  };

  @ApiProperty({ description: 'Regeln nach Schweregrad' })
  rulesBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  @ApiProperty({ description: 'Engine-Metriken' })
  engineMetrics: {
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    totalMatches: number;
    matchRate: number;
    ruleStats: Record<string, any>;
  };
}

/**
 * DTO für manuelles Regel-Testing
 */
export class TestRuleDto {
  @ApiProperty({ description: 'ID der zu testenden Regel' })
  @IsString()
  ruleId: string;

  @ApiProperty({ description: 'Test-Kontext für die Regel' })
  @IsObject()
  context: {
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    eventType: string;
    metadata?: Record<string, any>;
  };

  @ApiPropertyOptional({ description: 'Historische Events für Musteranalyse' })
  @IsOptional()
  @IsArray()
  recentEvents?: Array<{
    eventType: string;
    timestamp: Date;
    ipAddress?: string;
    success?: boolean;
    metadata?: Record<string, any>;
  }>;
}
