import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  AuditLogService,
  AuditLogBatchService,
  AuditLogSchedulerService,
  AuditLogCacheService,
} from './services';
import { AuditLoggerUtil } from './utils';
import { AuditLogController } from './controllers';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditLogQueue, AUDIT_LOG_QUEUE, AuditLogProcessor } from './queues';

/**
 * Audit-Logging-Modul für umfassende Systemüberwachung
 *
 * Dieses Modul implementiert ein hochperformantes Audit-Logging-System
 * mit asynchroner Verarbeitung über Redis-basierte Queues. Es zeichnet
 * automatisch alle sicherheitsrelevanten Aktionen und API-Zugriffe auf.
 *
 * Features:
 * - Automatisches Logging aller HTTP-Requests via Interceptor
 * - Asynchrone Verarbeitung über Bull Queue (Redis)
 * - Batch-Verarbeitung für optimale Performance
 * - Caching-Mechanismen zur Reduzierung der Datenbankzugriffe
 * - Scheduled Jobs für Bereinigung und Archivierung
 * - Flexibles Filterungssystem für Audit-Abfragen
 * - Integration mit dem Authentifizierungssystem
 *
 * @module AuditModule
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule,
    BullModule.registerQueueAsync({
      name: AUDIT_LOG_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
  ],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditLogBatchService,
    AuditLogSchedulerService,
    AuditLogCacheService,
    AuditLogQueue,
    AuditLogProcessor,
    AuditLoggerUtil,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [
    AuditLogService,
    AuditLogBatchService,
    AuditLogQueue,
    AuditLoggerUtil,
    AuditInterceptor,
  ],
})
export class AuditModule {}
