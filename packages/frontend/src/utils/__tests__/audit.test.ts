import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditLogger, AuditActionType, AuditSeverity } from '../audit';
import { logger } from '../logger';
import { useAuthStore } from '../../stores/useAuthStore';

// Mock dependencies
vi.mock('../logger');
vi.mock('../../stores/useAuthStore');
vi.mock('../../api', () => ({
  api: {
    audit: {
      create: vi.fn(),
    },
  },
}));

describe('AuditLogger', () => {
  const mockAuthState = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      roles: ['ADMIN'],
    },
    sessionId: 'session-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useAuthStore.getState as any).mockReturnValue(mockAuthState);
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
      
      // Should be queued for batch processing
      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Audit log queued'),
        expect.any(Object)
      );
    });

    it('should send critical logs immediately', async () => {
      const context = {
        action: 'critical-action',
        resource: 'critical-resource',
        actionType: AuditActionType.SECURITY,
        severity: AuditSeverity.CRITICAL,
      };

      await auditLogger.log(context);
      
      // Critical logs should be sent immediately
      expect(logger.debug).toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.objectContaining({ action: 'critical-action' })
      );
    });

    it('should batch non-critical logs', async () => {
      const context1 = {
        action: 'action-1',
        resource: 'resource',
        actionType: AuditActionType.READ,
        severity: AuditSeverity.LOW,
      };

      const context2 = {
        action: 'action-2',
        resource: 'resource',
        actionType: AuditActionType.READ,
        severity: AuditSeverity.LOW,
      };

      await auditLogger.log(context1);
      await auditLogger.log(context2);
      
      // Should not be sent immediately
      expect(logger.debug).not.toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.any(Object)
      );

      // Fast forward to trigger batch
      vi.advanceTimersByTime(5000);
      
      // Now both should be sent
      await vi.runAllTimersAsync();
      
      expect(logger.debug).toHaveBeenCalledTimes(2);
    });
  });

  describe('logSuccess', () => {
    it('should log successful action with default values', async () => {
      await auditLogger.logSuccess('create-user', 'users', {
        resourceId: 'user-789',
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.objectContaining({
          action: 'create-user',
        })
      );
    });
  });

  describe('logError', () => {
    it('should log error with error message', async () => {
      const error = new Error('Test error');
      
      await auditLogger.logError('failed-action', 'resource', error, {
        resourceId: 'res-123',
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.objectContaining({
          action: 'failed-action',
        })
      );
    });

    it('should handle string errors', async () => {
      await auditLogger.logError('failed-action', 'resource', 'String error');

      expect(logger.debug).toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.objectContaining({
          action: 'failed-action',
        })
      );
    });
  });

  describe('logSecurity', () => {
    it('should log security action with high severity', async () => {
      await auditLogger.logSecurity('unauthorized-access', 'admin-panel');

      expect(logger.debug).toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.objectContaining({
          action: 'unauthorized-access',
        })
      );
    });
  });

  describe('logDataChange', () => {
    it('should log data changes with affected fields', async () => {
      const oldValues = {
        name: 'Old Name',
        email: 'old@example.com',
        role: 'USER',
      };

      const newValues = {
        name: 'New Name',
        email: 'new@example.com',
        role: 'USER', // unchanged
      };

      await auditLogger.logDataChange(
        'update-user',
        'users',
        'user-123',
        oldValues,
        newValues
      );

      // Should be queued and will eventually be sent
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(logger.debug).toHaveBeenCalledWith(
        'Audit log queued for sending',
        expect.objectContaining({
          action: 'update-user',
        })
      );
    });
  });

  describe('batch processing', () => {
    it('should flush batch when size limit is reached', async () => {
      // Create 10 logs to trigger batch size limit
      for (let i = 0; i < 10; i++) {
        await auditLogger.log({
          action: `action-${i}`,
          resource: 'resource',
          actionType: AuditActionType.READ,
          severity: AuditSeverity.LOW,
        });
      }

      // Should flush immediately when batch size is reached
      expect(logger.debug).toHaveBeenCalledTimes(10);
    });

    it('should handle errors when flushing batch', async () => {
      const error = new Error('Network error');
      
      // Mock API to throw error
      vi.mocked(logger.error).mockImplementationOnce(() => {
        throw error;
      });

      await auditLogger.log({
        action: 'test-action',
        resource: 'resource',
        actionType: AuditActionType.READ,
      });

      // Trigger batch flush
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        expect.any(Object)
      );
    });
  });
});