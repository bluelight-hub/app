import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditModule } from '../audit.module';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueue } from '../queues/audit-log.queue';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuthModule } from '../../auth/auth.module';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { CreateAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

/**
 * Integration-Tests für das vollständige Audit Logging System
 *
 * Diese Tests validieren:
 * - End-to-End Funktionalität zwischen allen Komponenten
 * - Datenintegrität durch alle Schichten
 * - Queue-Processing und Batch-Operations
 * - Cache-Integration
 * - Error Recovery und Resilience
 * - Performance unter realistischen Bedingungen
 */
describe.skip('Audit System Integration Tests - NEEDS UPDATE FOR NEW INTERCEPTOR', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let auditLogService: AuditLogService;
  let auditLogQueue: AuditLogQueue;
  let _auditInterceptor: AuditInterceptor;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        BullModule.forRoot({
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            db: parseInt(process.env.REDIS_DB || '1'), // Use different DB for tests
          },
        }),
        AuditModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    auditLogService = moduleFixture.get<AuditLogService>(AuditLogService);
    auditLogQueue = moduleFixture.get<AuditLogQueue>(AuditLogQueue);
    _auditInterceptor = moduleFixture.get<AuditInterceptor>(AuditInterceptor);

    await app.init();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    await prismaService.auditLog.deleteMany({
      where: {
        OR: [
          { action: { startsWith: 'integration-test-' } },
          { resource: 'integration-test' },
          { userEmail: { contains: 'integration-test' } },
        ],
      },
    });
  }

  describe('End-to-End Audit Log Creation', () => {
    it('should create audit log through service and persist to database', async () => {
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.CREATE,
        action: 'integration-test-create',
        resource: 'integration-test',
        resourceId: 'test-resource-1',
        userId: 'test-user-1',
        userEmail: 'integration-test@example.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
        httpMethod: 'POST',
        endpoint: '/api/integration-test',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        metadata: {
          test: 'integration-data',
          nested: {
            value: 'nested-test',
          },
        },
      };

      // Create audit log through service
      const createdLog = await auditLogService.create(auditData);

      // Verify log was created with correct data
      expect(createdLog).toMatchObject({
        action: auditData.action,
        resource: auditData.resource,
        userId: auditData.userId,
        userEmail: auditData.userEmail,
        severity: auditData.severity,
        success: auditData.success,
      });

      // Verify log exists in database
      const dbLog = await prismaService.auditLog.findUnique({
        where: { id: createdLog.id },
      });

      expect(dbLog).toBeTruthy();
      expect(dbLog!.metadata).toEqual(auditData.metadata);
    });

    it('should handle audit log creation with minimal required data', async () => {
      const minimalData: CreateAuditLogDto = {
        actionType: AuditActionType.READ,
        action: 'integration-test-minimal',
        resource: 'integration-test',
      };

      const createdLog = await auditLogService.create(minimalData);

      expect(createdLog).toMatchObject({
        action: minimalData.action,
        resource: minimalData.resource,
        severity: AuditSeverity.MEDIUM, // Default value
        success: true, // Default value
      });

      // Verify in database
      const dbLog = await prismaService.auditLog.findUnique({
        where: { id: createdLog.id },
      });

      expect(dbLog).toBeTruthy();
    });
  });

  describe('Queue Integration', () => {
    it('should process audit logs through queue successfully', async () => {
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.UPDATE,
        action: 'integration-test-queue',
        resource: 'integration-test',
        resourceId: 'queue-test-1',
        userId: 'queue-user',
        userEmail: 'queue-integration-test@example.com',
        severity: AuditSeverity.HIGH,
        success: true,
      };

      // Add to queue
      const _jobId = await auditLogQueue.addAuditLog(auditData);
      expect(_jobId).toBeTruthy();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify log was created through queue processing
      const logs = await auditLogService.findMany({
        action: 'integration-test-queue',
      });

      expect(logs.items).toHaveLength(1);
      expect(logs.items[0]).toMatchObject({
        action: auditData.action,
        resource: auditData.resource,
        userId: auditData.userId,
      });
    });

    it('should handle bulk queue operations efficiently', async () => {
      const bulkData = Array.from({ length: 50 }, (_, i) => ({
        actionType: AuditActionType.BULK_OPERATION,
        action: `integration-test-bulk-${i}`,
        resource: 'integration-test',
        resourceId: `bulk-resource-${i}`,
        userId: `bulk-user-${i}`,
        userEmail: `bulk-integration-test-${i}@example.com`,
        severity: AuditSeverity.LOW,
        success: true,
      }));

      // Add bulk data to queue
      const jobIds = await Promise.all(bulkData.map((data) => auditLogQueue.addAuditLog(data)));
      expect(jobIds).toHaveLength(50); // Individual jobs for each audit log

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify all logs were created
      const logs = await auditLogService.findMany({
        search: 'integration-test-bulk',
        limit: 100,
      });

      expect(logs.items).toHaveLength(50);
    });

    it('should retry failed queue jobs', async () => {
      // Create audit data that will initially fail
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.DELETE,
        action: 'integration-test-retry',
        resource: 'integration-test',
        resourceId: 'retry-test',
        userId: 'retry-user',
        userEmail: 'retry-integration-test@example.com',
        severity: AuditSeverity.CRITICAL,
        success: false,
        errorMessage: 'Simulated failure for retry test',
      };

      // Temporarily mock database to fail then succeed
      let callCount = 0;
      const originalCreate = prismaService.auditLog.create;
      prismaService.auditLog.create = jest.fn().mockImplementation((args) => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Simulated database error');
        }
        return originalCreate.call(prismaService.auditLog, args);
      });

      const _jobId = await auditLogQueue.addAuditLog(auditData);

      // Wait for retries and final success
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Restore original function
      prismaService.auditLog.create = originalCreate;

      // Verify log was eventually created
      const logs = await auditLogService.findMany({
        action: 'integration-test-retry',
      });

      expect(logs.items).toHaveLength(1);
      expect(callCount).toBeGreaterThan(1); // Verify retries occurred
    });
  });

  describe('Cache Integration', () => {
    it('should cache query results and invalidate on create', async () => {
      // Create some initial data
      await auditLogService.create({
        actionType: AuditActionType.READ,
        action: 'integration-test-cache-1',
        resource: 'integration-test',
        userId: 'cache-user',
        userEmail: 'cache-integration-test@example.com',
      });

      // First query - cache miss
      const startTime1 = Date.now();
      const result1 = await auditLogService.findMany({
        search: 'integration-test-cache',
      });
      const duration1 = Date.now() - startTime1;

      expect(result1.items).toHaveLength(1);

      // Second query - should be cached
      const startTime2 = Date.now();
      const result2 = await auditLogService.findMany({
        search: 'integration-test-cache',
      });
      const duration2 = Date.now() - startTime2;

      expect(result2.items).toHaveLength(1);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache hit should be faster

      // Create new log - should invalidate cache
      await auditLogService.create({
        actionType: AuditActionType.CREATE,
        action: 'integration-test-cache-2',
        resource: 'integration-test',
        userId: 'cache-user',
        userEmail: 'cache-integration-test@example.com',
      });

      // Query again - should reflect new data
      const result3 = await auditLogService.findMany({
        search: 'integration-test-cache',
      });

      expect(result3.items).toHaveLength(2);
    });

    it('should cache statistics and invalidate appropriately', async () => {
      // Create test data
      const auditLogs = Array.from({ length: 10 }, (_, i) => ({
        actionType: i % 2 === 0 ? AuditActionType.CREATE : AuditActionType.UPDATE,
        action: `integration-test-stats-${i}`,
        resource: 'integration-test',
        resourceId: `stats-${i}`,
        userId: 'stats-user',
        userEmail: 'stats-integration-test@example.com',
        severity: i % 3 === 0 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
        success: i % 5 !== 0,
      }));

      for (const logData of auditLogs) {
        await auditLogService.create(logData);
      }

      // Get statistics - first call
      const stats1 = await auditLogService.getStatistics({});
      expect(stats1.totalLogs).toBeGreaterThanOrEqual(10);

      // Get statistics again - should be cached
      const startTime = Date.now();
      const stats2 = await auditLogService.getStatistics({});
      const duration = Date.now() - startTime;

      expect(stats2).toEqual(stats1);
      expect(duration).toBeLessThan(50); // Should be very fast from cache
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Temporarily disconnect from database
      await prismaService.$disconnect();

      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.SYSTEM_CONFIG,
        action: 'integration-test-db-failure',
        resource: 'integration-test',
        userId: 'error-user',
        userEmail: 'error-integration-test@example.com',
        success: false,
        errorMessage: 'Database connection test',
      };

      // Should not throw error, should queue for later processing
      expect(async () => {
        await auditLogQueue.addAuditLog(auditData);
      }).not.toThrow();

      // Reconnect
      await prismaService.$connect();

      // Wait for queue to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify log was eventually created
      const logs = await auditLogService.findMany({
        action: 'integration-test-db-failure',
      });

      expect(logs.items).toHaveLength(1);
    });

    it('should handle queue service failures', async () => {
      const auditData: CreateAuditLogDto = {
        actionType: AuditActionType.CREATE,
        action: 'integration-test-queue-failure',
        resource: 'integration-test',
        userId: 'queue-failure-user',
        userEmail: 'queue-failure-integration-test@example.com',
      };

      // Mock queue failure
      const originalAddAuditLog = auditLogQueue.addAuditLog;
      auditLogQueue.addAuditLog = jest.fn().mockRejectedValue(new Error('Queue service down'));

      // Should fallback to direct database creation
      const result = await auditLogService.create(auditData);
      expect(result).toBeTruthy();

      // Verify log exists in database
      const dbLog = await prismaService.auditLog.findUnique({
        where: { id: result.id },
      });
      expect(dbLog).toBeTruthy();

      // Restore original function
      auditLogQueue.addAuditLog = originalAddAuditLog;
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain referential integrity across operations', async () => {
      const userId = 'integrity-test-user';
      const resourceId = 'integrity-test-resource';

      // Create multiple related logs
      const logs = await Promise.all([
        auditLogService.create({
          actionType: AuditActionType.CREATE,
          action: 'integration-test-create-resource',
          resource: 'integration-test',
          resourceId,
          userId,
          userEmail: 'integrity-integration-test@example.com',
        }),
        auditLogService.create({
          actionType: AuditActionType.UPDATE,
          action: 'integration-test-update-resource',
          resource: 'integration-test',
          resourceId,
          userId,
          userEmail: 'integrity-integration-test@example.com',
        }),
        auditLogService.create({
          actionType: AuditActionType.DELETE,
          action: 'integration-test-delete-resource',
          resource: 'integration-test',
          resourceId,
          userId,
          userEmail: 'integrity-integration-test@example.com',
        }),
      ]);

      // Verify all logs have consistent data
      logs.forEach((log) => {
        expect(log.userId).toBe(userId);
        expect(log.resourceId).toBe(resourceId);
      });

      // Query by resource ID should return all logs
      const resourceLogs = await auditLogService.findMany({
        resourceId,
      });

      expect(resourceLogs.items).toHaveLength(3);
    });

    it('should validate audit log data constraints', async () => {
      // Test with invalid data
      const invalidData = {
        actionType: 'INVALID_ACTION' as any,
        action: '', // Empty action
        resource: 'integration-test',
      };

      await expect(auditLogService.create(invalidData)).rejects.toThrow();
    });

    it('should handle concurrent access correctly', async () => {
      const userId = 'concurrent-test-user';
      const promises = [];

      // Create 20 concurrent audit logs
      for (let i = 0; i < 20; i++) {
        promises.push(
          auditLogService.create({
            actionType: AuditActionType.BULK_OPERATION,
            action: `integration-test-concurrent-${i}`,
            resource: 'integration-test',
            resourceId: `concurrent-${i}`,
            userId,
            userEmail: 'concurrent-integration-test@example.com',
          }),
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(20);
      results.forEach((result) => {
        expect(result.id).toBeTruthy();
        expect(result.userId).toBe(userId);
      });

      // Verify in database
      const dbLogs = await auditLogService.findMany({
        userId,
        search: 'integration-test-concurrent',
        limit: 25,
      });

      expect(dbLogs.items).toHaveLength(20);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with high-volume operations', async () => {
      const startTime = Date.now();
      const promises = [];

      // Create 100 audit logs
      for (let i = 0; i < 100; i++) {
        promises.push(
          auditLogService.create({
            actionType: AuditActionType.BULK_OPERATION,
            action: `integration-test-performance-${i}`,
            resource: 'integration-test',
            resourceId: `perf-${i}`,
            userId: `perf-user-${i % 5}`, // 5 different users
            userEmail: `perf-integration-test-${i % 5}@example.com`,
            severity: i % 3 === 0 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
            success: i % 10 !== 0, // 10% failure rate
          }),
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max

      // Verify all logs were created
      const logs = await auditLogService.findMany({
        search: 'integration-test-performance',
        limit: 150,
      });

      expect(logs.items).toHaveLength(100);

      // Test query performance with large dataset
      const queryStartTime = Date.now();
      const filteredLogs = await auditLogService.findMany({
        actionType: AuditActionType.BULK_OPERATION,
        severity: AuditSeverity.HIGH,
        success: true,
        limit: 50,
      });
      const queryDuration = Date.now() - queryStartTime;

      expect(queryDuration).toBeLessThan(1000); // 1 second max
      expect(filteredLogs.items.length).toBeGreaterThan(0);
    });
  });

  describe('Archive and Cleanup Operations', () => {
    it('should archive old logs correctly', async () => {
      // Create old logs
      const oldLogs = await Promise.all([
        auditLogService.create({
          actionType: AuditActionType.CREATE,
          action: 'integration-test-old-1',
          resource: 'integration-test',
          userId: 'archive-user',
          userEmail: 'archive-integration-test@example.com',
        }),
        auditLogService.create({
          actionType: AuditActionType.UPDATE,
          action: 'integration-test-old-2',
          resource: 'integration-test',
          userId: 'archive-user',
          userEmail: 'archive-integration-test@example.com',
        }),
      ]);

      // Manually update timestamps to be old
      await Promise.all(
        oldLogs.map((log) =>
          prismaService.auditLog.update({
            where: { id: log.id },
            data: {
              timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
            },
          }),
        ),
      );

      // Archive logs older than 30 days
      const archivedCount = await auditLogService.archiveOldLogs(30);
      expect(archivedCount).toBe(2);

      // Verify logs are marked as archived
      const archivedLogs = await prismaService.auditLog.findMany({
        where: {
          id: { in: oldLogs.map((log) => log.id) },
        },
      });

      archivedLogs.forEach((log) => {
        expect(log.archivedAt).toBeTruthy();
      });
    });

    it('should delete archived logs correctly', async () => {
      // Create and archive logs
      const log = await auditLogService.create({
        actionType: AuditActionType.DELETE,
        action: 'integration-test-delete-archive',
        resource: 'integration-test',
        userId: 'delete-user',
        userEmail: 'delete-integration-test@example.com',
      });

      // Archive the log
      await prismaService.auditLog.update({
        where: { id: log.id },
        data: {
          archivedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
        },
      });

      // Delete archived logs older than 365 days
      const deletedCount = await auditLogService.deleteArchivedLogs(365);
      expect(deletedCount).toBe(1);

      // Verify log is deleted
      const deletedLog = await prismaService.auditLog.findUnique({
        where: { id: log.id },
      });
      expect(deletedLog).toBeNull();
    });
  });
});
