import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityEventType } from '../enums/security-event-type.enum';

/**
 * Service für das Logging und Abrufen von Sicherheitsereignissen.
 * Zentrale Stelle für alle sicherheitsrelevanten Logs.
 */
@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Protokolliert ein Sicherheitsereignis
   */
  async logSecurityEvent(params: {
    eventType: SecurityEventType;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          eventType: params.eventType,
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata || {},
          createdAt: new Date(),
        },
      });

      this.logger.log(`Security event logged: ${params.eventType}`, {
        userId: params.userId,
        ipAddress: params.ipAddress,
      });
    } catch (error) {
      this.logger.error('Failed to log security event', error);
    }
  }

  /**
   * Ruft Sicherheitslogs mit Filteroptionen ab
   */
  async getSecurityLogs(filters: {
    eventType?: SecurityEventType;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return await this.prisma.securityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Löscht alte Sicherheitslogs (für Datenschutz/Compliance)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.securityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old security logs`);
    return result.count;
  }

  /**
   * Holt die letzten Sicherheitsereignisse für einen Benutzer
   */
  async getUserSecurityEvents(userId: string, limit: number = 10) {
    return await this.prisma.securityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Holt die letzten Sicherheitsereignisse von einer IP-Adresse
   */
  async getIpSecurityEvents(ipAddress: string, limit: number = 10) {
    return await this.prisma.securityLog.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
