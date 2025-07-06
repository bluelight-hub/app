import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuditedAction, useAuditedDataChange, useAuditedForm, useAuditedNavigation } from '@/hooks';
import { useAuditLogger } from '@/utils/audit.ts';

// Mock the audit logger
vi.mock('../../utils/audit', () => ({
  useAuditLogger: vi.fn(() => ({
    log: vi.fn(),
    logSuccess: vi.fn(),
    logError: vi.fn(),
    logDataChange: vi.fn(),
  })),
}));

vi.mock('@bluelight-hub/shared/client', () => ({
  CreateAuditLogDtoActionTypeEnum: {
    Read: 'READ',
    Create: 'CREATE',
    Update: 'UPDATE',
    Delete: 'DELETE',
    Login: 'LOGIN',
    Logout: 'LOGOUT',
    FailedLogin: 'FAILED_LOGIN',
    PermissionChange: 'PERMISSION_CHANGE',
    RoleChange: 'ROLE_CHANGE',
    BulkOperation: 'BULK_OPERATION',
    SystemConfig: 'SYSTEM_CONFIG',
    Export: 'EXPORT',
    Import: 'IMPORT',
    Approve: 'APPROVE',
    Reject: 'REJECT',
    Block: 'BLOCK',
    Unblock: 'UNBLOCK',
    Restore: 'RESTORE',
    Backup: 'BACKUP',
  },
  CreateAuditLogDtoSeverityEnum: {
    Low: 'LOW',
    Medium: 'MEDIUM',
    High: 'HIGH',
    Critical: 'CRITICAL',
    Error: 'ERROR',
  },
  Configuration: vi.fn().mockImplementation(function (config) {
    return {
      basePath: config?.basePath || '',
      fetchApi: config?.fetchApi || fetch,
      middleware: config?.middleware || [],
      ...config,
    };
  }),
}));

describe('useAuditedAction', () => {
  it('should log successful action execution', async () => {
    const mockAction = vi.fn().mockResolvedValue({ id: '123', name: 'Test' });
    const mockAudit = {
      logSuccess: vi.fn(),
      logError: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() =>
      useAuditedAction(mockAction, {
        action: 'create-item',
        resource: 'items',
      }),
    );

    await act(async () => {
      const response = await result.current('arg1', 'arg2');
      expect(response).toEqual({ id: '123', name: 'Test' });
    });

    expect(mockAction).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockAudit.logSuccess).toHaveBeenCalledWith(
      'create-item',
      'items',
      expect.objectContaining({
        action: 'create-item',
        resource: 'items',
        metadata: expect.objectContaining({
          result: { id: '123' },
        }),
      }),
    );
  });

  it('should log errors when action fails', async () => {
    const error = new Error('Action failed');
    const mockAction = vi.fn().mockRejectedValue(error);
    const mockAudit = {
      logSuccess: vi.fn(),
      logError: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() =>
      useAuditedAction(mockAction, {
        action: 'delete-item',
        resource: 'items',
      }),
    );

    await act(async () => {
      await expect(result.current('arg1')).rejects.toThrow('Action failed');
    });

    expect(mockAudit.logError).toHaveBeenCalledWith(
      'delete-item',
      'items',
      error,
      expect.objectContaining({
        action: 'delete-item',
        resource: 'items',
      }),
    );
  });

  it('should support dynamic audit context', async () => {
    const mockAction = vi.fn().mockResolvedValue('success');
    const mockAudit = {
      logSuccess: vi.fn(),
      logError: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() =>
      useAuditedAction(mockAction, (args) => ({
        action: `process-${args[0]}`,
        resource: args[1] || 'default',
      })),
    );

    await act(async () => {
      await result.current('task', 'queue');
    });

    expect(mockAudit.logSuccess).toHaveBeenCalledWith('process-task', 'queue', expect.any(Object));
  });
});

describe('useAuditedForm', () => {
  it('should audit form submissions', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockAudit = {
      logSuccess: vi.fn(),
      logError: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() => useAuditedForm('users', 'create', mockSubmit));

    const formData = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'USER',
    };

    await act(async () => {
      await result.current(formData);
    });

    expect(mockSubmit).toHaveBeenCalledWith(formData);
    expect(mockAudit.logSuccess).toHaveBeenCalledWith(
      'form-submit-create',
      'users',
      expect.objectContaining({
        metadata: expect.objectContaining({
          duration: expect.any(Number),
          formFields: ['name', 'email', 'role'],
        }),
      }),
    );
  });

  it('should handle form submission errors', async () => {
    const error = new Error('Validation failed');
    const mockSubmit = vi.fn().mockRejectedValue(error);
    const mockAudit = {
      logSuccess: vi.fn(),
      logError: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() => useAuditedForm('users', 'update', mockSubmit));

    await act(async () => {
      await expect(result.current({ name: 'Jane' })).rejects.toThrow('Validation failed');
    });

    expect(mockAudit.logError).toHaveBeenCalledWith(
      'form-submit-update',
      'users',
      error,
      expect.objectContaining({
        metadata: expect.objectContaining({
          formFields: ['name'],
        }),
      }),
    );
  });
});

describe('useAuditedNavigation', () => {
  it('should log navigation events', async () => {
    const mockAudit = {
      log: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() => useAuditedNavigation());

    await act(async () => {
      await result.current.logNavigation('/dashboard', '/home');
    });

    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'navigate',
        resource: 'navigation',
        metadata: expect.objectContaining({
          to: '/dashboard',
          from: '/home',
          timestamp: expect.any(String),
        }),
      }),
    );
  });
});

describe('useAuditedDataChange', () => {
  it('should log data changes', async () => {
    const mockAudit = {
      logDataChange: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() => useAuditedDataChange('users', 'user-123'));

    const oldData = { name: 'John', email: 'john@old.com' };
    const newData = { name: 'John Doe', email: 'john@new.com' };

    await act(async () => {
      await result.current.logDataChange('update-profile', oldData, newData);
    });

    expect(mockAudit.logDataChange).toHaveBeenCalledWith(
      'update-profile',
      'users',
      'user-123',
      oldData,
      newData,
      undefined,
    );
  });

  it('should log data changes with additional context', async () => {
    const mockAudit = {
      logDataChange: vi.fn(),
    };
    (useAuditLogger as any).mockReturnValue(mockAudit);

    const { result } = renderHook(() => useAuditedDataChange('settings', 'app-settings'));

    const oldData = { theme: 'light' };
    const newData = { theme: 'dark' };
    const additionalContext = {
      sensitiveData: false,
      compliance: ['GDPR'],
    };

    await act(async () => {
      await result.current.logDataChange('change-theme', oldData, newData, additionalContext);
    });

    expect(mockAudit.logDataChange).toHaveBeenCalledWith(
      'change-theme',
      'settings',
      'app-settings',
      oldData,
      newData,
      additionalContext,
    );
  });
});
