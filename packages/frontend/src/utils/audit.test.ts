import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { auditLogger, AuditActionType } from './audit';
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

  describe('Client-side logging disabled', () => {
    it('should not send logs to backend when client-side logging is disabled', async () => {
      const context = {
        action: 'test-action',
        resource: 'test-resource',
        actionType: AuditActionType.CREATE,
      };

      await auditLogger.log(context);

      // Wait for batch timer
      vi.advanceTimersByTime(5000);

      // Should not call API
      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();

      // Should log debug message about disabled logging
      expect(logger.debug).toHaveBeenCalledWith(
        'Client-side audit logging disabled, logs discarded',
        expect.objectContaining({
          reason: 'Audit logs should be created server-side',
        }),
      );
    });

    it('should clear legacy failed logs from localStorage', () => {
      // Set up legacy failed logs
      const legacyLogs = [
        {
          action: 'legacy-action',
          resource: 'legacy-resource',
          timestamp: new Date().toISOString(),
        },
      ];
      localStorage.setItem('bluelight_audit_failed_logs', JSON.stringify(legacyLogs));

      // Create new instance to trigger restoration
      auditLogger['restoreFailedLogs']();

      // Should clear the logs
      expect(localStorage.getItem('bluelight_audit_failed_logs')).toBeNull();

      // Should log info about clearing
      expect(logger.info).toHaveBeenCalledWith(
        'Cleared legacy failed audit logs from local storage',
        expect.objectContaining({
          count: 1,
          reason: 'Client-side audit logging disabled',
        }),
      );
    });
  });

  describe('log methods still create contexts', () => {
    it('logSuccess should create proper context but not send', async () => {
      await auditLogger.logSuccess('success-action', 'success-resource', {
        metadata: { custom: 'data' },
      });

      vi.advanceTimersByTime(5000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Client-side audit logging disabled, logs discarded',
        expect.any(Object),
      );
    });

    it('logError should create proper context but not send', async () => {
      const error = new Error('Test error');
      await auditLogger.logError('error-action', 'error-resource', error);

      // Error logs would normally be sent immediately, but now they shouldn't
      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Client-side audit logging disabled, logs discarded',
        expect.any(Object),
      );
    });

    it('logSecurity should create proper context but not send', async () => {
      await auditLogger.logSecurity('security-action', 'security-resource', {
        metadata: { threat: 'suspicious' },
      });

      // Security logs would normally be sent immediately, but now they shouldn't
      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Client-side audit logging disabled, logs discarded',
        expect.any(Object),
      );
    });

    it('logDataChange should create proper context but not send', async () => {
      await auditLogger.logDataChange(
        'data-action',
        'data-resource',
        '123',
        { field1: 'old', field2: 'old' },
        { field1: 'new', field2: 'new' },
        { metadata: { entityId: '123' } },
      );

      vi.advanceTimersByTime(5000);

      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Client-side audit logging disabled, logs discarded',
        expect.any(Object),
      );
    });
  });

  describe('batch processing disabled', () => {
    it('should not accumulate logs in batch', async () => {
      // Send multiple logs
      for (let i = 0; i < 10; i++) {
        await auditLogger.log({
          action: `action-${i}`,
          resource: 'resource',
          actionType: AuditActionType.CREATE,
        });
      }

      vi.advanceTimersByTime(5000);

      // Should not call API at all
      expect(api.auditLogs.auditLogControllerCreateBatchV1).not.toHaveBeenCalled();
    });

    it('should not persist logs on window unload', () => {
      // Add some logs
      auditLogger.log({
        action: 'test-action',
        resource: 'test-resource',
        actionType: AuditActionType.CREATE,
      });

      // Trigger unload event
      window.dispatchEvent(new Event('beforeunload'));

      // Should not persist to localStorage
      expect(localStorage.getItem('bluelight_audit_failed_logs')).toBeNull();
    });
  });

  describe('getInstance', () => {
    it('should always return the same instance', () => {
      const instance1 = auditLogger;
      const instance2 = auditLogger;
      expect(instance1).toBe(instance2);
    });
  });
});
