import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, IsDate } from 'class-validator';

/**
 * Data Transfer Object für Login-Versuche
 *
 * Repräsentiert einen einzelnen Login-Versuch mit allen relevanten
 * Informationen für Sicherheitsanalysen und Audit-Zwecke.
 *
 * @class LoginAttemptDto
 */
export class LoginAttemptDto {
  /**
   * Eindeutige ID des Login-Versuchs
   * @example "attempt_abc123def456"
   */
  @ApiProperty({
    description: 'Eindeutige ID des Login-Versuchs',
    example: 'attempt_abc123def456',
  })
  id: string;

  /**
   * Benutzer-ID (falls der Benutzer existiert)
   * @example "user_123456"
   */
  @ApiPropertyOptional({
    description: 'Benutzer-ID (falls der Benutzer existiert)',
    example: 'user_123456',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * E-Mail-Adresse, die beim Login-Versuch verwendet wurde
   * @example "user@example.com"
   */
  @ApiProperty({
    description: 'E-Mail-Adresse, die beim Login-Versuch verwendet wurde',
    example: 'user@example.com',
  })
  @IsString()
  email: string;

  /**
   * Zeitstempel des Login-Versuchs
   * @example "2024-01-15T10:30:00Z"
   */
  @ApiProperty({
    description: 'Zeitstempel des Login-Versuchs',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDate()
  attemptAt: Date;

  /**
   * IP-Adresse, von der der Versuch ausging
   * @example "192.168.1.100"
   */
  @ApiProperty({
    description: 'IP-Adresse, von der der Versuch ausging',
    example: '192.168.1.100',
  })
  @IsString()
  ipAddress: string;

  /**
   * User-Agent-String des Browsers/Clients
   * @example "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   */
  @ApiPropertyOptional({
    description: 'User-Agent-String des Browsers/Clients',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  /**
   * Erfolg des Login-Versuchs
   * @example false
   */
  @ApiProperty({
    description: 'Erfolg des Login-Versuchs',
    example: false,
  })
  @IsBoolean()
  success: boolean;

  /**
   * Grund für gescheiterten Login-Versuch
   * @example "invalid_credentials"
   */
  @ApiPropertyOptional({
    description: 'Grund für gescheiterten Login-Versuch',
    example: 'invalid_credentials',
  })
  @IsOptional()
  @IsString()
  failureReason?: string;

  /**
   * Geografischer Standort (aus IP abgeleitet)
   * @example "Munich, Germany"
   */
  @ApiPropertyOptional({
    description: 'Geografischer Standort (aus IP abgeleitet)',
    example: 'Munich, Germany',
  })
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Gerätetyp
   * @example "desktop"
   */
  @ApiPropertyOptional({
    description: 'Gerätetyp',
    example: 'desktop',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  /**
   * Browser-Name
   * @example "Chrome"
   */
  @ApiPropertyOptional({
    description: 'Browser-Name',
    example: 'Chrome',
  })
  @IsOptional()
  @IsString()
  browser?: string;

  /**
   * Betriebssystem
   * @example "Windows 10"
   */
  @ApiPropertyOptional({
    description: 'Betriebssystem',
    example: 'Windows 10',
  })
  @IsOptional()
  @IsString()
  os?: string;

  /**
   * Markierung für verdächtigen Login-Versuch
   * @example true
   */
  @ApiProperty({
    description: 'Markierung für verdächtigen Login-Versuch',
    example: true,
  })
  @IsBoolean()
  suspicious: boolean;

  /**
   * Risiko-Score (0-100, höher = riskanter)
   * @example 75
   */
  @ApiProperty({
    description: 'Risiko-Score (0-100, höher = riskanter)',
    example: 75,
  })
  @IsNumber()
  riskScore: number;
}

/**
 * Data Transfer Object für Login-Versuch-Statistiken
 *
 * Aggregierte Statistiken über Login-Versuche für einen bestimmten Zeitraum.
 * Wird für Dashboard-Anzeigen und Sicherheitsberichte verwendet.
 *
 * @class LoginAttemptStatsDto
 */
export class LoginAttemptStatsDto {
  /**
   * Gesamtzahl aller Login-Versuche im Zeitraum
   * @example 1543
   */
  @ApiProperty({
    description: 'Gesamtzahl aller Login-Versuche im Zeitraum',
    example: 1543,
  })
  totalAttempts: number;

  /**
   * Anzahl erfolgreicher Login-Versuche
   * @example 1200
   */
  @ApiProperty({
    description: 'Anzahl erfolgreicher Login-Versuche',
    example: 1200,
  })
  successfulAttempts: number;

  /**
   * Anzahl fehlgeschlagener Login-Versuche
   * @example 343
   */
  @ApiProperty({
    description: 'Anzahl fehlgeschlagener Login-Versuche',
    example: 343,
  })
  failedAttempts: number;

  /**
   * Anzahl eindeutiger IP-Adressen
   * @example 245
   */
  @ApiProperty({
    description: 'Anzahl eindeutiger IP-Adressen',
    example: 245,
  })
  uniqueIps: number;

  /**
   * Anzahl verdächtiger Login-Versuche
   * @example 12
   */
  @ApiProperty({
    description: 'Anzahl verdächtiger Login-Versuche',
    example: 12,
  })
  suspiciousAttempts: number;

  /**
   * Durchschnittlicher Risiko-Score aller Versuche
   * @example 25.5
   */
  @ApiProperty({
    description: 'Durchschnittlicher Risiko-Score aller Versuche',
    example: 25.5,
  })
  averageRiskScore: number;

  /**
   * Beginn des Auswertungszeitraums
   * @example "2024-01-01T00:00:00Z"
   */
  @ApiProperty({
    description: 'Beginn des Auswertungszeitraums',
    example: '2024-01-01T00:00:00Z',
  })
  periodStart: Date;

  /**
   * Ende des Auswertungszeitraums
   * @example "2024-01-31T23:59:59Z"
   */
  @ApiProperty({
    description: 'Ende des Auswertungszeitraums',
    example: '2024-01-31T23:59:59Z',
  })
  periodEnd: Date;
}

/**
 * Data Transfer Object für die Erstellung eines neuen Login-Versuch-Eintrags
 *
 * Wird verwendet, um neue Login-Versuche im System zu erfassen.
 * Enthält alle notwendigen Informationen für die Sicherheitsanalyse.
 *
 * @class CreateLoginAttemptDto
 */
export class CreateLoginAttemptDto {
  /**
   * Benutzer-ID (falls der Benutzer existiert)
   * @example "user_123456"
   */
  @ApiPropertyOptional({
    description: 'Benutzer-ID (falls der Benutzer existiert)',
    example: 'user_123456',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * E-Mail-Adresse, die beim Login-Versuch verwendet wurde
   * @example "user@example.com"
   */
  @ApiProperty({
    description: 'E-Mail-Adresse, die beim Login-Versuch verwendet wurde',
    example: 'user@example.com',
  })
  @IsString()
  email: string;

  /**
   * IP-Adresse, von der der Versuch ausging
   * @example "192.168.1.100"
   */
  @ApiProperty({
    description: 'IP-Adresse, von der der Versuch ausging',
    example: '192.168.1.100',
  })
  @IsString()
  ipAddress: string;

  /**
   * User-Agent-String des Browsers/Clients
   * @example "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   */
  @ApiPropertyOptional({
    description: 'User-Agent-String des Browsers/Clients',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  /**
   * Erfolg des Login-Versuchs
   * @example true
   */
  @ApiProperty({
    description: 'Erfolg des Login-Versuchs',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  /**
   * Grund für gescheiterten Login-Versuch
   * @example "invalid_credentials"
   */
  @ApiPropertyOptional({
    description: 'Grund für gescheiterten Login-Versuch',
    example: 'invalid_credentials',
  })
  @IsOptional()
  @IsString()
  failureReason?: string;

  /**
   * Zusätzliche Metadaten zum Login-Versuch
   * @example { "loginMethod": "password", "attemptNumber": 3 }
   */
  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten zum Login-Versuch',
    example: { loginMethod: 'password', attemptNumber: 3 },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
