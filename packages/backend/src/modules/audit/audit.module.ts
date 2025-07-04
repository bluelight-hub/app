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
import { AuditLogInterceptor } from './interceptors';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditLogQueue, AUDIT_LOG_QUEUE, AuditLogProcessor } from './queues';

/**
 * Modul für Audit-Logging-Funktionalitäten
 * Stellt Services für die Erstellung, Abfrage und Verwaltung von Audit-Logs bereit
 * Unterstützt asynchrone Verarbeitung über Bull Queue
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
    AuditLogInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    AuditInterceptor,
  ],
  exports: [
    AuditLogService,
    AuditLogBatchService,
    AuditLogQueue,
    AuditLoggerUtil,
    AuditInterceptor,
    AuditLogInterceptor,
  ],
})
export class AuditModule {}
