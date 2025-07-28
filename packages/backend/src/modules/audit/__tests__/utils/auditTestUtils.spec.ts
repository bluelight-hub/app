import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import {
  buildAuditEntryMatcher,
  createTestAuditLog,
  createTestAuditLogs,
  waitForAuditProcessing,
  assertAuditLog,
  createMockAuditService,
  createMockAuditQueue,
  AuditTestScenarios,
  extractAuditLogsFromDb,
  cleanupTestAuditLogs,
  verifyAuditLogCreated,
} from './auditTestUtils';

// Mock the logger to prevent console output in tests
jest.mock('@/logger/consola.logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuditTestUtils', () => {
  describe('buildAuditEntryMatcher', () => {
    it('should build matcher with all fields', () => {
      const config = {
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
        resourceId: 'user-123',
        userId: 'admin-456',
        userEmail: 'admin@test.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
        httpMethod: 'POST',
        endpoint: '/users',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        errorMessage: null,
        statusCode: 201,
        metadata: { custom: 'data' },
      };

      const matcher = buildAuditEntryMatcher(config);

      expect(matcher).toEqual({
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
        resourceId: 'user-123',
        userId: 'admin-456',
        userEmail: 'admin@test.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
        httpMethod: 'POST',
        endpoint: '/users',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        errorMessage: null,
        statusCode: 201,
        metadata: expect.objectContaining({ custom: 'data' }),
      });
    });

    it('should omit undefined fields', () => {
      const config = {
        actionType: AuditActionType.READ,
        success: true,
      };

      const matcher = buildAuditEntryMatcher(config);

      expect(matcher).toEqual({
        actionType: AuditActionType.READ,
        success: true,
      });
      expect(matcher).not.toHaveProperty('action');
      expect(matcher).not.toHaveProperty('resource');
    });

    it('should handle metadata with expect.objectContaining', () => {
      const config = {
        metadata: { foo: 'bar', nested: { value: 123 } },
      };

      const matcher = buildAuditEntryMatcher(config);

      expect(matcher.metadata).toEqual(
        expect.objectContaining({ foo: 'bar', nested: { value: 123 } }),
      );
    });

    it('should handle additional fields via rest spread', () => {
      const config = {
        actionType: AuditActionType.UPDATE,
        customField: 'customValue',
        anotherField: 42,
      };

      const matcher = buildAuditEntryMatcher(config);

      expect(matcher).toEqual({
        actionType: AuditActionType.UPDATE,
        customField: 'customValue',
        anotherField: 42,
      });
    });
  });

  describe('createTestAuditLog', () => {
    it('should create audit log with defaults', () => {
      const log = createTestAuditLog();

      expect(log).toMatchObject({
        actionType: AuditActionType.READ,
        action: 'test-action',
        resource: 'test-resource',
        severity: AuditSeverity.LOW,
        success: true,
        userId: 'test-user-id',
        userEmail: 'test@example.com',
      });
      expect(log.id).toMatch(/^test-\d+-/);
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('should override defaults with provided values', () => {
      const overrides = {
        actionType: AuditActionType.DELETE,
        severity: AuditSeverity.HIGH,
        userEmail: 'custom@example.com',
      };

      const log = createTestAuditLog(overrides);

      expect(log).toMatchObject(overrides);
      expect(log.action).toBe('test-action'); // Default value preserved
    });
  });

  describe('createTestAuditLogs', () => {
    it('should create multiple audit logs', () => {
      const logs = createTestAuditLogs(3);

      expect(logs).toHaveLength(3);
      logs.forEach((log, index) => {
        expect(log.id).toMatch(`test-${index}-`);
        expect(log.resourceId).toBe(`resource-${index}`);
      });
    });

    it('should apply overrides to all logs', () => {
      const overrides = {
        actionType: AuditActionType.UPDATE,
        userEmail: 'batch@example.com',
      };

      const logs = createTestAuditLogs(2, overrides);

      logs.forEach((log) => {
        expect(log.actionType).toBe(AuditActionType.UPDATE);
        expect(log.userEmail).toBe('batch@example.com');
      });
    });
  });

  describe('waitForAuditProcessing', () => {
    it('should wait for default duration', async () => {
      const start = Date.now();
      await waitForAuditProcessing();
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(200); // Increased tolerance for system load
    });

    it('should wait for custom duration', async () => {
      const start = Date.now();
      await waitForAuditProcessing(50);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThan(150); // Increased tolerance for CI environments
    });
  });

  describe('assertAuditLog', () => {
    it('should pass when audit log matches expected values', () => {
      const actual = createTestAuditLog({
        actionType: AuditActionType.CREATE,
        success: true,
      });

      expect(() => {
        assertAuditLog(actual, {
          actionType: AuditActionType.CREATE,
          success: true,
        });
      }).not.toThrow();
    });

    it('should throw when audit log is null', () => {
      expect(() => {
        assertAuditLog(null, {});
      }).toThrow('Audit log is null or undefined');
    });

    it('should throw when audit log is undefined', () => {
      expect(() => {
        assertAuditLog(undefined, {});
      }).toThrow();
    });

    it('should provide detailed error on mismatch', () => {
      const actual = createTestAuditLog({
        actionType: AuditActionType.READ,
        success: true,
      });

      expect(() => {
        assertAuditLog(actual, {
          actionType: AuditActionType.CREATE, // Different action type
          success: false, // Different success value
        });
      }).toThrow();
    });
  });

  describe('createMockAuditService', () => {
    it('should create mock with all required methods', () => {
      const mock = createMockAuditService();

      expect(mock.create).toBeDefined();
      expect(mock.findMany).toBeDefined();
      expect(mock.findOne).toBeDefined();
      expect(mock.getStatistics).toBeDefined();
      expect(mock.archiveOldLogs).toBeDefined();
      expect(mock.deleteArchivedLogs).toBeDefined();
      expect(mock.markAsReviewed).toBeDefined();

      // All should be jest mocks
      expect(jest.isMockFunction(mock.create)).toBe(true);
    });
  });

  describe('createMockAuditQueue', () => {
    it('should create mock with default resolved values', async () => {
      const mock = createMockAuditQueue();

      expect(await mock.addAuditLog()).toBe('job-id');
      expect(await mock.addBulkAuditLogs()).toEqual(['job-id']);
      expect(await mock.getQueueHealth()).toEqual({ status: 'healthy' });
      expect(await mock.getFailedJobs()).toEqual([]);
    });
  });

  describe('AuditTestScenarios', () => {
    it('should provide successful operation scenarios', () => {
      expect(AuditTestScenarios.successfulOperation.create).toMatchObject({
        actionType: AuditActionType.CREATE,
        severity: AuditSeverity.MEDIUM,
        success: true,
        statusCode: 201,
      });

      expect(AuditTestScenarios.successfulOperation.delete).toMatchObject({
        actionType: AuditActionType.DELETE,
        severity: AuditSeverity.HIGH,
        success: true,
        statusCode: 200,
      });
    });

    it('should provide failed operation scenarios', () => {
      // These are built by buildAuditEntryMatcher which filters out undefined values
      const unauthorizedScenario = AuditTestScenarios.failedOperation.unauthorized;
      expect(unauthorizedScenario.success).toBe(false);
      expect(unauthorizedScenario.statusCode).toBe(401);
      // severity might be undefined in the matcher

      const notFoundScenario = AuditTestScenarios.failedOperation.notFound;
      expect(notFoundScenario.success).toBe(false);
      expect(notFoundScenario.statusCode).toBe(404);
    });

    it('should provide sensitive operation scenarios', () => {
      expect(AuditTestScenarios.sensitiveOperation.permissionChange).toMatchObject({
        actionType: AuditActionType.PERMISSION_CHANGE,
        severity: AuditSeverity.HIGH,
        sensitiveData: true,
        requiresReview: true,
      });
    });
  });

  describe('extractAuditLogsFromDb', () => {
    it('should build query with all filters', async () => {
      const mockPrismaService = {
        auditLog: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      await extractAuditLogsFromDb(mockPrismaService, {
        endpoint: '/test',
        userEmail: 'test@example.com',
        action: 'test-action',
        resource: 'test-resource',
        limit: 10,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          endpoint: '/test',
          userEmail: 'test@example.com',
          action: 'test-action',
          resource: 'test-resource',
        },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should work with no filters', async () => {
      const mockPrismaService = {
        auditLog: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      await extractAuditLogsFromDb(mockPrismaService);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        take: undefined,
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('cleanupTestAuditLogs', () => {
    it('should delete with userEmail filter', async () => {
      const mockPrismaService = {
        auditLog: {
          deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
        },
      };

      const count = await cleanupTestAuditLogs(mockPrismaService, {
        userEmail: 'test@example.com',
      });

      expect(count).toBe(5);
      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: { userEmail: 'test@example.com' },
      });
    });

    it('should delete with testPrefix filter', async () => {
      const mockPrismaService = {
        auditLog: {
          deleteMany: jest.fn().mockResolvedValue({ count: 10 }),
        },
      };

      const count = await cleanupTestAuditLogs(mockPrismaService, {
        testPrefix: 'test-',
      });

      expect(count).toBe(10);
      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ action: { startsWith: 'test-' } }, { resourceId: { startsWith: 'test-' } }],
        },
      });
    });
  });

  describe('verifyAuditLogCreated', () => {
    it('should return audit log when found immediately', async () => {
      const expectedLog = createTestAuditLog();
      const mockPrismaService = {
        auditLog: {
          findMany: jest.fn().mockResolvedValue([expectedLog]),
        },
      };

      const result = await verifyAuditLogCreated(mockPrismaService, {
        actionType: AuditActionType.READ,
        success: true,
      });

      expect(result).toEqual(expectedLog);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledTimes(1);
    });

    it('should retry when log not found initially', async () => {
      const expectedLog = createTestAuditLog();
      const mockPrismaService = {
        auditLog: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([expectedLog]),
        },
      };

      const result = await verifyAuditLogCreated(
        mockPrismaService,
        {
          actionType: AuditActionType.READ,
          success: true,
        },
        3,
        10,
      );

      expect(result).toEqual(expectedLog);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockPrismaService = {
        auditLog: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      await expect(
        verifyAuditLogCreated(
          mockPrismaService,
          {
            actionType: AuditActionType.READ,
          },
          2,
          10,
        ),
      ).rejects.toThrow('Audit log not found after retries');

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
