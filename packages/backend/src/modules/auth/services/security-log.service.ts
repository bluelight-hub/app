import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { SecurityLogHashService } from './security-log-hash.service';

/**
 * Service für das Logging und Abrufen von Sicherheitsereignissen.
 * Zentrale Stelle für alle sicherheitsrelevanten Logs mit Hash-Chain-Integrität.
 */
@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: SecurityLogHashService,
  ) {}

  /**
   * Protokolliert ein Sicherheitsereignis mit Hash-Chain-Integrität
   */
  async logSecurityEvent(params: {
    eventType: SecurityEventType;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    sessionId?: string;
    severity?: string;
    message?: string;
  }): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Hole den letzten Log-Eintrag für die Hash-Verkettung
        const lastLog = await tx.securityLog.findFirst({
          orderBy: { sequenceNumber: 'desc' },
          select: {
            sequenceNumber: true,
            currentHash: true,
          },
        });

        // Bestimme die nächste Sequenznummer
        const nextSequenceNumber = lastLog ? lastLog.sequenceNumber + 1n : 1n;
        const previousHash = lastLog ? lastLog.currentHash : null;

        // Erstelle Log-Daten
        const createdAt = new Date();
        const logData = {
          sequenceNumber: nextSequenceNumber,
          eventType: params.eventType,
          severity: params.severity || 'INFO',
          userId: params.userId || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          sessionId: params.sessionId || null,
          metadata: params.metadata || {},
          message: params.message || null,
          createdAt,
        };

        // Berechne Hash für diesen Eintrag
        const currentHash = this.hashService.calculateHash(logData, previousHash);

        // Erstelle den Log-Eintrag
        await tx.securityLog.create({
          data: {
            ...logData,
            previousHash,
            currentHash,
            hashAlgorithm: 'SHA256',
            metadata: logData.metadata,
          },
        });

        this.logger.log(`Security event logged: ${params.eventType}`, {
          userId: params.userId,
          ipAddress: params.ipAddress,
          sequenceNumber: nextSequenceNumber.toString(),
        });
      });
    } catch (error) {
      this.logger.error('Failed to log security event', error);
      // In kritischen Fällen könnte hier eine Fallback-Lösung implementiert werden
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

  /**
   * Verifiziert die Integrität der Log-Kette
   *
   * @param startSequence - Optionale Start-Sequenznummer
   * @param endSequence - Optionale End-Sequenznummer
   * @returns Verifikationsergebnis
   */
  async verifyLogChainIntegrity(
    startSequence?: bigint,
    endSequence?: bigint,
  ): Promise<{
    isValid: boolean;
    totalChecked: number;
    brokenAtSequence?: bigint;
    error?: string;
  }> {
    try {
      // Baue Where-Klausel auf
      const where: any = {};
      if (startSequence !== undefined || endSequence !== undefined) {
        where.sequenceNumber = {};
        if (startSequence !== undefined) {
          where.sequenceNumber.gte = startSequence;
        }
        if (endSequence !== undefined) {
          where.sequenceNumber.lte = endSequence;
        }
      }

      // Hole Logs in Sequenz-Reihenfolge
      const logs = await this.prisma.securityLog.findMany({
        where,
        orderBy: { sequenceNumber: 'asc' },
      });

      if (logs.length === 0) {
        return { isValid: true, totalChecked: 0 };
      }

      // Verifiziere die Kette
      const result = this.hashService.verifyChainIntegrity(logs);

      return {
        isValid: result.isValid,
        totalChecked: logs.length,
        brokenAtSequence: result.brokenAtSequence,
        error: result.error,
      };
    } catch (error) {
      this.logger.error('Failed to verify log chain integrity', error);
      throw error;
    }
  }

  /**
   * Erstellt einen Checkpoint der aktuellen Log-Kette
   *
   * @param count - Anzahl der letzten Logs für den Checkpoint
   * @returns Checkpoint-Daten
   */
  async createLogChainCheckpoint(count: number = 100) {
    try {
      const logs = await this.prisma.securityLog.findMany({
        orderBy: { sequenceNumber: 'desc' },
        take: count,
      });

      if (logs.length === 0) {
        return null;
      }

      // Sortiere für Checkpoint-Berechnung
      logs.reverse();

      const checkpoint = this.hashService.createChainCheckpoint(logs);

      if (checkpoint) {
        // Log den Checkpoint als spezielles Event
        await this.logSecurityEvent({
          eventType: SecurityEventType.SYSTEM_CHECKPOINT,
          severity: 'INFO',
          message: 'Log chain checkpoint created',
          metadata: {
            checkpoint: {
              sequenceNumber: checkpoint.sequenceNumber.toString(),
              hash: checkpoint.hash,
              merkleRoot: checkpoint.merkleRoot,
              count: checkpoint.count,
            },
          },
        });
      }

      return checkpoint;
    } catch (error) {
      this.logger.error('Failed to create log chain checkpoint', error);
      throw error;
    }
  }

  /**
   * Findet manipulierte oder fehlende Log-Einträge
   *
   * @returns Liste von Anomalien
   */
  async detectLogAnomalies(): Promise<{
    missingSequences: bigint[];
    invalidHashes: bigint[];
    brokenChains: Array<{ sequence: bigint; error: string }>;
  }> {
    try {
      const result = {
        missingSequences: [] as bigint[],
        invalidHashes: [] as bigint[],
        brokenChains: [] as Array<{ sequence: bigint; error: string }>,
      };

      // Hole Min/Max Sequenznummern
      const sequenceRange = await this.prisma.securityLog.aggregate({
        _min: { sequenceNumber: true },
        _max: { sequenceNumber: true },
      });

      if (!sequenceRange._min?.sequenceNumber || !sequenceRange._max?.sequenceNumber) {
        return result;
      }

      // Prüfe auf fehlende Sequenznummern
      const allSequences = await this.prisma.securityLog.findMany({
        select: { sequenceNumber: true },
        orderBy: { sequenceNumber: 'asc' },
      });

      let expectedSequence = sequenceRange._min.sequenceNumber;
      for (const log of allSequences) {
        if (log.sequenceNumber !== expectedSequence) {
          // Füge alle fehlenden Sequenzen hinzu
          while (expectedSequence < log.sequenceNumber) {
            result.missingSequences.push(expectedSequence);
            expectedSequence++;
          }
        }
        expectedSequence = log.sequenceNumber + 1n;
      }

      // Verifiziere Hash-Integrität in Batches
      const batchSize = 1000;
      let currentSequence = sequenceRange._min.sequenceNumber;

      while (currentSequence <= sequenceRange._max.sequenceNumber) {
        const batchEnd = currentSequence + BigInt(batchSize) - 1n;
        const verificationResult = await this.verifyLogChainIntegrity(
          currentSequence,
          batchEnd > sequenceRange._max.sequenceNumber
            ? sequenceRange._max.sequenceNumber
            : batchEnd,
        );

        if (!verificationResult.isValid && verificationResult.brokenAtSequence) {
          result.brokenChains.push({
            sequence: verificationResult.brokenAtSequence,
            error: verificationResult.error || 'Unknown error',
          });
        }

        currentSequence = batchEnd + 1n;
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to detect log anomalies', error);
      throw error;
    }
  }

  /**
   * Exportiert Logs mit Hash-Verifikation
   *
   * @param filters - Export-Filter
   * @returns Exportierte Logs mit Verifikationsstatus
   */
  async exportVerifiedLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    eventTypes?: SecurityEventType[];
    verifyIntegrity?: boolean;
  }) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      where.eventType = { in: filters.eventTypes };
    }

    const logs = await this.prisma.securityLog.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
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

    let verificationResult = null;
    if (filters.verifyIntegrity && logs.length > 0) {
      verificationResult = this.hashService.verifyChainIntegrity(logs);
    }

    return {
      logs,
      exportedAt: new Date(),
      totalCount: logs.length,
      verification: verificationResult,
    };
  }
}
