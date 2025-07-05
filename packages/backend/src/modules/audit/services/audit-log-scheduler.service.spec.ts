import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogSchedulerService } from './audit-log-scheduler.service';
import { AuditLogBatchService } from './audit-log-batch.service';
import { logger } from '../../../logger/consola.logger';

// Mock the logger module
jest.mock('../../../logger/consola.logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuditLogSchedulerService', () => {
  let service: AuditLogSchedulerService;

  const mockBatchService = {
    applyRetentionPolicy: jest.fn(),
    getAggregatedStatistics: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'AUDIT_SCHEDULER_ENABLED') {
        return true;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogSchedulerService,
        {
          provide: AuditLogBatchService,
          useValue: mockBatchService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditLogSchedulerService>(AuditLogSchedulerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('sollte Initialisierung loggen wenn aktiviert', () => {
      service.onModuleInit();

      expect(logger.info).toHaveBeenCalledWith(
        'Audit log scheduler service initialized and enabled',
      );
    });

    it('sollte Warnung loggen wenn deaktiviert', () => {
      mockConfigService.get.mockReturnValueOnce(false);

      const disabledService = new AuditLogSchedulerService(
        mockBatchService as any,
        mockConfigService as any,
      );

      disabledService.onModuleInit();

      expect(logger.warn).toHaveBeenCalledWith(
        'Audit log scheduler service is disabled via configuration',
      );
    });
  });

  describe('applyRetentionPolicy', () => {
    it('sollte Retention-Policy erfolgreich anwenden', async () => {
      mockBatchService.applyRetentionPolicy.mockResolvedValue(42);

      await service.applyRetentionPolicy();

      expect(mockBatchService.applyRetentionPolicy).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Retention policy applied successfully',
        expect.objectContaining({
          deletedCount: 42,
          timestamp: expect.any(String),
        }),
      );
    });

    it('sollte Fehler bei Retention-Policy behandeln', async () => {
      const error = new Error('Database error');
      mockBatchService.applyRetentionPolicy.mockRejectedValue(error);

      await service.applyRetentionPolicy();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply retention policy',
        expect.objectContaining({
          error: 'Database error',
          timestamp: expect.any(String),
        }),
      );
    });

    it('sollte nichts tun wenn deaktiviert', async () => {
      mockConfigService.get.mockReturnValueOnce(false);

      const disabledService = new AuditLogSchedulerService(
        mockBatchService as any,
        mockConfigService as any,
      );

      await disabledService.applyRetentionPolicy();

      expect(mockBatchService.applyRetentionPolicy).not.toHaveBeenCalled();
    });
  });

  describe('generateWeeklyStatistics', () => {
    it('sollte wöchentliche Statistiken erfolgreich generieren', async () => {
      const mockStatistics = [
        { period: '2024-01-01', total: 100 },
        { period: '2024-01-02', total: 150 },
      ];
      mockBatchService.getAggregatedStatistics.mockResolvedValue(mockStatistics);

      await service.generateWeeklyStatistics();

      expect(mockBatchService.getAggregatedStatistics).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'day',
      );

      // Überprüfe, dass der Zeitraum 7 Tage beträgt
      const call = mockBatchService.getAggregatedStatistics.mock.calls[0];
      const startDate = call[0];
      const endDate = call[1];
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(7);

      expect(logger.info).toHaveBeenCalledWith(
        'Weekly statistics generated successfully',
        expect.objectContaining({
          periodStart: expect.any(String),
          periodEnd: expect.any(String),
          daysIncluded: 2,
        }),
      );
    });

    it('sollte Fehler bei Statistik-Generierung behandeln', async () => {
      const error = new Error('Query failed');
      mockBatchService.getAggregatedStatistics.mockRejectedValue(error);

      await service.generateWeeklyStatistics();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate weekly statistics',
        expect.objectContaining({
          error: 'Query failed',
          timestamp: expect.any(String),
        }),
      );
    });

    it('sollte nichts tun wenn deaktiviert', async () => {
      mockConfigService.get.mockReturnValueOnce(false);

      const disabledService = new AuditLogSchedulerService(
        mockBatchService as any,
        mockConfigService as any,
      );

      await disabledService.generateWeeklyStatistics();

      expect(mockBatchService.getAggregatedStatistics).not.toHaveBeenCalled();
    });
  });

  describe('checkLogsRequiringReview', () => {
    it('sollte Debug-Nachricht loggen', async () => {
      await service.checkLogsRequiringReview();

      expect(logger.debug).toHaveBeenCalledWith(
        'Checking for logs requiring review - not yet implemented',
      );
    });

    it('sollte nichts tun wenn deaktiviert', async () => {
      mockConfigService.get.mockReturnValueOnce(false);

      const disabledService = new AuditLogSchedulerService(
        mockBatchService as any,
        mockConfigService as any,
      );

      await disabledService.checkLogsRequiringReview();

      expect(logger.debug).not.toHaveBeenCalledWith(
        'Checking for logs requiring review - not yet implemented',
      );
    });
  });

  describe('triggerRetentionPolicy', () => {
    it('sollte Retention-Policy manuell auslösen', async () => {
      mockBatchService.applyRetentionPolicy.mockResolvedValue(25);

      const result = await service.triggerRetentionPolicy();

      expect(result).toBe(25);
      expect(logger.info).toHaveBeenCalledWith('Manually triggering retention policy');
      expect(mockBatchService.applyRetentionPolicy).toHaveBeenCalled();
    });
  });

  describe('triggerStatisticsGeneration', () => {
    it('sollte Statistik-Generierung manuell auslösen', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');
      const mockStatistics = [{ period: '2024-01-01', total: 100 }];

      mockBatchService.getAggregatedStatistics.mockResolvedValue(mockStatistics);

      const result = await service.triggerStatisticsGeneration(startDate, endDate, 'day');

      expect(result).toEqual(mockStatistics);
      expect(logger.info).toHaveBeenCalledWith(
        'Manually triggering statistics generation',
        expect.objectContaining({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy: 'day',
        }),
      );
      expect(mockBatchService.getAggregatedStatistics).toHaveBeenCalledWith(
        startDate,
        endDate,
        'day',
      );
    });

    it('sollte Standard-Gruppierung verwenden', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      mockBatchService.getAggregatedStatistics.mockResolvedValue([]);

      await service.triggerStatisticsGeneration(startDate, endDate);

      expect(mockBatchService.getAggregatedStatistics).toHaveBeenCalledWith(
        startDate,
        endDate,
        'day',
      );
    });
  });

  describe('logMaintenanceOperation', () => {
    it('sollte Wartungsoperationen loggen', async () => {
      // Diese Methode ist privat, also testen wir sie indirekt durch applyRetentionPolicy
      mockBatchService.applyRetentionPolicy.mockResolvedValue(10);

      await service.applyRetentionPolicy();

      expect(logger.info).toHaveBeenCalledWith(
        'Maintenance operation logged',
        expect.objectContaining({
          operation: 'retention-policy',
          metadata: expect.objectContaining({
            deletedCount: 10,
            success: true,
          }),
        }),
      );
    });
  });
});
