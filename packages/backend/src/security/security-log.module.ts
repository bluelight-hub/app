import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityLogService } from '../modules/auth/services/security-log.service';
import { SecurityLogHashService } from '../modules/auth/services/security-log-hash.service';
import { SecurityLogProcessor } from './processors/security-log.processor';
import { SecurityLogQueueService } from './services/security-log-queue.service';

/**
 * Modul für das Security Logging System mit BullMQ Queue-Integration.
 * Verwaltet die asynchrone Verarbeitung von Sicherheitsereignissen
 * mit automatischen Wiederholungsversuchen und Persistence.
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'security-log',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Behalten für Debugging
      },
    }),
  ],
  providers: [
    SecurityLogService,
    SecurityLogHashService,
    SecurityLogProcessor,
    SecurityLogQueueService,
  ],
  exports: [SecurityLogQueueService, SecurityLogService],
})
export class SecurityLogModule {}
