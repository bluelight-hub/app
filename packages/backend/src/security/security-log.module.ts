import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityLogService as AuthSecurityLogService } from '../modules/auth/services/security-log.service';
import { SecurityLogHashService } from '../modules/auth/services/security-log-hash.service';
import { SecurityLogProcessor } from './processors/security-log.processor';
import { SecurityLogQueueService } from './services/security-log-queue.service';
import { SecurityLogService } from './services/security-log.service';
import { IntegrityService } from './services/integrity.service';
import { CleanupService } from './services/cleanup.service';
import { ArchiveService } from './services/archive.service';
import { SecurityLogController } from './controllers/security-log.controller';
import { SecurityMetricsService } from './metrics/security-metrics.service';
import { SecurityMetricsController } from './controllers/security-metrics.controller';
import { SecurityHealthService } from './health/security-health.service';
import { SecurityHealthController } from './controllers/security-health.controller';
import { SecurityMetricsInterceptor } from './interceptors/metrics.interceptor';

/**
 * Modul für das Security Logging System mit BullMQ Queue-Integration.
 * Verwaltet die asynchrone Verarbeitung von Sicherheitsereignissen
 * mit automatischen Wiederholungsversuchen und Persistence.
 * Beinhaltet Retention-Management und Archivierungsfunktionen.
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    TerminusModule,
    ScheduleModule.forRoot(),
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
  controllers: [SecurityLogController, SecurityMetricsController, SecurityHealthController],
  providers: [
    AuthSecurityLogService,
    SecurityLogHashService,
    SecurityLogProcessor,
    SecurityLogQueueService,
    SecurityLogService,
    IntegrityService,
    CleanupService,
    ArchiveService,
    SecurityMetricsService,
    SecurityHealthService,
    SecurityMetricsInterceptor,
  ],
  exports: [
    SecurityLogQueueService,
    SecurityLogService,
    IntegrityService,
    CleanupService,
    ArchiveService,
    SecurityMetricsService,
    SecurityHealthService,
  ],
})
export class SecurityLogModule {}
