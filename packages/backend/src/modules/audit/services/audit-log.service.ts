import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAuditLogDto, QueryAuditLogDto } from '../dto';
import { AuditLog, AuditSeverity, Prisma } from '@prisma/generated/prisma/client';
import { logger } from '../../../logger/consola.logger';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';

/**
 * Service für die Verwaltung von Audit-Logs
 * Bietet CRUD-Operationen, erweiterte Filterung und Archivierung
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Konvertiert ein Prisma AuditLog zu einer AuditLogEntity
   * @param auditLog Prisma AuditLog
   * @returns AuditLogEntity
   */
  private toEntity(auditLog: AuditLog): AuditLogEntity {
    return {
      ...auditLog,
      oldValues: auditLog.oldValues as Record<string, any> | undefined,
      newValues: auditLog.newValues as Record<string, any> | undefined,
      metadata: auditLog.metadata as Record<string, any> | undefined,
    };
  }

  /**
   * Erstellt einen neuen Audit-Log-Eintrag
   * @param createAuditLogDto Daten für den neuen Audit-Log-Eintrag
   * @returns Der erstellte Audit-Log-Eintrag
   */
  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLogEntity> {
    try {
      // Creating audit log entry

      const auditLog = await this.prisma.auditLog.create({
        data: {
          ...createAuditLogDto,
          // Setze Standard-Werte falls nicht übertragen
          severity: createAuditLogDto.severity || AuditSeverity.MEDIUM,
          success: createAuditLogDto.success ?? true,
          sensitiveData: createAuditLogDto.sensitiveData || false,
          requiresReview: createAuditLogDto.requiresReview || false,
          compliance: createAuditLogDto.compliance || [],
          affectedFields: createAuditLogDto.affectedFields || [],
        },
      });

      // Audit log entry created successfully

      return this.toEntity(auditLog);
    } catch (error) {
      logger.error('Failed to create audit log entry', {
        error: error.message,
        dto: createAuditLogDto,
      });
      throw new BadRequestException('Failed to create audit log entry');
    }
  }

  /**
   * Ruft Audit-Logs mit erweiterten Filtermöglichkeiten ab
   * @param queryDto Filter- und Paginierungsoptionen
   * @returns Paginierte Liste von Audit-Logs mit Metadaten
   */
  async findAll(queryDto: QueryAuditLogDto): Promise<PaginatedResponse<AuditLogEntity>> {
    return this.findMany(queryDto);
  }

  /**
   * Ruft Audit-Logs mit erweiterten Filtermöglichkeiten ab
   * @param queryDto Filter- und Paginierungsoptionen
   * @returns Paginierte Liste von Audit-Logs mit Metadaten
   */
  async findMany(queryDto: QueryAuditLogDto): Promise<PaginatedResponse<AuditLogEntity>> {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        excludeArchived = true,
        ...filters
      } = queryDto;

      // Basis-Where-Bedingung
      const where: Prisma.AuditLogWhereInput = {};

      // Archivierte Einträge ausschließen falls gewünscht
      if (excludeArchived) {
        where.archivedAt = null;
      }

      // Einfache Filter
      if (filters.actionType) where.actionType = filters.actionType;
      if (filters.severity) where.severity = filters.severity;
      if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
      if (filters.resource) where.resource = { contains: filters.resource, mode: 'insensitive' };
      if (filters.resourceId) where.resourceId = filters.resourceId;
      if (filters.userId) where.userId = filters.userId;
      if (filters.userEmail) where.userEmail = { contains: filters.userEmail, mode: 'insensitive' };
      if (filters.userRole) where.userRole = filters.userRole;
      if (filters.ipAddress) where.ipAddress = filters.ipAddress;
      if (filters.sessionId) where.sessionId = filters.sessionId;
      if (filters.requestId) where.requestId = filters.requestId;
      if (filters.success !== undefined) where.success = filters.success;
      if (filters.requiresReview !== undefined) where.requiresReview = filters.requiresReview;
      if (filters.sensitiveData !== undefined) where.sensitiveData = filters.sensitiveData;

      // Zeitraum-Filter
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
        if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
      }

      // HTTP-Methoden-Filter
      if (filters.httpMethods && filters.httpMethods.length > 0) {
        where.httpMethod = { in: filters.httpMethods };
      }

      // Compliance-Filter
      if (filters.compliance && filters.compliance.length > 0) {
        where.compliance = { hasSome: filters.compliance };
      }

      // Dauer-Filter
      if (filters.minDuration !== undefined || filters.maxDuration !== undefined) {
        where.duration = {};
        if (filters.minDuration !== undefined) where.duration.gte = filters.minDuration;
        if (filters.maxDuration !== undefined) where.duration.lte = filters.maxDuration;
      }

      // Volltext-Suche
      if (filters.search) {
        where.OR = [
          { action: { contains: filters.search, mode: 'insensitive' } },
          { resource: { contains: filters.search, mode: 'insensitive' } },
          { errorMessage: { contains: filters.search, mode: 'insensitive' } },
          { userEmail: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Paginierung
      const skip = (page - 1) * limit;

      // Sortierung
      const orderBy: Prisma.AuditLogOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // Abfrage ausführen
      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      // Metadaten berechnen
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Retrieved audit logs successfully

      return {
        items: logs.map((log) => this.toEntity(log)),
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages,
          hasNextPage: hasNext,
          hasPreviousPage: hasPrev,
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve audit logs', {
        error: error.message,
        queryDto,
      });
      throw new BadRequestException('Failed to retrieve audit logs');
    }
  }

  /**
   * Ruft einen spezifischen Audit-Log-Eintrag ab
   * @param id ID des Audit-Log-Eintrags
   * @returns Der Audit-Log-Eintrag
   */
  async findOne(id: string): Promise<AuditLogEntity> {
    try {
      const auditLog = await this.prisma.auditLog.findUnique({
        where: { id },
      });

      if (!auditLog) {
        throw new NotFoundException(`Audit log with ID ${id} not found`);
      }

      // Retrieved audit log entry

      return this.toEntity(auditLog);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      logger.error('Failed to retrieve audit log', {
        error: error.message,
        auditLogId: id,
      });
      throw new BadRequestException('Failed to retrieve audit log');
    }
  }

  /**
   * Markiert einen Audit-Log-Eintrag als überprüft
   * @param id ID des Audit-Log-Eintrags
   * @param reviewedBy ID des überprüfenden Benutzers
   * @returns Der aktualisierte Audit-Log-Eintrag
   */
  async markAsReviewed(id: string, reviewedBy: string): Promise<AuditLog> {
    try {
      const auditLog = await this.prisma.auditLog.update({
        where: { id },
        data: {
          reviewedBy,
          reviewedAt: new Date(),
        },
      });

      logger.info('Audit log entry marked as reviewed', {
        auditLogId: id,
        reviewedBy,
      });

      return auditLog;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Audit log with ID ${id} not found`);
      }
      logger.error('Failed to mark audit log as reviewed', {
        error: error.message,
        auditLogId: id,
        reviewedBy,
      });
      throw new BadRequestException('Failed to mark audit log as reviewed');
    }
  }

  /**
   * Archiviert alte Audit-Log-Einträge basierend auf Aufbewahrungsrichtlinien
   * @param daysToKeep Anzahl Tage, die Logs aufbewahrt werden sollen
   * @returns Anzahl archivierter Einträge
   */
  async archiveOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.auditLog.updateMany({
        where: {
          timestamp: { lt: cutoffDate },
          archivedAt: null,
        },
        data: {
          archivedAt: new Date(),
        },
      });

      logger.info('Archived old audit log entries', {
        archivedCount: result.count,
        cutoffDate,
        daysToKeep,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to archive old audit logs', {
        error: error.message,
        daysToKeep,
      });
      throw new BadRequestException('Failed to archive old audit logs');
    }
  }

  /**
   * Löscht archivierte Audit-Log-Einträge permanent
   * @param olderThanDays Einträge löschen, die älter als X Tage archiviert sind
   * @returns Anzahl gelöschter Einträge
   */
  async deleteArchivedLogs(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          archivedAt: { lt: cutoffDate },
        },
      });

      logger.info('Deleted archived audit log entries', {
        deletedCount: result.count,
        cutoffDate,
        olderThanDays,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete archived audit logs', {
        error: error.message,
        olderThanDays,
      });
      throw new BadRequestException('Failed to delete archived audit logs');
    }
  }

  /**
   * Löscht einen einzelnen Audit-Log-Eintrag
   * @param id ID des zu löschenden Eintrags
   * @throws ForbiddenException wenn Compliance-Tags vorhanden sind
   */
  async remove(id: string): Promise<void> {
    try {
      const auditLog = await this.findOne(id);

      // Prüfe auf Compliance-Tags
      if (auditLog.compliance && auditLog.compliance.length > 0) {
        throw new ForbiddenException('Cannot delete compliance-tagged logs');
      }

      await this.prisma.auditLog.delete({
        where: { id },
      });

      logger.info('Deleted audit log entry', { auditLogId: id });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Audit log with ID ${id} not found`);
      }
      logger.error('Failed to delete audit log', {
        error: error.message,
        auditLogId: id,
      });
      throw new BadRequestException('Failed to delete audit log');
    }
  }

  /**
   * Löscht mehrere Audit-Log-Einträge basierend auf Kriterien
   * @param criteria Löschkriterien
   * @returns Anzahl gelöschter Einträge
   */
  async bulkDelete(criteria: {
    olderThan: Date;
    severity?: string;
    excludeCompliance?: boolean;
  }): Promise<number> {
    try {
      const where: Prisma.AuditLogWhereInput = {
        timestamp: { lt: criteria.olderThan },
      };

      if (criteria.severity) {
        where.severity = criteria.severity as AuditSeverity;
      }

      if (criteria.excludeCompliance) {
        where.compliance = { isEmpty: true };
      }

      const result = await this.prisma.auditLog.deleteMany({ where });

      logger.info('Bulk deleted audit log entries', {
        deletedCount: result.count,
        criteria,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to bulk delete audit logs', {
        error: error.message,
        criteria,
      });
      throw new BadRequestException('Failed to bulk delete audit logs');
    }
  }

  /**
   * Erstellt Statistiken über Audit-Log-Einträge
   * @param options Optionen für Statistiken
   * @returns Detaillierte Statistiken
   */
  async getStatistics(options: { startDate?: Date; endDate?: Date; groupBy?: string }) {
    const { startDate, endDate } = options;
    try {
      const where: Prisma.AuditLogWhereInput = {};

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [totalLogs, actionTypeStats, severityStats, successStats, topUsers, topResources] =
        await Promise.all([
          this.prisma.auditLog.count({ where }),
          this.prisma.auditLog.groupBy({
            by: ['actionType'],
            where,
            _count: { actionType: true },
          }),
          this.prisma.auditLog.groupBy({
            by: ['severity'],
            where,
            _count: { severity: true },
          }),
          this.prisma.auditLog.groupBy({
            by: ['success'],
            where,
            _count: { success: true },
          }),
          this.prisma.auditLog.groupBy({
            by: ['userId', 'userEmail'],
            where: { ...where, userId: { not: null } },
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 10,
          }),
          this.prisma.auditLog.groupBy({
            by: ['resource'],
            where,
            _count: { resource: true },
            orderBy: { _count: { resource: 'desc' } },
            take: 10,
          }),
        ]);

      const statistics = {
        totalLogs,
        actionTypes: actionTypeStats.reduce((acc, stat) => {
          acc[stat.actionType] = stat._count.actionType;
          return acc;
        }, {}),
        severities: severityStats.reduce((acc, stat) => {
          acc[stat.severity] = stat._count.severity;
          return acc;
        }, {}),
        successRate: successStats.reduce((acc, stat) => {
          acc[stat.success ? 'success' : 'failed'] = stat._count.success;
          return acc;
        }, {}),
        topUsers: topUsers.map((user) => ({
          userId: user.userId,
          userEmail: user.userEmail,
          count: user._count.userId,
        })),
        topResources: topResources.map((resource) => ({
          resource: resource.resource,
          count: resource._count.resource,
        })),
      };

      // Generated audit log statistics

      return statistics;
    } catch (error) {
      logger.error('Failed to generate audit log statistics', {
        error: error.message,
        startDate,
        endDate,
      });
      throw new BadRequestException('Failed to generate audit log statistics');
    }
  }
}
