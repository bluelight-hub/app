import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

/**
 * Audit-Log-Entity für API-Dokumentation und Typisierung
 */
export class AuditLogEntity {
  @ApiProperty({
    description: 'Eindeutige ID des Audit-Log-Eintrags',
    example: 'audit_12345abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Art der durchgeführten Aktion',
    enum: AuditActionType,
    example: AuditActionType.CREATE,
  })
  actionType: AuditActionType;

  @ApiProperty({
    description: 'Schweregrad der Aktion',
    enum: AuditSeverity,
    example: AuditSeverity.MEDIUM,
  })
  severity: AuditSeverity;

  @ApiProperty({
    description: 'Spezifische Bezeichnung der Aktion',
    example: 'create-user',
  })
  action: string;

  @ApiProperty({
    description: 'Betroffene Ressource',
    example: 'user',
  })
  resource: string;

  @ApiPropertyOptional({
    description: 'ID der spezifischen Ressource',
    example: 'user_12345',
  })
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'ID des handelnden Benutzers',
    example: 'user_67890',
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'E-Mail des handelnden Benutzers',
    example: 'admin@bluelight-hub.com',
  })
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Rolle des handelnden Benutzers zur Zeit der Aktion',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  userRole?: UserRole;

  @ApiPropertyOptional({
    description: 'ID des Benutzers, der diese Aktion via Impersonation durchgeführt hat',
    example: 'superadmin_99999',
  })
  impersonatedBy?: string;

  @ApiPropertyOptional({
    description: 'Request-Korrelations-ID',
    example: 'req_abc123def',
  })
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Session-Identifier',
    example: 'sess_xyz789',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Client-IP-Adresse',
    example: '192.168.1.100',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client User-Agent',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Aufgerufener API-Endpoint',
    example: '/api/v1/users',
  })
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'HTTP-Methode',
    example: 'POST',
  })
  httpMethod?: string;

  @ApiPropertyOptional({
    description: 'Vorheriger Zustand (für Updates/Deletes)',
    example: { name: 'Old Name', email: 'old@example.com' },
  })
  oldValues?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Neuer Zustand (für Creates/Updates)',
    example: { name: 'New Name', email: 'new@example.com' },
  })
  newValues?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Geänderte Felder',
    type: [String],
    example: ['name', 'email'],
  })
  affectedFields?: string[];

  @ApiPropertyOptional({
    description: 'Zusätzliche Kontext-Daten',
    example: { bulkOperation: true, recordCount: 50 },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Zeitstempel der Aktion',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Dauer der Operation in Millisekunden',
    example: 1250,
  })
  duration?: number;

  @ApiProperty({
    description: 'Ob die Operation erfolgreich war',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Fehlermeldung bei gescheiterten Operationen',
    example: 'Validation failed: Email already exists',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'HTTP-Status-Code',
    example: 201,
  })
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'Compliance-Tags',
    type: [String],
    example: ['GDPR', 'HIPAA'],
  })
  compliance?: string[];

  @ApiProperty({
    description: 'Markiert, ob sensible Daten betroffen waren',
    example: false,
  })
  sensitiveData: boolean;

  @ApiProperty({
    description: 'Markiert, ob diese Aktion eine manuelle Überprüfung erfordert',
    example: false,
  })
  requiresReview: boolean;

  @ApiPropertyOptional({
    description: 'Benutzer, der diesen Eintrag überprüft hat',
    example: 'superadmin_99999',
  })
  reviewedBy?: string;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Überprüfung',
    example: '2024-01-15T12:00:00Z',
  })
  reviewedAt?: Date;

  @ApiPropertyOptional({
    description: 'Aufbewahrungsdauer in Tagen',
    example: 365,
  })
  retentionPeriod?: number;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Archivierung',
    example: '2025-01-15T10:30:00Z',
  })
  archivedAt?: Date;
}
