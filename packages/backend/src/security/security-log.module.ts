import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityLogService as AuthSecurityLogService } from '../modules/auth/services/security-log.service';
import { SecurityLogHashService } from '../modules/auth/services/security-log-hash.service';
import { SecurityLogProcessor } from './processors/security-log.processor';
import { SecurityLogQueueService } from './services/security-log-queue.service';
import { SecurityLogService } from './services/security-log.service';
import { IntegrityService } from './services/integrity.service';

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
    AuthSecurityLogService,
    SecurityLogHashService,
    SecurityLogProcessor,
    SecurityLogQueueService,
    SecurityLogService,
    IntegrityService,
  ],
  exports: [SecurityLogQueueService, SecurityLogService, IntegrityService],
})
export class SecurityLogModule {}
