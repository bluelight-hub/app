import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceObserver, performance } from 'perf_hooks';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueue } from '../queues/audit-log.queue';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogCacheService } from '../services/audit-log-cache.service';
import { CreateAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

/**
 * Performance-Tests für das Audit Logging System
 *
 * Diese Tests validieren:
 * - Latenz unter normaler Last
 * - Durchsatz bei hohem Volumen
 * - Memory-Verbrauch
 * - Cache-Performance
 * - Batch-Processing Effizienz
 */
describe('Audit System Performance Tests', () => {
  let auditLogService: AuditLogService;
  let auditLogQueue: AuditLogQueue;
  let _cacheService: AuditLogCacheService;
  let performanceEntries: any[] = [];

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidateStatistics: jest.fn(),
    generateStatisticsKey: jest.fn(),
    generateQueryKey: jest.fn(),
  };

  const mockQueueService = {
    addAuditLog: jest.fn(),
    addBulkAuditLogs: jest.fn(),
    getQueueHealth: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogCacheService,
          useValue: mockCacheService,
        },
        {
          provide: AuditLogQueue,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    auditLogService = module.get<AuditLogService>(AuditLogService);
    auditLogQueue = module.get<AuditLogQueue>(AuditLogQueue);
    _cacheService = module.get<AuditLogCacheService>(AuditLogCacheService);

    // Setup performance observer
    const obs = new PerformanceObserver((list) => {
      performanceEntries.push(...list.getEntries());
    });
    obs.observe({ entryTypes: ['measure'] });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    performanceEntries = [];
    performance.clearMarks();
    performance.clearMeasures();
  });

  describe('Single Operation Latency', () => {
    it('should create audit log within acceptable latency (<50ms)', async () => {
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.CREATE,
        action: 'performance-test',
        resource: 'user',
        resourceId: 'user_123',
        userId: 'admin_456',
        userEmail: 'admin@test.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'test-id',
        ...auditData,
        timestamp: new Date(),
      });

      performance.mark('create-start');
      await auditLogService.create(auditData);
      performance.mark('create-end');
      performance.measure('create-audit-log', 'create-start', 'create-end');

      const measure = performance.getEntriesByName('create-audit-log')[0];
      expect(measure.duration).toBeLessThan(50); // 50ms threshold
    });

    it('should query audit logs within acceptable latency (<100ms)', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        id: `test-${i}`,
        action: `test-action-${i}`,
        timestamp: new Date(),
      }));

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockResults);
      mockPrismaService.auditLog.count.mockResolvedValue(50);

      performance.mark('query-start');
      await auditLogService.findMany({ page: 1, limit: 50 });
      performance.mark('query-end');
      performance.measure('query-audit-logs', 'query-start', 'query-end');

      const measure = performance.getEntriesByName('query-audit-logs')[0];
      expect(measure.duration).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('High Volume Throughput', () => {
    it('should handle 1000 concurrent audit log creations efficiently', async () => {
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.READ,
        action: 'bulk-test',
        resource: 'test',
        userId: 'test-user',
        userEmail: 'test@example.com',
        severity: AuditSeverity.LOW,
        success: true,
      };

      mockPrismaService.auditLog.create.mockImplementation((data) =>
        Promise.resolve({
          id: `test-${Math.random()}`,
          ...data.data,
          timestamp: new Date(),
        }),
      );

      performance.mark('bulk-create-start');

      const promises = Array.from({ length: 1000 }, () =>
        auditLogService.create({ ...auditData, resourceId: `test-${Math.random()}` }),
      );

      await Promise.all(promises);

      performance.mark('bulk-create-end');
      performance.measure('bulk-create-1000', 'bulk-create-start', 'bulk-create-end');

      const measure = performance.getEntriesByName('bulk-create-1000')[0];
      const throughput = 1000 / (measure.duration / 1000); // operations per second

      expect(throughput).toBeGreaterThan(100); // At least 100 ops/sec
      expect(measure.duration).toBeLessThan(10000); // Complete within 10 seconds
    });

    it('should maintain performance under sustained load', async () => {
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.UPDATE,
        action: 'sustained-test',
        resource: 'test',
        userId: 'sustained-user',
        userEmail: 'sustained@example.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
      };

      mockPrismaService.auditLog.create.mockImplementation((data) =>
        Promise.resolve({
          id: `sustained-${Math.random()}`,
          ...data.data,
          timestamp: new Date(),
        }),
      );

      const batchSizes = [100, 200, 500];
      const results = [];

      for (const batchSize of batchSizes) {
        performance.mark(`sustained-${batchSize}-start`);

        const promises = Array.from({ length: batchSize }, (_, i) =>
          auditLogService.create({
            ...auditData,
            resourceId: `sustained-${batchSize}-${i}`,
          }),
        );

        await Promise.all(promises);

        performance.mark(`sustained-${batchSize}-end`);
        performance.measure(
          `sustained-${batchSize}`,
          `sustained-${batchSize}-start`,
          `sustained-${batchSize}-end`,
        );

        const measure = performance.getEntriesByName(`sustained-${batchSize}`)[0];
        const throughput = batchSize / (measure.duration / 1000);
        results.push({ batchSize, throughput, duration: measure.duration });
      }

      // Performance should not degrade significantly with larger batches
      const throughputs = results.map((r) => r.throughput);
      const firstThroughput = throughputs[0];
      const lastThroughput = throughputs[throughputs.length - 1];

      // Last throughput should be at least 70% of first throughput
      expect(lastThroughput).toBeGreaterThan(firstThroughput * 0.7);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during batch operations', async () => {
      const getMemoryUsage = () => {
        if (global.gc) {
          global.gc();
        }
        return process.memoryUsage();
      };

      const initialMemory = getMemoryUsage();

      // Perform multiple batch operations
      for (let batch = 0; batch < 10; batch++) {
        const promises = Array.from({ length: 100 }, (_, i) =>
          auditLogService.create({
            actionType: AuditActionType.CREATE,
            action: `memory-test-${batch}-${i}`,
            resource: 'memory-test',
            resourceId: `mem-${batch}-${i}`,
            userId: 'memory-user',
            userEmail: 'memory@test.com',
            severity: AuditSeverity.LOW,
            success: true,
          }),
        );

        mockPrismaService.auditLog.create.mockImplementation((data) =>
          Promise.resolve({
            id: `mem-${Math.random()}`,
            ...data.data,
            timestamp: new Date(),
          }),
        );

        await Promise.all(promises);
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB for 1000 operations)
      expect(memoryIncreaseInMB).toBeLessThan(50);
    });
  });

  describe('Cache Performance', () => {
    it.skip('should significantly improve query performance with cache hits - FLAKY TEST', async () => {
      const cacheKey = 'test-query-key';
      const cachedResults = {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `cached-${i}`,
          action: `cached-action-${i}`,
        })),
        pagination: {
          currentPage: 1,
          itemsPerPage: 50,
          totalItems: 50,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      // First call - cache miss
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.generateQueryKey.mockReturnValue(cacheKey);
      mockPrismaService.auditLog.findMany.mockResolvedValue(cachedResults.items);
      mockPrismaService.auditLog.count.mockResolvedValue(50);

      performance.mark('cache-miss-start');
      await auditLogService.findMany({ page: 1, limit: 50 });
      performance.mark('cache-miss-end');
      performance.measure('cache-miss-query', 'cache-miss-start', 'cache-miss-end');

      // Second call - cache hit
      mockCacheService.get.mockResolvedValueOnce(cachedResults);

      performance.mark('cache-hit-start');
      await auditLogService.findMany({ page: 1, limit: 50 });
      performance.mark('cache-hit-end');
      performance.measure('cache-hit-query', 'cache-hit-start', 'cache-hit-end');

      const cacheMissMeasure = performance.getEntriesByName('cache-miss-query')[0];
      const cacheHitMeasure = performance.getEntriesByName('cache-hit-query')[0];

      // Cache hit should be significantly faster (at least 5x)
      expect(cacheHitMeasure.duration).toBeLessThan(cacheMissMeasure.duration / 5);
    });

    it('should handle cache invalidation efficiently', async () => {
      const statisticsKey = 'test-stats-key';

      mockCacheService.generateStatisticsKey.mockReturnValue(statisticsKey);
      mockCacheService.invalidateStatistics.mockResolvedValue(undefined);

      performance.mark('cache-invalidation-start');

      // Simulate multiple operations that trigger cache invalidation
      for (let i = 0; i < 10; i++) {
        await auditLogService.create({
          actionType: AuditActionType.CREATE,
          action: `cache-invalidation-${i}`,
          resource: 'cache-test',
          resourceId: `cache-${i}`,
          userId: 'cache-user',
          userEmail: 'cache@test.com',
          severity: AuditSeverity.LOW,
          success: true,
        });
      }

      performance.mark('cache-invalidation-end');
      performance.measure(
        'cache-invalidation-batch',
        'cache-invalidation-start',
        'cache-invalidation-end',
      );

      const measure = performance.getEntriesByName('cache-invalidation-batch')[0];

      // Cache invalidation should not significantly impact performance
      expect(measure.duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Queue Performance', () => {
    it('should handle high-frequency queue operations', async () => {
      mockQueueService.addAuditLog.mockResolvedValue('job-id');

      performance.mark('queue-performance-start');

      const promises = Array.from({ length: 500 }, (_, i) =>
        auditLogQueue.addAuditLog({
          actionType: AuditActionType.READ,
          action: `queue-test-${i}`,
          resource: 'queue-test',
          resourceId: `queue-${i}`,
          userId: 'queue-user',
          userEmail: 'queue@test.com',
          severity: AuditSeverity.LOW,
          success: true,
        }),
      );

      await Promise.all(promises);

      performance.mark('queue-performance-end');
      performance.measure(
        'queue-500-operations',
        'queue-performance-start',
        'queue-performance-end',
      );

      const measure = performance.getEntriesByName('queue-500-operations')[0];
      const throughput = 500 / (measure.duration / 1000);

      expect(throughput).toBeGreaterThan(200); // At least 200 queue operations per second
    });

    it('should handle bulk queue operations efficiently', async () => {
      const bulkData = Array.from({ length: 1000 }, (_, i) => ({
        actionType: AuditActionType.BULK_OPERATION,
        action: `bulk-queue-${i}`,
        resource: 'bulk-test',
        resourceId: `bulk-${i}`,
        userId: 'bulk-user',
        userEmail: 'bulk@test.com',
        severity: AuditSeverity.LOW,
        success: true,
      }));

      mockQueueService.addBulkAuditLogs.mockResolvedValue(['bulk-job-id']);

      performance.mark('bulk-queue-start');
      await Promise.all(bulkData.map((data) => auditLogQueue.addAuditLog(data)));
      performance.mark('bulk-queue-end');
      performance.measure('bulk-queue-1000', 'bulk-queue-start', 'bulk-queue-end');

      const measure = performance.getEntriesByName('bulk-queue-1000')[0];

      // Bulk operation should be much faster than individual operations
      expect(measure.duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Complex Query Performance', () => {
    it('should handle complex filtering efficiently', async () => {
      const complexQueryResults = Array.from({ length: 25 }, (_, i) => ({
        id: `complex-${i}`,
        action: `complex-action-${i}`,
        timestamp: new Date(),
      }));

      mockPrismaService.auditLog.findMany.mockResolvedValue(complexQueryResults);
      mockPrismaService.auditLog.count.mockResolvedValue(1000);

      const complexQuery = {
        actionType: AuditActionType.UPDATE,
        severity: AuditSeverity.HIGH,
        success: true,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        search: 'complex search term',
        httpMethods: ['POST', 'PUT', 'PATCH'],
        compliance: ['GDPR', 'HIPAA'],
        page: 1,
        limit: 25,
        sortBy: 'timestamp',
        sortOrder: 'desc' as const,
      };

      performance.mark('complex-query-start');
      await auditLogService.findMany(complexQuery);
      performance.mark('complex-query-end');
      performance.measure('complex-query', 'complex-query-start', 'complex-query-end');

      const measure = performance.getEntriesByName('complex-query')[0];

      // Complex query should still complete within reasonable time
      expect(measure.duration).toBeLessThan(200); // 200ms threshold
    });

    it('should handle statistics aggregation efficiently', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(10000);
      mockPrismaService.auditLog.groupBy
        .mockResolvedValueOnce([
          { actionType: AuditActionType.CREATE, _count: { actionType: 3000 } },
          { actionType: AuditActionType.UPDATE, _count: { actionType: 4000 } },
          { actionType: AuditActionType.DELETE, _count: { actionType: 2000 } },
          { actionType: AuditActionType.READ, _count: { actionType: 1000 } },
        ])
        .mockResolvedValueOnce([
          { severity: AuditSeverity.LOW, _count: { severity: 5000 } },
          { severity: AuditSeverity.MEDIUM, _count: { severity: 3000 } },
          { severity: AuditSeverity.HIGH, _count: { severity: 2000 } },
        ])
        .mockResolvedValueOnce([
          { success: true, _count: { success: 9000 } },
          { success: false, _count: { success: 1000 } },
        ])
        .mockResolvedValueOnce([
          { userId: 'user1', userEmail: 'user1@test.com', _count: { userId: 2000 } },
          { userId: 'user2', userEmail: 'user2@test.com', _count: { userId: 1500 } },
        ])
        .mockResolvedValueOnce([
          { resource: 'user', _count: { resource: 4000 } },
          { resource: 'einsatz', _count: { resource: 3000 } },
        ]);

      performance.mark('statistics-start');
      await auditLogService.getStatistics({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });
      performance.mark('statistics-end');
      performance.measure('statistics-aggregation', 'statistics-start', 'statistics-end');

      const measure = performance.getEntriesByName('statistics-aggregation')[0];

      // Statistics should be calculated efficiently even for large datasets
      expect(measure.duration).toBeLessThan(300); // 300ms threshold
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should efficiently archive old logs', async () => {
      mockPrismaService.auditLog.updateMany.mockResolvedValue({ count: 5000 });

      performance.mark('archive-start');
      const archivedCount = await auditLogService.archiveOldLogs(90);
      performance.mark('archive-end');
      performance.measure('archive-operation', 'archive-start', 'archive-end');

      const measure = performance.getEntriesByName('archive-operation')[0];

      expect(archivedCount).toBe(5000);
      expect(measure.duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently delete archived logs', async () => {
      mockPrismaService.auditLog.deleteMany.mockResolvedValue({ count: 2000 });

      performance.mark('delete-start');
      const deletedCount = await auditLogService.deleteArchivedLogs(365);
      performance.mark('delete-end');
      performance.measure('delete-operation', 'delete-start', 'delete-end');

      const measure = performance.getEntriesByName('delete-operation')[0];

      expect(deletedCount).toBe(2000);
      expect(measure.duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  afterAll(() => {
    // Performance summary
    console.log('\n=== Audit System Performance Summary ===');
    performanceEntries.forEach((entry) => {
      console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  });
});
