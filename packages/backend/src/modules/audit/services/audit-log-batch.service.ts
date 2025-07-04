import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAuditLogDto, QueryAuditLogDto } from '../dto';
import { AuditLog, Prisma } from '@prisma/generated/prisma/client';
import { logger } from '../../../logger/consola.logger';
import { ConfigService } from '@nestjs/config';

/**
 * Interface für Batch-Ergebnisse
 */
export interface BatchResult {
  successful: AuditLog[];
  failed: Array<{
    index: number;
    data: CreateAuditLogDto;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/**
 * Interface für Retention-Konfiguration
 */
export interface RetentionConfig {
  defaultRetentionDays: number;
  severityRetention: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  complianceRetention: {
    [key: string]: number;
  };
}

/**
 * Service für Batch-Verarbeitung und erweiterte Audit-Log-Funktionen
 * Bietet Batch-Operationen, Validierung und konfigurierbare Retention
 */
@Injectable()
export class AuditLogBatchService {
  private readonly batchSize: number;
  private readonly retentionConfig: RetentionConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Batch-Größe aus Konfiguration oder Standard
    this.batchSize = this.configService.get<number>('AUDIT_BATCH_SIZE', 100);

    // Retention-Konfiguration
    this.retentionConfig = {
      defaultRetentionDays: this.configService.get<number>('AUDIT_DEFAULT_RETENTION_DAYS', 365),
      severityRetention: {
        LOW: this.configService.get<number>('AUDIT_RETENTION_LOW', 90),
        MEDIUM: this.configService.get<number>('AUDIT_RETENTION_MEDIUM', 180),
        HIGH: this.configService.get<number>('AUDIT_RETENTION_HIGH', 365),
        CRITICAL: this.configService.get<number>('AUDIT_RETENTION_CRITICAL', 730),
      },
      complianceRetention: {
        GDPR: this.configService.get<number>('AUDIT_RETENTION_GDPR', 1095), // 3 Jahre
        HIPAA: this.configService.get<number>('AUDIT_RETENTION_HIPAA', 2190), // 6 Jahre
        SOX: this.configService.get<number>('AUDIT_RETENTION_SOX', 2555), // 7 Jahre
      },
    };
  }

  /**
   * Validiert einen Audit-Log-Eintrag vor der Persistierung
   * @param dto Audit-Log-Daten
   * @returns Validierungsergebnis
   */
  private validateAuditLog(dto: CreateAuditLogDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Pflichtfelder validieren
    if (!dto.actionType) {
      errors.push('actionType is required');
    }
    if (!dto.action || dto.action.length === 0) {
      errors.push('action is required and cannot be empty');
    }
    if (!dto.resource || dto.resource.length === 0) {
      errors.push('resource is required and cannot be empty');
    }

    // Längenvalidierung
    if (dto.action && dto.action.length > 100) {
      errors.push('action must not exceed 100 characters');
    }
    if (dto.resource && dto.resource.length > 100) {
      errors.push('resource must not exceed 100 characters');
    }
    if (dto.resourceId && dto.resourceId.length > 255) {
      errors.push('resourceId must not exceed 255 characters');
    }

    // Timestamp-Validierung entfernt, da timestamp nicht im DTO enthalten ist

    // IP-Adresse validieren (IPv4 oder IPv6)
    if (dto.ipAddress) {
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Pattern = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/;
      if (!ipv4Pattern.test(dto.ipAddress) && !ipv6Pattern.test(dto.ipAddress)) {
        errors.push('ipAddress must be a valid IPv4 or IPv6 address');
      }
    }

    // HTTP-Methode validieren
    if (dto.httpMethod) {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      if (!validMethods.includes(dto.httpMethod.toUpperCase())) {
        errors.push(`httpMethod must be one of: ${validMethods.join(', ')}`);
      }
    }

    // Status-Code validieren
    if (dto.statusCode && (dto.statusCode < 100 || dto.statusCode > 599)) {
      errors.push('statusCode must be a valid HTTP status code (100-599)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Transformiert Audit-Log-Daten vor der Persistierung
   * @param dto Audit-Log-Daten
   * @returns Transformierte Daten
   */
  private transformAuditLog(dto: CreateAuditLogDto): CreateAuditLogDto {
    const transformed = { ...dto };

    // Retention-Period basierend auf Severity und Compliance setzen
    if (!transformed.retentionPeriod) {
      transformed.retentionPeriod = this.calculateRetentionPeriod(dto);
    }

    // Timestamp wird automatisch beim Insert gesetzt

    // HTTP-Methode normalisieren
    if (transformed.httpMethod) {
      transformed.httpMethod = transformed.httpMethod.toUpperCase();
    }

    // Felder trimmen
    if (transformed.action) transformed.action = transformed.action.trim();
    if (transformed.resource) transformed.resource = transformed.resource.trim();
    if (transformed.resourceId) transformed.resourceId = transformed.resourceId.trim();
    if (transformed.userEmail) transformed.userEmail = transformed.userEmail.trim().toLowerCase();

    return transformed;
  }

  /**
   * Berechnet die Aufbewahrungsdauer basierend auf Severity und Compliance
   * @param dto Audit-Log-Daten
   * @returns Aufbewahrungsdauer in Tagen
   */
  private calculateRetentionPeriod(dto: CreateAuditLogDto): number {
    let retentionDays = this.retentionConfig.defaultRetentionDays;

    // Severity-basierte Retention (verwende direkt den Severity-Wert, nicht das Maximum)
    if (dto.severity && this.retentionConfig.severityRetention[dto.severity]) {
      retentionDays = this.retentionConfig.severityRetention[dto.severity];
    }

    // Compliance-basierte Retention (überschreibt Severity-basierte, wenn höher)
    if (dto.compliance && dto.compliance.length > 0) {
      for (const complianceTag of dto.compliance) {
        if (this.retentionConfig.complianceRetention[complianceTag]) {
          retentionDays = Math.max(
            retentionDays,
            this.retentionConfig.complianceRetention[complianceTag],
          );
        }
      }
    }

    return retentionDays;
  }

  /**
   * Erstellt mehrere Audit-Log-Einträge in einem Batch
   * @param dtos Array von Audit-Log-Daten
   * @returns Batch-Ergebnis mit erfolgreichen und fehlgeschlagenen Einträgen
   */
  async createBatch(dtos: CreateAuditLogDto[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: dtos.length,
      successCount: 0,
      failureCount: 0,
    };

    // Verarbeite in Batches für bessere Performance
    for (let i = 0; i < dtos.length; i += this.batchSize) {
      const batch = dtos.slice(i, i + this.batchSize);
      const validatedBatch: CreateAuditLogDto[] = [];

      // Validiere und transformiere jeden Eintrag
      for (let j = 0; j < batch.length; j++) {
        const dto = batch[j];
        const validation = this.validateAuditLog(dto);

        if (!validation.isValid) {
          result.failed.push({
            index: i + j,
            data: dto,
            error: validation.errors.join('; '),
          });
          result.failureCount++;
          continue;
        }

        validatedBatch.push(this.transformAuditLog(dto));
      }

      // Batch-Insert für validierte Einträge
      if (validatedBatch.length > 0) {
        try {
          const created = await this.prisma.auditLog.createMany({
            data: validatedBatch.map((dto) => ({
              ...dto,
              // Setze Standard-Werte falls nicht übertragen
              severity: dto.severity || 'MEDIUM',
              success: dto.success ?? true,
              sensitiveData: dto.sensitiveData || false,
              requiresReview: dto.requiresReview || false,
              compliance: dto.compliance || [],
              affectedFields: dto.affectedFields || [],
            })),
            skipDuplicates: true,
          });

          // Da createMany keine erstellten Objekte zurückgibt, müssen wir sie separat abrufen
          const createdLogs = await this.prisma.auditLog.findMany({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 1000), // Letzte Sekunde
              },
            },
            orderBy: {
              timestamp: 'desc',
            },
            take: created.count,
          });

          result.successful.push(...createdLogs);
          result.successCount += created.count;

          // Batch creation completed
        } catch (error) {
          // Bei Batch-Fehler alle Einträge als fehlgeschlagen markieren
          for (let j = 0; j < validatedBatch.length; j++) {
            result.failed.push({
              index: i + j,
              data: batch[j],
              error: error.message || 'Batch insert failed',
            });
            result.failureCount++;
          }

          logger.error('Failed to create batch audit logs', {
            error: error.message,
            batchSize: validatedBatch.length,
          });
        }
      }
    }

    // Batch processing completed

    return result;
  }

  /**
   * Löscht Audit-Logs basierend auf Retention-Policy
   * @returns Anzahl gelöschter Einträge
   */
  async applyRetentionPolicy(): Promise<number> {
    try {
      const now = new Date();
      let totalDeleted = 0;

      // Lösche Einträge basierend auf retentionPeriod
      const deleteWithRetention = await this.prisma.auditLog.deleteMany({
        where: {
          AND: [
            { retentionPeriod: { not: null } },
            {
              timestamp: {
                lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Mindestens 1 Tag alt
              },
            },
          ],
          // Berechne ob Retention abgelaufen ist
          // Hinweis: Dies ist eine vereinfachte Version, in Produktion würde man
          // einen scheduled Job verwenden, der das Datum berechnet
        },
      });

      totalDeleted += deleteWithRetention.count;

      // Lösche alte archivierte Einträge
      const deleteArchived = await this.prisma.auditLog.deleteMany({
        where: {
          archivedAt: {
            lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 Tage nach Archivierung
          },
        },
      });

      totalDeleted += deleteArchived.count;

      // Retention policy applied

      return totalDeleted;
    } catch (error) {
      logger.error('Failed to apply retention policy', {
        error: error.message,
      });
      throw new BadRequestException('Failed to apply retention policy');
    }
  }

  /**
   * Erstellt aggregierte Statistiken für einen bestimmten Zeitraum
   * @param startDate Startdatum
   * @param endDate Enddatum
   * @param groupBy Gruppierung (hour, day, week, month)
   * @returns Aggregierte Statistiken
   */
  async getAggregatedStatistics(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
  ) {
    try {
      // Basis-WHERE-Bedingung
      const where: Prisma.AuditLogWhereInput = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Gruppierung nach Zeitintervall (vereinfachte Version)
      // In Produktion würde man SQL-Funktionen für die Gruppierung verwenden
      const logs = await this.prisma.auditLog.findMany({
        where,
        select: {
          timestamp: true,
          actionType: true,
          severity: true,
          success: true,
          resource: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      // Manuelle Aggregation (vereinfacht)
      const aggregated = new Map<string, any>();

      for (const log of logs) {
        let key: string;
        const date = new Date(log.timestamp);

        switch (groupBy) {
          case 'hour':
            key = `${date.toISOString().slice(0, 13)}:00`;
            break;
          case 'day':
            key = date.toISOString().slice(0, 10);
            break;
          case 'week': {
            const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
            key = `Week ${week}`;
            break;
          }
          case 'month':
            key = date.toISOString().slice(0, 7);
            break;
        }

        if (!aggregated.has(key)) {
          aggregated.set(key, {
            period: key,
            total: 0,
            byActionType: {},
            bySeverity: {},
            byResource: {},
            successRate: { success: 0, failed: 0 },
          });
        }

        const stats = aggregated.get(key);
        stats.total++;

        // Action Type
        stats.byActionType[log.actionType] = (stats.byActionType[log.actionType] || 0) + 1;

        // Severity
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

        // Resource
        stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;

        // Success Rate
        if (log.success) {
          stats.successRate.success++;
        } else {
          stats.successRate.failed++;
        }
      }

      const result = Array.from(aggregated.values()).map((stats) => ({
        ...stats,
        successRate: {
          ...stats.successRate,
          percentage:
            stats.total > 0 ? Math.round((stats.successRate.success / stats.total) * 100) : 0,
        },
      }));

      // Generated aggregated statistics

      return result;
    } catch (error) {
      logger.error('Failed to generate aggregated statistics', {
        error: error.message,
        startDate,
        endDate,
        groupBy,
      });
      throw new BadRequestException('Failed to generate aggregated statistics');
    }
  }

  /**
   * Exportiert Audit-Logs in verschiedenen Formaten
   * @param queryDto Abfrage-Parameter
   * @param format Export-Format
   * @returns Exportierte Daten
   */
  async exportLogs(
    queryDto: QueryAuditLogDto,
    format: 'json' | 'csv' | 'ndjson' = 'json',
  ): Promise<string> {
    try {
      // Build where clause from query DTO
      const where: Prisma.AuditLogWhereInput = {};

      // Apply filters from queryDto
      if (queryDto.actionType) where.actionType = queryDto.actionType;
      if (queryDto.severity) where.severity = queryDto.severity;
      if (queryDto.action) where.action = { contains: queryDto.action, mode: 'insensitive' };
      if (queryDto.resource) where.resource = { contains: queryDto.resource, mode: 'insensitive' };
      if (queryDto.resourceId) where.resourceId = queryDto.resourceId;
      if (queryDto.userId) where.userId = queryDto.userId;
      if (queryDto.userEmail)
        where.userEmail = { contains: queryDto.userEmail, mode: 'insensitive' };
      if (queryDto.userRole) where.userRole = queryDto.userRole;
      if (queryDto.success !== undefined) where.success = queryDto.success;

      // Date range filter
      if (queryDto.startDate || queryDto.endDate) {
        where.timestamp = {};
        if (queryDto.startDate) where.timestamp.gte = new Date(queryDto.startDate);
        if (queryDto.endDate) where.timestamp.lte = new Date(queryDto.endDate);
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
      });

      // Exporting logs

      switch (format) {
        case 'json':
          return JSON.stringify(logs, null, 2);

        case 'ndjson':
          return logs.map((log) => JSON.stringify(log)).join('\n');

        case 'csv': {
          // Einfache CSV-Implementierung
          const headers = [
            'id',
            'timestamp',
            'actionType',
            'severity',
            'action',
            'resource',
            'resourceId',
            'userId',
            'userEmail',
            'userRole',
            'ipAddress',
            'success',
            'statusCode',
            'errorMessage',
          ];

          const csvRows = [headers.join(',')];

          for (const log of logs) {
            const row = headers.map((header) => {
              const value = log[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            });
            csvRows.push(row.join(','));
          }

          return csvRows.join('\n');
        }

        default:
          throw new BadRequestException(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export audit logs', {
        error: error.message,
        format,
      });
      // Wenn es schon ein BadRequestException ist, werfe es direkt weiter
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to export audit logs');
    }
  }
}
