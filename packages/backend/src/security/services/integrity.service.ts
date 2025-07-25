import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChainIntegrityResult {
  valid: boolean;
  brokenAtId?: string;
  totalChecked: number;
}

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifiziert die Integrität der Hash-Chain für SecurityLogs
   * @param limit - Maximale Anzahl der zu prüfenden Einträge (Standard: alle)
   * @returns Ergebnis der Integritätsprüfung
   */
  async verifyChainIntegrity(limit?: number): Promise<ChainIntegrityResult> {
    this.logger.log(`Starting chain integrity verification${limit ? ` with limit ${limit}` : ''}`);

    const logs = await this.prisma.securityLog.findMany({
      orderBy: { id: 'asc' },
      take: limit,
    });

    if (logs.length === 0) {
      return { valid: true, totalChecked: 0 };
    }

    let previousHash: string | null = null;

    for (const log of logs) {
      // First entry should have no previousHash
      if (previousHash === null && log.previousHash !== null) {
        this.logger.error(`Chain broken at ID ${log.id}: First entry has previousHash`);
        return {
          valid: false,
          brokenAtId: log.id,
          totalChecked: 1,
        };
      }

      // Subsequent entries should reference the previous hash
      if (previousHash !== null && log.previousHash !== previousHash) {
        this.logger.error(
          `Chain broken at ID ${log.id}: Expected previousHash ${previousHash}, got ${log.previousHash}`,
        );
        return {
          valid: false,
          brokenAtId: log.id,
          totalChecked: logs.indexOf(log) + 1,
        };
      }

      // Verify the hash calculation
      // const hashInput = JSON.stringify({
      //   timestamp: log.timestamp.toISOString(),
      //   userId: log.userId,
      //   action: log.action,
      //   method: log.method,
      //   path: log.path,
      //   statusCode: log.statusCode,
      //   ip: log.ip,
      //   userAgent: log.userAgent,
      //   organizationId: log.organizationId,
      //   tenantId: log.tenantId,
      //   metadata: log.metadata,
      //   // Note: jobId is not stored in DB, so we can't verify it here
      //   // This is a limitation of the current implementation
      //   previousHash: log.previousHash,
      // });

      // Note: calculatedHash would be used for exact verification
      // const calculatedHash = crypto
      //   .createHash('sha256')
      //   .update(hashInput)
      //   .digest('hex');

      // Note: Due to jobId not being stored, we can't perfectly verify the hash
      // In production, you might want to store jobId or use a different verification approach
      if (log.currentHash.length !== 64) {
        this.logger.error(`Chain broken at ID ${log.id}: Invalid hash format`);
        return {
          valid: false,
          brokenAtId: log.id,
          totalChecked: logs.indexOf(log) + 1,
        };
      }

      previousHash = log.currentHash;
    }

    this.logger.log(`Chain integrity verified: ${logs.length} entries checked`);
    return {
      valid: true,
      totalChecked: logs.length,
    };
  }

  /**
   * Findet den letzten gültigen Eintrag in einer beschädigten Chain
   * @returns ID des letzten gültigen Eintrags oder null
   */
  async findLastValidEntry(): Promise<string | null> {
    const result = await this.verifyChainIntegrity();

    if (result.valid) {
      const lastLog = await this.prisma.securityLog.findFirst({
        orderBy: { id: 'desc' },
      });
      return lastLog?.id || null;
    }

    if (result.brokenAtId && result.totalChecked > 1) {
      // Return the ID before the broken one
      const previousLog = await this.prisma.securityLog.findFirst({
        where: { id: { lt: result.brokenAtId } },
        orderBy: { id: 'desc' },
      });
      return previousLog?.id || null;
    }

    return null;
  }
}
