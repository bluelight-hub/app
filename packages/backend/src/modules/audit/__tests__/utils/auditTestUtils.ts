import { AuditActionType, AuditLog, AuditSeverity } from '@prisma/generated/prisma/client';
import { logger } from '@/logger/consola.logger';

/**
 * Test utilities for Audit module
 * Provides helper functions and matchers for testing audit functionality
 */

/**
 * Partial audit entry type for matching
 */
export type PartialAuditEntry = Partial<AuditLog> & {
  metadata?: Record<string, any>;
};

/**
 * Build a matcher object for audit log entries
 * Helps with DRY testing by providing a consistent way to match audit logs
 *
 * @param config Partial audit entry configuration
 * @returns Matcher object for use with expect().toMatchObject()
 */
export function buildAuditEntryMatcher(config: PartialAuditEntry) {
  const {
    actionType,
    action,
    resource,
    resourceId,
    userId,
    userEmail,
    severity,
    success,
    httpMethod,
    endpoint,
    ipAddress,
    userAgent,
    errorMessage,
    statusCode,
    metadata,
    ...rest
  } = config;

  const matcher: any = {};

  // Add defined fields to matcher
  if (actionType !== undefined) matcher.actionType = actionType;
  if (action !== undefined) matcher.action = action;
  if (resource !== undefined) matcher.resource = resource;
  if (resourceId !== undefined) matcher.resourceId = resourceId;
  if (userId !== undefined) matcher.userId = userId;
  if (userEmail !== undefined) matcher.userEmail = userEmail;
  if (severity !== undefined) matcher.severity = severity;
  if (success !== undefined) matcher.success = success;
  if (httpMethod !== undefined) matcher.httpMethod = httpMethod;
  if (endpoint !== undefined) matcher.endpoint = endpoint;
  if (ipAddress !== undefined) matcher.ipAddress = ipAddress;
  if (userAgent !== undefined) matcher.userAgent = userAgent;
  if (errorMessage !== undefined) matcher.errorMessage = errorMessage;
  if (statusCode !== undefined) matcher.statusCode = statusCode;

  // Handle metadata separately as it's often nested
  if (metadata !== undefined) {
    matcher.metadata = expect.objectContaining(metadata);
  }

  // Add any additional fields
  Object.assign(matcher, rest);

  return matcher;
}

/**
 * Create a test audit log entry with defaults
 * Useful for creating test data quickly
 *
 * @param overrides Fields to override the defaults
 * @returns Complete audit log entry
 */
export function createTestAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  const defaults: AuditLog = {
    id: `test-${Date.now()}-${Math.random()}`,
    actionType: AuditActionType.READ,
    action: 'test-action',
    resource: 'test-resource',
    resourceId: null,
    severity: AuditSeverity.LOW,
    success: true,
    errorMessage: null,
    duration: 50,
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    userRole: 'USER',
    sessionId: null,
    requestId: null,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    endpoint: '/test',
    httpMethod: 'GET',
    statusCode: 200,
    oldValues: null,
    newValues: null,
    affectedFields: [],
    metadata: {},
    compliance: [],
    sensitiveData: false,
    requiresReview: false,
    impersonatedBy: null,
    reviewedBy: null,
    reviewedAt: null,
    retentionPeriod: null,
    archivedAt: null,
    timestamp: new Date(),
  };

  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Create multiple test audit logs
 *
 * @param count Number of logs to create
 * @param overrides Fields to override in all logs
 * @returns Array of audit log entries
 */
export function createTestAuditLogs(count: number, overrides: Partial<AuditLog> = {}): AuditLog[] {
  return Array.from({ length: count }, (_, index) =>
    createTestAuditLog({
      ...overrides,
      id: `test-${index}-${Date.now()}`,
      resourceId: `resource-${index}`,
    }),
  );
}

/**
 * Wait for async audit processing
 * Standard delay for waiting for audit logs to be processed
 *
 * @param ms Milliseconds to wait (default: 100)
 */
export async function waitForAuditProcessing(ms: number = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert audit log matches expected values
 * Provides better error messages than toMatchObject
 *
 * @param actual Actual audit log
 * @param expected Expected values
 */
export function assertAuditLog(
  actual: AuditLog | null | undefined,
  expected: PartialAuditEntry,
): void {
  expect(actual).toBeDefined();

  if (!actual) {
    throw new Error('Audit log is null or undefined');
  }

  const matcher = buildAuditEntryMatcher(expected);

  try {
    expect(actual).toMatchObject(matcher);
  } catch (error) {
    // Provide more detailed error message
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    const missingKeys = expectedKeys.filter((key) => !(key in actual));
    const extraKeys = actualKeys.filter((key) => !(key in expected));

    logger.error('Audit log assertion failed:');
    if (missingKeys.length > 0) {
      logger.error('Missing keys:', missingKeys);
    }
    if (extraKeys.length > 0) {
      logger.error('Extra keys:', extraKeys);
    }
    logger.error('Expected:', expected);
    logger.error('Actual:', actual);

    throw error;
  }
}

/**
 * Create a mock audit service for testing
 */
export function createMockAuditService() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    getStatistics: jest.fn(),
    archiveOldLogs: jest.fn(),
    deleteArchivedLogs: jest.fn(),
    markAsReviewed: jest.fn(),
  };
}

