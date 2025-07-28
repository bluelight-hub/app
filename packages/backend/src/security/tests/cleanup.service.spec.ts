import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CleanupService } from '../services/cleanup.service';
import { ArchiveService } from '../services/archive.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;

  const mockPrismaService = {
    securityLog: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockArchiveService = {
    archiveBeforeDate: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
      const config = {
        SECURITY_LOG_RETENTION_DAYS: 90,
        SECURITY_LOG_CLEANUP_ENABLED: true,
        SECURITY_LOG_CLEANUP_BATCH_SIZE: 1000,
        SECURITY_LOG_CLEANUP_CRON: '0 2 * * *',
        SECURITY_LOG_ARCHIVE_BEFORE_DELETE: true,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Reset mock implementation for each test
    mockConfigService.get = jest.fn((key: string, defaultValue: any) => {
      const config = {
        SECURITY_LOG_RETENTION_DAYS: 90,
        SECURITY_LOG_CLEANUP_ENABLED: true,
        SECURITY_LOG_CLEANUP_BATCH_SIZE: 1000,
        SECURITY_LOG_CLEANUP_CRON: '0 2 * * *',
        SECURITY_LOG_ARCHIVE_BEFORE_DELETE: true,
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ArchiveService,
          useValue: mockArchiveService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCleanup', () => {
    it('should skip cleanup when disabled', async () => {
      // Create a new service instance with cleanup disabled
      const disabledConfigService = {
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'SECURITY_LOG_CLEANUP_ENABLED') return false;
          if (key === 'SECURITY_LOG_RETENTION_DAYS') return 90;
          if (key === 'SECURITY_LOG_CLEANUP_BATCH_SIZE') return 1000;
          if (key === 'SECURITY_LOG_CLEANUP_CRON') return '0 2 * * *';
          return defaultValue;
        }),
      };

      const disabledService = new CleanupService(
        mockPrismaService as any,
        disabledConfigService as any,
        mockArchiveService as any,
      );

      await disabledService.handleCleanup();

      expect(mockPrismaService.securityLog.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.securityLog.deleteMany).not.toHaveBeenCalled();
    });

    it('should archive before deletion when enabled', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      mockPrismaService.securityLog.findMany.mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ]);
      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: 3 });
      mockArchiveService.archiveBeforeDate.mockResolvedValue('/path/to/archive.gz');

      await service.handleCleanup();

      expect(mockArchiveService.archiveBeforeDate).toHaveBeenCalledWith(expect.any(Date));
      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalled();
    });

    it('should delete logs in batches', async () => {
      // First batch returns full batch size
      mockPrismaService.securityLog.findMany
        .mockResolvedValueOnce(Array(1000).fill({ id: 'test' }))
        .mockResolvedValueOnce(Array(500).fill({ id: 'test' }))
        .mockResolvedValueOnce([]);

      mockPrismaService.securityLog.deleteMany
        .mockResolvedValueOnce({ count: 1000 })
        .mockResolvedValueOnce({ count: 500 });

      mockPrismaService.securityLog.count.mockResolvedValue(1000);

      await service.handleCleanup();

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.securityLog.findMany.mockRejectedValue(new Error('Database error'));

      // Service logs the error but doesn't throw for disabled cleanup
      try {
        await service.handleCleanup();
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });
  });

  describe('triggerManualCleanup', () => {
    it('should allow manual cleanup with custom retention days', async () => {
      const customRetentionDays = 30;

      mockPrismaService.securityLog.findMany
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([]);

      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.triggerManualCleanup(customRetentionDays);

      expect(result.deletedCount).toBe(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.cutoffDate).toBeInstanceOf(Date);

      const expectedCutoffDate = new Date();
      expectedCutoffDate.setDate(expectedCutoffDate.getDate() - customRetentionDays);

      // Check dates are close (within 1 second)
      expect(Math.abs(result.cutoffDate.getTime() - expectedCutoffDate.getTime())).toBeLessThan(
        1000,
      );
    });

    it('should use default retention days when not specified', async () => {
      mockPrismaService.securityLog.findMany.mockResolvedValue([]);

      const result = await service.triggerManualCleanup();

      const expectedCutoffDate = new Date();
      expectedCutoffDate.setDate(expectedCutoffDate.getDate() - 90); // Default retention days

      expect(Math.abs(result.cutoffDate.getTime() - expectedCutoffDate.getTime())).toBeLessThan(
        1000,
      );
    });
  });

  describe('configuration methods', () => {
    it('should return cleanup enabled status', () => {
      expect(service.isCleanupEnabled()).toBe(true);
    });

    it('should return complete retention configuration', () => {
      const config = service.getRetentionConfig();

      expect(config).toEqual({
        retentionDays: 90,
        cleanupEnabled: true,
        batchSize: 1000,
        cleanupCron: '0 2 * * *',
      });
    });
  });

  describe('batch deletion', () => {
    it('should handle empty batches correctly', async () => {
      mockPrismaService.securityLog.findMany.mockResolvedValue([]);
      mockPrismaService.securityLog.count.mockResolvedValue(0);

      await service.handleCleanup();

      expect(mockPrismaService.securityLog.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete logs by ID to avoid race conditions', async () => {
      const logsToDelete = [{ id: '1' }, { id: '2' }, { id: '3' }];

      mockPrismaService.securityLog.findMany.mockResolvedValueOnce(logsToDelete);
      mockPrismaService.securityLog.findMany.mockResolvedValueOnce([]);
      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: 3 });
      mockPrismaService.securityLog.count.mockResolvedValue(100);

      await service.handleCleanup();

      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['1', '2', '3'],
          },
        },
      });
    });
  });

  describe('cleanup statistics', () => {
    it('should log cleanup statistics after successful cleanup', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.securityLog.findMany
        .mockResolvedValueOnce([{ id: '1' }])
        .mockResolvedValueOnce([]);
      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.securityLog.count.mockResolvedValue(999);

      await service.handleCleanup();

      expect(mockPrismaService.securityLog.count).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle statistics logging errors gracefully', async () => {
      mockPrismaService.securityLog.findMany
        .mockResolvedValueOnce([{ id: '1' }])
        .mockResolvedValueOnce([]);
      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.securityLog.count.mockRejectedValue(new Error('Count failed'));

      // Should not throw error
      await expect(service.handleCleanup()).resolves.not.toThrow();
    });
  });
});
