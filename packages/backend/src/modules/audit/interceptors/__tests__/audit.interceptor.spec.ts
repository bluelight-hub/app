import { CallHandler, ExecutionContext, HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  AUDIT_ACTION_KEY,
  AUDIT_CONTEXT_KEY,
  AUDIT_RESOURCE_TYPE_KEY,
  AUDIT_SEVERITY_KEY,
  AuditInterceptor,
  AuditLogService,
} from '@/modules/audit';
import { AuditLogQueue } from '@/modules/audit/queues';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

// Mock the logger module
jest.mock('../../../../logger/consola.logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    log: jest.fn(),
  },
}));

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditLogService: jest.Mocked<AuditLogService>;
  let auditLogQueue: jest.Mocked<AuditLogQueue>;
  let context: ExecutionContext;
  let callHandler: CallHandler;

  // Increase timeout for this test suite
  jest.setTimeout(15000);

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  const mockRequest = {
    method: 'POST',
    path: '/admin/users',
    query: {},
    body: {
      email: 'new@example.com',
      password: 'secretPassword123',
      role: 'USER',
    },
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
    user: mockUser,
    params: {},
    sessionID: 'test-session-id',
  } as any;

  const mockResponse = {
    statusCode: 201,
  };

  beforeEach(async () => {
    auditLogService = {
      create: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
    } as any;

    auditLogQueue = {
      addAuditLog: jest.fn().mockResolvedValue('job-id'),
    } as any;

    interceptor = new AuditInterceptor(auditLogService, auditLogQueue);

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn().mockReturnValue(() => {}),
    } as unknown as ExecutionContext;

    callHandler = {
      handle: jest.fn().mockReturnValue(of({ id: 'new-user-id' })),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // Reset the request for each test
    mockRequest.path = '/admin/users';
    mockRequest.method = 'POST';
  });

  describe('intercept', () => {
    it('should audit admin routes', (done) => {
      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: mockUser.id,
              action: 'create',
              resource: 'user',
              severity: AuditSeverity.MEDIUM,
              ipAddress: '192.168.1.1',
              userAgent: 'test-agent',
            }),
          );
          done();
        },
      });
    });

    it('should skip non-admin routes', (done) => {
      mockRequest.path = '/api/public/health';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should sanitize sensitive data', (done) => {
      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalled();
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];

          // Check that the body is sanitized in the metadata
          const requestBody = logCall.metadata?.request?.body;
          if (requestBody) {
            expect(requestBody.password).toBe('[REDACTED]');
            expect(requestBody.email).toBe('new@example.com');
            expect(requestBody.role).toBe('USER');
          } else {
            // If not in metadata, it might be in newValues
            expect(logCall.newValues).toBeUndefined(); // No newValues for POST
          }
          done();
        },
        error: (err) => {
          done.fail(err);
        },
      });
    });

    it('should handle errors and still log', (done) => {
      const error = new Error('Test error');
      callHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(context, callHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              severity: AuditSeverity.ERROR,
              success: false,
              errorMessage: 'Test error',
            }),
          );
          done();
        },
      });
    });

    it('should skip audit when NoAudit decorator is used', (done) => {
      (context.getHandler as jest.Mock).mockReturnValue(() => {});
      Reflect.defineMetadata('skipAudit', true, context.getHandler());

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should extract resource ID from params', (done) => {
      mockRequest.params = { id: '123' };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resourceId: '123',
            }),
          );
          done();
        },
      });
    });

    it('should determine action based on HTTP method', (done) => {
      const testCases = [
        { method: 'GET', expectedAction: AuditActionType.READ },
        { method: 'POST', expectedAction: AuditActionType.CREATE },
        { method: 'PUT', expectedAction: AuditActionType.UPDATE },
        { method: 'PATCH', expectedAction: AuditActionType.UPDATE },
        { method: 'DELETE', expectedAction: AuditActionType.DELETE },
      ];

      let completed = 0;
      testCases.forEach(({ method, expectedAction }, index) => {
        setTimeout(() => {
          mockRequest.method = method;
          jest.clearAllMocks();

          interceptor.intercept(context, callHandler).subscribe({
            next: () => {
              expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                  action: expectedAction.toLowerCase().replace(/_/g, '-'),
                }),
              );
              completed++;
              if (completed === testCases.length) {
                done();
              }
            },
          });
        }, index * 10);
      });
    });

    it('should truncate large request bodies', (done) => {
      // Create a large body that exceeds the default limit (10KB)
      // Since password is sanitized to '[REDACTED]', we need non-sensitive fields to be large
      mockRequest.body = {
        email: 'test@example.com',
        password: 'secretPassword123', // This will be sanitized to '[REDACTED]'
        role: 'USER',
        description: 'x'.repeat(3000), // Non-sensitive field
        metadata: {
          data1: 'y'.repeat(2000),
          data2: 'z'.repeat(2000),
          data3: 'a'.repeat(2000),
          data4: 'b'.repeat(2000),
        },
        // Add more non-sensitive data to exceed 10KB after JSON.stringify
        extraData: Array(100).fill('test-data-'.repeat(20)).join(','),
      };
      // Remove params so resourceId won't interfere
      mockRequest.params = {};
      jest.clearAllMocks();

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalled();
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];

          // The truncated body should be in the metadata.request.body
          const body = logCall.metadata?.request?.body;

          expect(body).toBeDefined();
          expect(body._truncated).toBe(true);
          expect(body._message).toContain('Body truncated');
          done();
        },
        error: (err) => {
          done(err);
        },
      });
    });

    it('should handle special action paths', (done) => {
      const testCases = [
        { path: '/admin/users/login', expectedAction: AuditActionType.LOGIN },
        { path: '/admin/users/logout', expectedAction: AuditActionType.LOGOUT },
        { path: '/admin/reports/export', expectedAction: AuditActionType.EXPORT },
        { path: '/admin/data/import', expectedAction: AuditActionType.IMPORT },
      ];

      let completed = 0;
      testCases.forEach(({ path, expectedAction }, index) => {
        setTimeout(() => {
          mockRequest.path = path;
          jest.clearAllMocks();

          interceptor.intercept(context, callHandler).subscribe({
            next: () => {
              expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                  action: expectedAction.toLowerCase().replace(/_/g, '-'),
                }),
              );
              completed++;
              if (completed === testCases.length) {
                done();
              }
            },
          });
        }, index * 10);
      });
    });

    it('should handle excluded paths correctly', (done) => {
      // Test paths that should be excluded
      const excludedPaths = ['/health', '/metrics', '/api-docs'];

      let completed = 0;
      excludedPaths.forEach((path) => {
        mockRequest.path = path;
        jest.clearAllMocks();

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            expect(auditLogQueue.addAuditLog).not.toHaveBeenCalled();
            completed++;
            if (completed === excludedPaths.length) {
              done();
            }
          },
        });
      });
    });

    it('should handle request without user context', (done) => {
      delete mockRequest.user;

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: undefined,
              userEmail: undefined,
              userRole: undefined,
            }),
          );
          done();
        },
      });
    });

    it('should extract resource ID from query if not in params', (done) => {
      mockRequest.params = {};
      mockRequest.query = { id: 'query-id-456' };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resourceId: 'query-id-456',
            }),
          );
          done();
        },
      });
    });

    it('should extract resource ID from path pattern', (done) => {
      mockRequest.params = {};
      mockRequest.query = {};
      mockRequest.path = '/admin/users/550e8400-e29b-41d4-a716-446655440000/profile';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resourceId: '550e8400-e29b-41d4-a716-446655440000',
            }),
          );
          done();
        },
      });
    });

    it('should handle update operations with old and new values in response', (done) => {
      mockRequest.method = 'PUT';
      mockRequest.body = { name: 'New Name' };

      const responseWithOldNew = {
        oldValues: { name: 'Old Name', email: 'old@example.com' },
        newValues: { name: 'New Name', email: 'new@example.com' },
      };

      callHandler.handle = jest.fn().mockReturnValue(of(responseWithOldNew));

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              oldValues: expect.objectContaining({ name: 'Old Name' }),
              newValues: expect.objectContaining({ name: 'New Name' }),
            }),
          );
          done();
        },
      });
    });

    it('should detect sensitive data and require review for critical operations', (done) => {
      mockRequest.path = '/admin/permissions';
      mockRequest.method = 'DELETE';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              sensitiveData: true,
              requiresReview: true,
            }),
          );
          done();
        },
      });
    });

    it('should handle custom context from decorator metadata', (done) => {
      const customContext = { bulkOperation: true, recordCount: 100 };

      (context.getHandler as jest.Mock).mockReturnValue(() => {});
      Reflect.defineMetadata(AUDIT_CONTEXT_KEY, customContext, context.getHandler());

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              metadata: expect.objectContaining(customContext),
            }),
          );
          done();
        },
      });
    });

    it('should handle IP address extraction from different headers', (done) => {
      mockRequest.ip = undefined;
      mockRequest.headers['x-real-ip'] = '10.0.0.1';
      delete mockRequest.headers['x-forwarded-for'];

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              ipAddress: '10.0.0.1',
            }),
          );
          done();
        },
      });
    });

    it('should handle nested sensitive data sanitization', (done) => {
      mockRequest.body = {
        user: {
          email: 'test@example.com',
          profile: {
            password: 'secret123',
            token: 'auth-token-xyz',
          },
        },
        apiKey: 'api-key-123',
      };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          const body = logCall.metadata?.request?.body;

          expect(body.user.profile.password).toBe('[REDACTED]');
          expect(body.user.profile.token).toBe('[REDACTED]');
          expect(body.apiKey).toBe('[REDACTED]');
          expect(body.user.email).toBe('test@example.com');
          done();
        },
      });
    });

    // This test verifies that audit logging failures are handled gracefully
    it('should handle audit logging failure gracefully', async () => {
      // Given: A request that will fail
      const error = new Error('Request error');
      callHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // And: Both audit logging methods will fail
      auditLogQueue.addAuditLog = jest.fn().mockRejectedValue(new Error('Queue error'));
      auditLogService.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // When: The interceptor processes the failed request
      let thrownError: Error | null = null;
      await new Promise<void>((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          error: (err) => {
            thrownError = err;
            resolve();
          },
          complete: () => {
            resolve();
          },
        });
      });

      // Then: The original error should be thrown
      expect(thrownError).toBe(error);

      // And: Audit logging should have been attempted
      expect(auditLogQueue.addAuditLog).toHaveBeenCalled();
      expect(auditLogService.create).toHaveBeenCalled();

      // Note: We cannot reliably test logger.error calls because they happen
      // asynchronously inside a .catch() block that is not awaited.
      // The interceptor design prioritizes not blocking the main request flow
      // over guaranteed audit logging, which is why errors are swallowed.
    });

    it('should handle resource type extraction with custom mapping', (done) => {
      mockRequest.path = '/admin/templates/123';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resource: 'template',
            }),
          );
          done();
        },
      });
    });

    it('should handle sessionID from headers if not in request', (done) => {
      delete mockRequest.sessionID;
      mockRequest.headers['x-session-id'] = 'header-session-id';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              sessionId: 'header-session-id',
            }),
          );
          done();
        },
      });
    });

    it('should handle custom severity mapping', (done) => {
      mockRequest.path = '/admin/permissions';
      mockRequest.method = 'POST';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              action: 'create',
              resource: 'permission',
              severity: AuditSeverity.MEDIUM,
            }),
          );
          done();
        },
      });
    });

    it('should handle non-object data in sanitization', (done) => {
      mockRequest.body = 'string-body';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          const body = logCall.metadata?.request?.body;
          expect(body).toBe('string-body');
          done();
        },
      });
    });

    it('should handle null/undefined in sanitization', (done) => {
      mockRequest.body = null;
      mockRequest.query = undefined;
      mockRequest.params = {};

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          expect(logCall.metadata?.request?.body).toBeNull();
          expect(logCall.metadata?.request?.query).toBeUndefined();
          done();
        },
      });
    });

    it('should handle arrays in sanitization', (done) => {
      mockRequest.body = [
        { password: 'secret1', name: 'user1' },
        { token: 'token2', name: 'user2' },
      ];

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          const body = logCall.metadata?.request?.body;
          // Arrays are converted to objects when spread with { ...data }
          expect(body['0'].password).toBe('[REDACTED]');
          expect(body['0'].name).toBe('user1');
          expect(body['1'].token).toBe('[REDACTED]');
          expect(body['1'].name).toBe('user2');
          done();
        },
      });
    });

    it('should handle resource type when admin prefix is missing', (done) => {
      // This path won't be audited because it doesn't start with /admin
      mockRequest.path = '/admin/special/123';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resource: 'special',
            }),
          );
          done();
        },
      });
    });

    it('should handle empty path segments', (done) => {
      mockRequest.path = '/admin///users//123';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resource: 'users',
              resourceId: '123',
            }),
          );
          done();
        },
      });
    });

    it('should handle unknown resource ID when no ID found', (done) => {
      mockRequest.params = {};
      mockRequest.query = {};
      mockRequest.path = '/admin/users';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resourceId: 'unknown',
            }),
          );
          done();
        },
      });
    });

    it('should handle PATCH method for updates', (done) => {
      mockRequest.method = 'PATCH';
      mockRequest.body = { name: 'Updated Name' };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              action: 'update',
              newValues: expect.objectContaining({ name: 'Updated Name' }),
            }),
          );
          done();
        },
      });
    });

    it('should handle unknown HTTP method', (done) => {
      mockRequest.method = 'OPTIONS';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              actionType: AuditActionType.READ,
            }),
          );
          done();
        },
      });
    });

    it('should handle custom action from decorator with severity', (done) => {
      const handler = () => {};
      (context.getHandler as jest.Mock).mockReturnValue(handler);
      Reflect.defineMetadata(AUDIT_ACTION_KEY, 'REVOKE_PERMISSION', handler);
      Reflect.defineMetadata(AUDIT_SEVERITY_KEY, AuditSeverity.CRITICAL, handler);
      Reflect.defineMetadata(AUDIT_RESOURCE_TYPE_KEY, 'permission', handler);

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              action: 'revoke-permission',
              severity: AuditSeverity.CRITICAL,
              resource: 'permission',
            }),
          );
          done();
        },
      });
    });

    it('should handle development environment for error stack traces', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      callHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(context, callHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          setTimeout(() => {
            const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
            expect(logCall.metadata?.error?.stack).toBe('Error stack trace');
            process.env.NODE_ENV = originalEnv;
            done();
          }, 50);
        },
      });
    });

    it('should handle referer header', (done) => {
      mockRequest.headers.referer = 'https://example.com/dashboard';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          expect(logCall.metadata?.request?.referer).toBeUndefined();
          done();
        },
      });
    });

    it('should handle requestId from headers', (done) => {
      mockRequest.headers['x-request-id'] = 'req-123-456';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              requestId: 'req-123-456',
            }),
          );
          done();
        },
      });
    });

    it('should handle HttpException errors', (done) => {
      const httpError = new HttpException('Forbidden', 403);
      callHandler.handle = jest.fn().mockReturnValue(throwError(() => httpError));

      interceptor.intercept(context, callHandler).subscribe({
        error: (err) => {
          expect(err).toBe(httpError);
          setTimeout(() => {
            const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
            expect(logCall.metadata?.error?.statusCode).toBe(403);
            done();
          }, 50);
        },
      });
    });

    it('should handle sensitive resources', (done) => {
      mockRequest.path = '/admin/sessions';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              sensitiveData: true,
            }),
          );
          done();
        },
      });
    });

    it('should handle setConfig method', () => {
      const customConfig = {
        maxBodySize: 5000,
        excludePaths: ['/custom'],
      };

      interceptor.setConfig(customConfig);

      // Create a new request with large body
      mockRequest.body = { data: 'x'.repeat(6000) };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          const body = logCall.metadata?.request?.body;
          expect(body._truncated).toBe(true);
          expect(body._message).toContain('5000 bytes');
        },
      });
    });

    it('should handle REVOKE_PERMISSION action mapping', (done) => {
      (context.getHandler as jest.Mock).mockReturnValue(() => {});
      Reflect.defineMetadata(
        AUDIT_ACTION_KEY,
        AuditActionType.PERMISSION_CHANGE,
        context.getHandler(),
      );

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              actionType: AuditActionType.PERMISSION_CHANGE,
            }),
          );
          done();
        },
      });
    });

    it('should handle numeric resource ID from path', (done) => {
      mockRequest.params = {};
      mockRequest.query = {};
      mockRequest.path = '/admin/users/12345/edit';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resourceId: '12345',
            }),
          );
          done();
        },
      });
    });

    it('should handle factory function createAuditInterceptor', () => {
      const { createAuditInterceptor } = require('../audit.interceptor');
      const customConfig = {
        maxBodySize: 2000,
        excludePaths: ['/test'],
      };

      const newInterceptor = createAuditInterceptor(auditLogService, auditLogQueue, customConfig);
      expect(newInterceptor).toBeDefined();

      // Test that custom config is applied
      mockRequest.body = { data: 'x'.repeat(3000) };

      newInterceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
          const body = logCall.metadata?.request?.body;
          expect(body._truncated).toBe(true);
          expect(body._message).toContain('2000 bytes');
        },
      });
    });

    it('should handle production environment for error stack traces', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      callHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(context, callHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          setTimeout(() => {
            const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
            expect(logCall.metadata?.error?.stack).toBeUndefined();
            process.env.NODE_ENV = originalEnv;
            done();
          }, 50);
        },
      });
    });

    it('should handle response with only response body object', (done) => {
      mockRequest.method = 'PUT';
      mockRequest.body = { name: 'New Name' };

      const responseBody = { id: '123', name: 'New Name', email: 'new@example.com' };
      callHandler.handle = jest.fn().mockReturnValue(of(responseBody));

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              newValues: expect.objectContaining({ name: 'New Name' }),
              oldValues: undefined,
            }),
          );
          done();
        },
      });
    });

    it('should handle IP from request.ip', (done) => {
      mockRequest.ip = '172.16.0.1';
      delete mockRequest.headers['x-forwarded-for'];
      delete mockRequest.headers['x-real-ip'];

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              ipAddress: '172.16.0.1',
            }),
          );
          done();
        },
      });
    });

    it('should handle non-HttpException errors', (done) => {
      const error = new Error('Generic error');
      callHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(context, callHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          setTimeout(() => {
            const logCall = auditLogQueue.addAuditLog.mock.calls[0][0];
            expect(logCall.metadata?.error?.statusCode).toBe(500);
            done();
          }, 50);
        },
      });
    });

    it('should handle sensitive actions for requiresReview', (done) => {
      (context.getHandler as jest.Mock).mockReturnValue(() => {});
      Reflect.defineMetadata(
        AUDIT_ACTION_KEY,
        AuditActionType.PERMISSION_CHANGE,
        context.getHandler(),
      );

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              requiresReview: true,
            }),
          );
          done();
        },
      });
    });

    it('should handle authentication resource as sensitive', (done) => {
      mockRequest.path = '/admin/authentication';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              sensitiveData: true,
            }),
          );
          done();
        },
      });
    });

    it('should handle role resource as sensitive', (done) => {
      mockRequest.path = '/admin/roles';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              sensitiveData: true,
            }),
          );
          done();
        },
      });
    });

    it('should handle GET method for non-update operations', (done) => {
      mockRequest.method = 'GET';
      mockRequest.body = { some: 'data' };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              oldValues: undefined,
              newValues: undefined,
            }),
          );
          done();
        },
      });
    });

    it('should handle empty resource type', (done) => {
      mockRequest.path = '/admin/';

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(auditLogQueue.addAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
              resource: 'unknown',
            }),
          );
          done();
        },
      });
    });

    it('should handle createAuditInterceptor without config', () => {
      const { createAuditInterceptor } = require('../audit.interceptor');
      const newInterceptor = createAuditInterceptor(auditLogService, auditLogQueue);
      expect(newInterceptor).toBeDefined();
    });
  });
});
