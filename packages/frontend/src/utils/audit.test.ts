import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { auditLogger, AuditActionType, AuditSeverity } from './audit';
import { api } from '../api';
import { logger } from './logger';

// Mock dependencies
vi.mock('../api', () => ({
  api: {
    auditLogs: {
      auditLogControllerCreateV1: vi.fn(),
      auditLogControllerCreateBatchV1: vi.fn(),
    },
  },
}));

vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        roles: ['USER'],
      },
      sessionId: 'test-session-id',
    })),
  },
}));

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }

    // Default mock implementation
    vi.mocked(api.auditLogs.auditLogControllerCreateBatchV1).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('log', () => {
    it('should enrich context with user information', async () => {
      const context = {
        action: 'test-action',
        resource: 'test-resource',
        actionType: AuditActionType.READ,
      };

      await auditLogger.log(context);

      // Fast forward to trigger batch send
      vi.advanceTimersByTime(5000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledWith({
        requestBody: expect.arrayContaining([
          expect.objectContaining({
            action: 'test-action',
            resource: 'test-resource',
            actionType: AuditActionType.READ,
            metadata: expect.stringContaining('test-user-id'),
          }),
        ]),
      });
    });

    it('should send critical logs immediately', async () => {
      const context = {
        action: 'critical-action',
        resource: 'critical-resource',
        actionType: AuditActionType.SECURITY,
        severity: AuditSeverity.CRITICAL,
      };

      await auditLogger.log(context);

      // Should be sent immediately without waiting
      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalled();
    });

    it('should batch non-critical logs', async () => {
      const context1 = {
        action: 'action-1',
        resource: 'resource-1',
        actionType: AuditActionType.READ,
      };

      const context2 = {
        action: 'action-2',
        resource: 'resource-2',
        actionType: AuditActionType.UPDATE,
      };

      await auditLogger.log(context1);
      await auditLogger.log(context2);

      // Should not be sent immediately
      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();

      // Fast forward to trigger batch send
      vi.advanceTimersByTime(5000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledTimes(1);
      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledWith({
        requestBody: expect.arrayContaining([
          expect.objectContaining({ action: 'action-1' }),
          expect.objectContaining({ action: 'action-2' }),
        ]),
      });
    });
  });

  describe('retry logic', () => {
    it('should retry failed batch sends with exponential backoff', async () => {
      // Mock API to fail twice then succeed
      let callCount = 0;
      vi.mocked(api.auditLogs.auditLogControllerCreateBatchV1).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve();
      });

      const context = {
        action: 'test-action',
        resource: 'test-resource',
        actionType: AuditActionType.READ,
      };

      await auditLogger.log(context);

      // Trigger initial send
      vi.advanceTimersByTime(5000);

      // Wait for first retry (1 second)
      await vi.advanceTimersByTimeAsync(1000);

      // Wait for second retry (2 seconds)
      await vi.advanceTimersByTimeAsync(2000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying audit log batch'),
        expect.any(Object),
      );
    });

    it('should persist failed logs to localStorage after max retries', async () => {
      // Mock API to always fail
      vi.mocked(api.auditLogs.auditLogControllerCreateBatchV1).mockRejectedValue(
        new Error('Persistent network error'),
      );

      const context = {
        action: 'failed-action',
        resource: 'failed-resource',
        actionType: AuditActionType.CREATE,
      };

      await auditLogger.log(context);

      // Trigger initial send
      vi.advanceTimersByTime(5000);

      // Wait for all retries
      await vi.advanceTimersByTimeAsync(10000);

      const storedLogs = localStorage.getItem('bluelight_audit_failed_logs');
      expect(storedLogs).toBeTruthy();

      const parsedLogs = JSON.parse(storedLogs!);
      expect(parsedLogs).toHaveLength(1);
      expect(parsedLogs[0]).toMatchObject({
        action: 'failed-action',
        resource: 'failed-resource',
      });
    });
  });

  describe('logSuccess', () => {
    it('should log successful actions with appropriate defaults', async () => {
      await auditLogger.logSuccess('success-action', 'success-resource', {
        metadata: { custom: 'data' },
      });

      vi.advanceTimersByTime(5000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledWith({
        requestBody: expect.arrayContaining([
          expect.objectContaining({
            action: 'success-action',
            resource: 'success-resource',
            actionType: AuditActionType.READ,
            metadata: expect.stringContaining('"custom":"data"'),
          }),
        ]),
      });
    });
  });

  describe('logError', () => {
    it('should log errors with high severity', async () => {
      const error = new Error('Test error');

      await auditLogger.logError('error-action', 'error-resource', error);

      // Wait a tick for async operations
      await vi.runAllTimersAsync();

      // Error logs should be sent immediately
      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledWith({
        requestBody: expect.arrayContaining([
          expect.objectContaining({
            action: 'error-action',
            resource: 'error-resource',
            actionType: AuditActionType.ERROR,
            metadata: expect.stringContaining('userAgent'),
          }),
        ]),
      });
    });
  });

  describe('logSecurity', () => {
    it('should log security events with high severity and sensitive flag', async () => {
      await auditLogger.logSecurity('security-action', 'security-resource');

      // Wait a tick for async operations
      await vi.runAllTimersAsync();

      // Security logs should be sent immediately
      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledWith({
        requestBody: expect.arrayContaining([
          expect.objectContaining({
            action: 'security-action',
            resource: 'security-resource',
            actionType: AuditActionType.SECURITY,
          }),
        ]),
      });
    });
  });

  describe('logDataChange', () => {
    it('should log data changes with affected fields', async () => {
      const oldValues = { name: 'old', age: 25 };
      const newValues = { name: 'new', age: 25 };

      await auditLogger.logDataChange('update-user', 'user', '123', oldValues, newValues);

      vi.advanceTimersByTime(5000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).toHaveBeenCalledWith({
        requestBody: expect.arrayContaining([
          expect.objectContaining({
            action: 'update-user',
            resource: 'user',
            resourceId: '123',
            actionType: AuditActionType.UPDATE,
            oldValues: JSON.stringify(oldValues),
            newValues: JSON.stringify(newValues),
          }),
        ]),
      });
    });
  });

  describe('local storage persistence', () => {
    it('should persist failed logs to localStorage on window unload', async () => {
      // Mock API to always fail
      vi.mocked(api.auditLogs.auditLogControllerCreateBatchV1).mockRejectedValue(
        new Error('Network error'),
      );

      const context = {
        action: 'unload-action',
        resource: 'unload-resource',
        actionType: AuditActionType.CREATE,
      };

      await auditLogger.log(context);

      // Trigger initial send and let it fail
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      // Simulate window unload
      const unloadEvent = new Event('beforeunload');
      window.dispatchEvent(unloadEvent);

      const storedLogs = localStorage.getItem('bluelight_audit_failed_logs');
      expect(storedLogs).toBeTruthy();

      const parsedLogs = JSON.parse(storedLogs!);
      expect(parsedLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'unload-action',
            resource: 'unload-resource',
          }),
        ]),
      );
    });
  });
});