/**
 * Create a mock audit queue for testing
 */
export function createMockAuditQueue() {
  return {
    addAuditLog: jest.fn().mockResolvedValue('job-id'),
    addBulkAuditLogs: jest.fn().mockResolvedValue(['job-id']),
    getQueueHealth: jest.fn().mockResolvedValue({ status: 'healthy' }),
    clean: jest.fn(),
    getFailedJobs: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Common audit test scenarios
 */
export const AuditTestScenarios = {
  /**
   * Test data for successful operations
   */
  successfulOperation: {
    create: buildAuditEntryMatcher({
      actionType: AuditActionType.CREATE,
      severity: AuditSeverity.MEDIUM,
      success: true,
      statusCode: 201,
    }),
    update: buildAuditEntryMatcher({
      actionType: AuditActionType.UPDATE,
      severity: AuditSeverity.MEDIUM,
      success: true,
      statusCode: 200,
    }),
    delete: buildAuditEntryMatcher({
      actionType: AuditActionType.DELETE,
      severity: AuditSeverity.HIGH,
      success: true,
      statusCode: 200,
    }),
    read: buildAuditEntryMatcher({
      actionType: AuditActionType.READ,
      severity: AuditSeverity.LOW,
      success: true,
      statusCode: 200,
    }),
  },

  /**
   * Test data for failed operations
   */
  failedOperation: {
    unauthorized: buildAuditEntryMatcher({
      success: false,
      severity: AuditSeverity.ERROR,
      statusCode: 401,
    }),
    forbidden: buildAuditEntryMatcher({
      success: false,
      severity: AuditSeverity.ERROR,
      statusCode: 403,
    }),
    notFound: buildAuditEntryMatcher({
      success: false,
      severity: AuditSeverity.ERROR,
      statusCode: 404,
    }),
    validationError: buildAuditEntryMatcher({
      success: false,
      severity: AuditSeverity.ERROR,
      statusCode: 400,
    }),
  },

  /**
   * Test data for sensitive operations
   */
  sensitiveOperation: {
    permissionChange: buildAuditEntryMatcher({
      actionType: AuditActionType.PERMISSION_CHANGE,
      severity: AuditSeverity.HIGH,
      sensitiveData: true,
      requiresReview: true,
    }),
    roleChange: buildAuditEntryMatcher({
      actionType: AuditActionType.ROLE_CHANGE,
      severity: AuditSeverity.HIGH,
      sensitiveData: true,
      requiresReview: true,
    }),
    login: buildAuditEntryMatcher({
      actionType: AuditActionType.LOGIN,
      severity: AuditSeverity.LOW,
      sensitiveData: true,
    }),
  },
};

/**
 * Extract audit logs from test database
 * Helper for integration tests
 */
export async function extractAuditLogsFromDb(
  prismaService: any,
  filters: {
    endpoint?: string;
    userEmail?: string;
    action?: string;
    resource?: string;
    limit?: number;
  } = {},
): Promise<AuditLog[]> {
  const where: any = {};

  if (filters.endpoint) where.endpoint = filters.endpoint;
  if (filters.userEmail) where.userEmail = filters.userEmail;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;

  return prismaService.auditLog.findMany({
    where,
    take: filters.limit,
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Clean up test audit logs
 */
export async function cleanupTestAuditLogs(
  prismaService: any,
  filters: {
    userEmail?: string;
    resource?: string;
    testPrefix?: string;
  } = {},
): Promise<number> {
  const where: any = {};

  if (filters.userEmail) {
    where.userEmail = filters.userEmail;
  }

  if (filters.resource) {
    where.resource = filters.resource;
  }

  if (filters.testPrefix) {
    where.OR = [
      { action: { startsWith: filters.testPrefix } },
      { resourceId: { startsWith: filters.testPrefix } },
    ];
  }

  const result = await prismaService.auditLog.deleteMany({ where });
  return result.count;
}

/**
 * Verify audit log was created with retry logic
 * Useful for tests with async processing
 */
export async function verifyAuditLogCreated(
  prismaService: any,
  expectedValues: PartialAuditEntry,
  maxRetries: number = 5,
  retryDelay: number = 100,
): Promise<AuditLog> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const logs = await extractAuditLogsFromDb(prismaService, {
        endpoint: expectedValues.endpoint,
        userEmail: expectedValues.userEmail,
        limit: 1,
      });

      if (logs.length > 0) {
        assertAuditLog(logs[0], expectedValues);
        return logs[0];
      }
    } catch (error) {
      lastError = error as Error;
    }

    await waitForAuditProcessing(retryDelay);
  }

  throw lastError || new Error('Audit log not found after retries');
}
