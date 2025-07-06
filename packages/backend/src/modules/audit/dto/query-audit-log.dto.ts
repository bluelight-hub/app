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
 * DTO für Audit-Log-Abfragen mit erweiterten Filtermöglichkeiten
 */
export class QueryAuditLogDto {
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

  @ApiPropertyOptional({
    description: 'Sortierfeld',
    default: 'timestamp',
    example: 'timestamp',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'timestamp';

  @ApiPropertyOptional({
    description: 'Sortierrichtung',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Filter nach Aktionstyp',
    enum: AuditActionType,
    example: AuditActionType.CREATE,
  })
  @IsOptional()
  @IsEnum(AuditActionType)
  actionType?: AuditActionType;

  @ApiPropertyOptional({
    description: 'Filter nach Schweregrad',
    enum: AuditSeverity,
    example: AuditSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @ApiPropertyOptional({
    description: 'Filter nach spezifischer Aktion',
    example: 'create-user',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Ressource',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Ressourcen-ID',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Benutzer-ID',
    example: 'user_67890',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Benutzer-E-Mail',
    example: 'admin@bluelight-hub.com',
  })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Benutzerrolle',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter nach IP-Adresse',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Erfolg/Fehler',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({
    description: 'Filter für Einträge, die eine Überprüfung erfordern',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiresReview?: boolean;

  @ApiPropertyOptional({
    description: 'Filter für Einträge mit sensiblen Daten',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sensitiveData?: boolean;

  @ApiPropertyOptional({
    description: 'Start-Zeitpunkt für Zeitraum-Filter (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End-Zeitpunkt für Zeitraum-Filter (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Volltext-Suche in Aktionen, Ressourcen und Metadaten',
    example: 'user creation failed',
  })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({
    description: 'Filter nach Session-ID',
    example: 'sess_xyz789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Filter nach Request-ID',
    example: 'req_abc123def',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

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
