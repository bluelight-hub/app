import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, IsDate } from 'class-validator';

/**
 * DTO für Login-Versuche
 *
 * Repräsentiert einen einzelnen Login-Versuch mit allen relevanten
 * Informationen für Sicherheitsanalysen und Audit-Zwecke.
 */
export class LoginAttemptDto {
  @ApiProperty({ description: 'Unique identifier of the login attempt' })
  id: string;

  @ApiPropertyOptional({ description: 'User ID if the user exists' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Email used in the login attempt' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Timestamp of the attempt' })
  @IsDate()
  attemptAt: Date;

  @ApiProperty({ description: 'IP address of the attempt' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Whether the login attempt was successful' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: 'Reason for failure' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Geolocation of the attempt' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({ description: 'Whether the attempt is flagged as suspicious' })
  @IsBoolean()
  suspicious: boolean;

  @ApiProperty({ description: 'Risk score (0-100)' })
  @IsNumber()
  riskScore: number;
}

/**
 * DTO für Login-Versuch-Statistiken
 *
 * Aggregierte Statistiken über Login-Versuche für einen bestimmten Zeitraum.
 * Wird für Dashboard-Anzeigen und Sicherheitsberichte verwendet.
 */
export class LoginAttemptStatsDto {
  @ApiProperty({ description: 'Total number of login attempts' })
  totalAttempts: number;

  @ApiProperty({ description: 'Number of successful attempts' })
  successfulAttempts: number;

  @ApiProperty({ description: 'Number of failed attempts' })
  failedAttempts: number;

  @ApiProperty({ description: 'Number of unique IPs' })
  uniqueIps: number;

  @ApiProperty({ description: 'Number of suspicious attempts' })
  suspiciousAttempts: number;

  @ApiProperty({ description: 'Average risk score' })
  averageRiskScore: number;

  @ApiProperty({ description: 'Time period start' })
  periodStart: Date;

  @ApiProperty({ description: 'Time period end' })
  periodEnd: Date;
}

/**
 * DTO für die Erstellung eines neuen Login-Versuch-Eintrags
 *
 * Wird verwendet, um neue Login-Versuche im System zu erfassen.
 * Enthält alle notwendigen Informationen für die Sicherheitsanalyse.
 */
export class CreateLoginAttemptDto {
  @ApiPropertyOptional({ description: 'User ID if the user exists' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Email used in the login attempt' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'IP address of the attempt' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Whether the login attempt was successful' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: 'Reason for failure' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
