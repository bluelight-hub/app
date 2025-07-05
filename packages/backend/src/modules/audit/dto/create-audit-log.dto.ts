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
 * DTO für die Erstellung eines Audit-Log-Eintrags
 */
export class CreateAuditLogDto {
  @ApiProperty({
    description: 'Art der durchgeführten Aktion',
    enum: AuditActionType,
    example: AuditActionType.CREATE,
  })
  @IsEnum(AuditActionType)
  actionType: AuditActionType;

  @ApiPropertyOptional({
    description: 'Schweregrad der Aktion',
    enum: AuditSeverity,
    default: AuditSeverity.MEDIUM,
    example: AuditSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity = AuditSeverity.MEDIUM;

  @ApiProperty({
    description: 'Spezifische Bezeichnung der Aktion',
    maxLength: 100,
    example: 'create-user',
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Betroffene Ressource',
    maxLength: 100,
    example: 'user',
  })
  @IsString()
  resource: string;

  @ApiPropertyOptional({
    description: 'ID der spezifischen Ressource',
    maxLength: 255,
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'ID des handelnden Benutzers',
    maxLength: 255,
    example: 'user_67890',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'E-Mail des handelnden Benutzers',
    maxLength: 255,
    example: 'admin@bluelight-hub.com',
  })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Rolle des handelnden Benutzers zur Zeit der Aktion',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  @ApiPropertyOptional({
    description: 'ID des Benutzers, der diese Aktion via Impersonation durchgeführt hat',
    maxLength: 255,
    example: 'superadmin_99999',
  })
  @IsOptional()
  @IsString()
  impersonatedBy?: string;

  @ApiPropertyOptional({
    description: 'Request-Korrelations-ID',
    maxLength: 100,
    example: 'req_abc123def',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Session-Identifier',
    maxLength: 255,
    example: 'sess_xyz789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Client-IP-Adresse',
    maxLength: 45,
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client User-Agent',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Aufgerufener API-Endpoint',
    maxLength: 255,
    example: '/api/v1/users',
  })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'HTTP-Methode',
    maxLength: 10,
    example: 'POST',
  })
  @IsOptional()
  @IsString()
  httpMethod?: string;

  @ApiPropertyOptional({
    description: 'Vorheriger Zustand (für Updates/Deletes)',
    example: { name: 'Old Name', email: 'old@example.com' },
  })
  @IsOptional()
  @IsObject()
  oldValues?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Neuer Zustand (für Creates/Updates)',
    example: { name: 'New Name', email: 'new@example.com' },
  })
  @IsOptional()
  @IsObject()
  newValues?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Geänderte Felder',
    example: ['name', 'email'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedFields?: string[];

  @ApiPropertyOptional({
    description: 'Zusätzliche Kontext-Daten',
    example: { bulkOperation: true, recordCount: 50 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

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

  @ApiPropertyOptional({
    description: 'Ob die Operation erfolgreich war',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  success?: boolean = true;

  @ApiPropertyOptional({
    description: 'Fehlermeldung bei gescheiterten Operationen',
    example: 'Validation failed: Email already exists',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

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

  @ApiPropertyOptional({
    description: 'Compliance-Tags',
    example: ['GDPR', 'HIPAA'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compliance?: string[];

  @ApiPropertyOptional({
    description: 'Markiert, ob sensible Daten betroffen waren',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  sensitiveData?: boolean = false;

  @ApiPropertyOptional({
    description: 'Markiert, ob diese Aktion eine manuelle Überprüfung erfordert',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresReview?: boolean = false;

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
