import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityLogPayload } from '../interfaces/security-log.interface';
import * as crypto from 'crypto';

@Injectable()
@Processor('security-log')
export class SecurityLogProcessor extends WorkerHost {
  private readonly logger = new Logger(SecurityLogProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<SecurityLogPayload>): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing security log job ${job.id}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Get the last log entry with row lock to ensure sequential processing
        const lastLog = await tx.$queryRaw<{ currentHash: string; sequenceNumber: bigint }[]>`
          SELECT "currentHash", "sequenceNumber" FROM "SecurityLog" 
          ORDER BY "sequenceNumber" DESC 
          LIMIT 1 
          FOR UPDATE
        `;

        const previousHash = lastLog[0]?.currentHash || null;
        const sequenceNumber = lastLog[0] ? lastLog[0].sequenceNumber + 1n : 1n;

        // Calculate new hash including all fields
        const hashInput = JSON.stringify({
          eventType: job.data.action,
          userId: job.data.userId,
          ipAddress: job.data.ip,
          userAgent: job.data.userAgent,
          metadata: job.data.metadata,
          sequenceNumber: sequenceNumber.toString(),
          previousHash,
          timestamp: new Date().toISOString(),
        });

        const currentHash = crypto.createHash('sha256').update(hashInput).digest('hex');

        // Create the security log entry
        await tx.securityLog.create({
          data: {
            eventType: job.data.action,
            userId: job.data.userId,
            ipAddress: job.data.ip,
            userAgent: job.data.userAgent || null,
            metadata: job.data.metadata || null,
            sequenceNumber,
            previousHash,
            currentHash,
            message: job.data.metadata?.message || null,
            sessionId: job.data.metadata?.sessionId || null,
          },
        });

        const processingTime = Date.now() - startTime;
        this.logger.log(`Successfully processed security log job ${job.id} in ${processingTime}ms`);
      });
    } catch (error) {
      this.logger.error(
        `Failed to process security log job ${job.id}`,
        error instanceof Error ? error.stack : error,
      );
      // Let the job fail for retry
      throw error;
    }
  }
}
