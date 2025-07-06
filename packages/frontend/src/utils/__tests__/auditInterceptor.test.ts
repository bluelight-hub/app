import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auditInterceptorMiddleware } from '../auditInterceptor';
import { auditLogger } from '../audit';
import { logger } from '../logger';

// Mock dependencies
vi.mock('../audit', () => ({
  auditLogger: {
    log: vi.fn(),
    logError: vi.fn(),
  },
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
}));

vi.mock('../logger');

describe('auditInterceptorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pre', () => {
    it('should add audit metadata to context', async () => {
      const context = {
        url: 'http://localhost:3000/api/users/123',
        init: { method: 'GET' },
      };

      const result = await auditInterceptorMiddleware.pre(context);

      expect(result).toHaveProperty('__auditStartTime');
      expect(result).toHaveProperty('__auditResource', 'users');
      expect(result).toHaveProperty('__auditResourceId', '123');
      expect(logger.debug).toHaveBeenCalledWith(
        'API request initiated',
        expect.objectContaining({
          url: context.url,
          method: 'GET',
          resource: 'users',
          resourceId: '123',
        }),
      );
    });

    it('should handle URLs without resource ID', async () => {
      const context = {
        url: 'http://localhost:3000/api/users',
        init: { method: 'POST' },
      };

      const result = await auditInterceptorMiddleware.pre(context);

      expect(result).toHaveProperty('__auditResource', 'users');
      expect((result as any).__auditResourceId).toBeUndefined();
    });

    it('should handle malformed URLs', async () => {
      const context = {
        url: 'not-a-valid-url',
        init: { method: 'GET' },
      };

      const result = await auditInterceptorMiddleware.pre(context);

      expect(result).toHaveProperty('__auditResource', 'unknown');
    });
  });

  describe('post', () => {
    it('should log successful requests', async () => {
      const context = {
        url: 'http://localhost:3000/api/users/123',
        init: { method: 'GET' },
        response: new Response(null, { status: 200, statusText: 'OK' }),
        __auditResource: 'users',
        __auditResourceId: '123',
        __auditStartTime: Date.now() - 100,
      };

      await auditInterceptorMiddleware.post(context);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'get-users',
          resource: 'users',
          resourceId: '123',
          httpMethod: 'GET',
          httpPath: '/api/users/123',
          metadata: expect.objectContaining({
            duration: expect.any(Number),
            statusCode: 200,
            statusText: 'OK',
            success: true,
          }),
        }),
      );
    });

    it('should log failed requests with error details', async () => {
      const errorResponse = {
        message: 'User not found',
      };

      const response = new Response(JSON.stringify(errorResponse), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'application/json' },
      });

      const context = {
        url: 'http://localhost:3000/api/users/999',
        init: { method: 'GET' },
        response,
        __auditResource: 'users',
        __auditResourceId: '999',
        __auditStartTime: Date.now() - 50,
      };

      await auditInterceptorMiddleware.post(context);

      expect(auditLogger.logError).toHaveBeenCalledWith(
        'get-users',
        'users',
        'User not found',
        expect.objectContaining({
          resourceId: '999',
          httpMethod: 'GET',
          metadata: expect.objectContaining({
            duration: expect.any(Number),
            statusCode: 404,
            success: false,
          }),
        }),
      );
    });

    it('should handle non-JSON error responses', async () => {
      const response = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'content-type': 'text/plain' },
      });

      const context = {
        url: 'http://localhost:3000/api/users',
        init: { method: 'POST' },
        response,
        __auditResource: 'users',
        __auditStartTime: Date.now(),
      };

      await auditInterceptorMiddleware.post(context);

      expect(auditLogger.logError).toHaveBeenCalledWith(
        'post-users',
        'users',
        'HTTP 500: Internal Server Error',
        expect.any(Object),
      );
    });

    it('should determine correct severity for auth endpoints', async () => {
      const context = {
        url: 'http://localhost:3000/api/auth/login',
        init: { method: 'POST' },
        response: new Response(null, { status: 200 }),
        __auditResource: 'auth',
        __auditStartTime: Date.now(),
      };

      await auditInterceptorMiddleware.post(context);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'auth',
          severity: 'HIGH',
        }),
      );
    });

    it('should determine correct severity for DELETE operations', async () => {
      const context = {
        url: 'http://localhost:3000/api/posts/123',
        init: { method: 'DELETE' },
        response: new Response(null, { status: 204 }),
        __auditResource: 'posts',
        __auditResourceId: '123',
        __auditStartTime: Date.now(),
      };

      await auditInterceptorMiddleware.post(context);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'MEDIUM',
        }),
      );
    });
  });
});
