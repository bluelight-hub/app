import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogBatchService } from './audit-log-batch.service';
import { logger } from '../../../logger/consola.logger';
import { ConfigService } from '@nestjs/config';

/**
 * Scheduler-Service für automatisierte Audit-Log-Wartungsaufgaben
 * Führt regelmäßige Bereinigungen und Wartungen durch
 */
@Injectable()
export class AuditLogSchedulerService implements OnModuleInit {
  private isEnabled: boolean;

  constructor(
    private readonly auditLogBatchService: AuditLogBatchService,
    private readonly configService: ConfigService,
  ) {
    // Scheduler kann über Umgebungsvariable deaktiviert werden
    this.isEnabled = this.configService.get<boolean>('AUDIT_SCHEDULER_ENABLED', true);
  }

  onModuleInit() {
    if (this.isEnabled) {
      logger.info('Audit log scheduler service initialized and enabled');
    } else {
      logger.warn('Audit log scheduler service is disabled via configuration');
    }
  }

  /**
   * Führt täglich um 2:00 Uhr die Retention-Policy aus
   * Löscht alte Logs basierend auf den konfigurierten Aufbewahrungsfristen
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async applyRetentionPolicy() {
    if (!this.isEnabled) {
      return;
    }

    logger.info('Starting scheduled retention policy application');

    try {
      const deletedCount = await this.auditLogBatchService.applyRetentionPolicy();

      logger.info('Retention policy applied successfully', {
        deletedCount,
        timestamp: new Date().toISOString(),
      });

      // Erstelle einen Audit-Log-Eintrag für die Wartungsoperation
      await this.logMaintenanceOperation('retention-policy', {
        deletedCount,
        success: true,
      });
    } catch (error) {
      logger.error('Failed to apply retention policy', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Erstelle einen Audit-Log-Eintrag für den Fehler
      await this.logMaintenanceOperation('retention-policy', {
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Generiert wöchentlich am Sonntag um 1:00 Uhr aggregierte Statistiken
   * für die letzte Woche
   */
  @Cron('0 1 * * 0') // Jeden Sonntag um 1:00 Uhr
  async generateWeeklyStatistics() {
    if (!this.isEnabled) {
      return;
    }

    logger.info('Starting weekly statistics generation');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const statistics = await this.auditLogBatchService.getAggregatedStatistics(
        startDate,
        endDate,
        'day',
      );

      logger.info('Weekly statistics generated successfully', {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        daysIncluded: statistics.length,
      });

      // Hier könnten die Statistiken gespeichert oder per E-Mail versendet werden
      await this.logMaintenanceOperation('weekly-statistics', {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        statisticsCount: statistics.length,
        success: true,
      });
    } catch (error) {
      logger.error('Failed to generate weekly statistics', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      await this.logMaintenanceOperation('weekly-statistics', {
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Prüft stündlich auf Audit-Logs, die eine Überprüfung erfordern
   * und sendet ggf. Benachrichtigungen
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkLogsRequiringReview() {
    if (!this.isEnabled) {
      return;
    }

    // Diese Funktionalität könnte in Zukunft implementiert werden
    // um Logs mit requiresReview=true zu überprüfen und
    // Benachrichtigungen zu versenden

    logger.debug('Checking for logs requiring review - not yet implemented');
  }

  /**
   * Erstellt einen Audit-Log-Eintrag für Wartungsoperationen
   * @param operation Name der Wartungsoperation
   * @param metadata Zusätzliche Metadaten
   */
  private async logMaintenanceOperation(operation: string, metadata: any) {
    try {
      // Hier würde normalerweise ein Audit-Log erstellt werden
      // Für Wartungsoperationen mit dem ActionType SYSTEM_CONFIG
      logger.info('Maintenance operation logged', {
        operation,
        metadata,
      });
    } catch (error) {
      // Fehler beim Logging von Wartungsoperationen sollten
      // die Hauptfunktionalität nicht beeinträchtigen
      logger.error('Failed to log maintenance operation', {
        operation,
        error: error.message,
      });
    }
  }

  /**
   * Methode zum manuellen Auslösen der Retention-Policy
   * Kann für Tests oder administrative Zwecke verwendet werden
   */
  async triggerRetentionPolicy(): Promise<number> {
    logger.info('Manually triggering retention policy');
    return await this.auditLogBatchService.applyRetentionPolicy();
  }

  /**
   * Methode zum manuellen Auslösen der Statistik-Generierung
   * @param startDate Startdatum
   * @param endDate Enddatum
   * @param groupBy Gruppierung
   */
  async triggerStatisticsGeneration(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
  ) {
    logger.info('Manually triggering statistics generation', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy,
    });

    return await this.auditLogBatchService.getAggregatedStatistics(startDate, endDate, groupBy);
  }
}
