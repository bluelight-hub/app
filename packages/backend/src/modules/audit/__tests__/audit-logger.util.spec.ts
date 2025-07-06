import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuditLoggerUtil, AuditLogInput } from '../utils/audit-logger.util';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueue } from '../queues/audit-log.queue';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/enums';

// Extend Request interface for testing
interface TestRequest extends Request {
  user?: any;
}

describe('AuditLoggerUtil', () => {
  let util: AuditLoggerUtil;
  let mockRequest: Partial<TestRequest>;

  const mockAuditLogService = {
    create: jest.fn(),
  };

  const mockAuditLogQueue = {
    addAuditLog: jest.fn().mockResolvedValue('job-id'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'AUDIT_USE_QUEUE') return false; // Disable queue for tests
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLoggerUtil,
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: AuditLogQueue,
          useValue: mockAuditLogQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    util = module.get<AuditLoggerUtil>(AuditLoggerUtil);

    mockRequest = {
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-request-id': 'req_test123',
      },
      originalUrl: '/api/v1/users',
      method: 'POST',
      user: {
        id: 'user_123',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        jti: 'session_456',
      },
      cookies: {},
      connection: { remoteAddress: '192.168.1.100' } as any,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should create audit log with extracted context', async () => {
      const input: AuditLogInput = {
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
        resourceId: 'user_new123',
        newValues: { name: 'New User', email: 'new@test.com' },
        affectedFields: ['name', 'email'],
      };

      const expectedAuditLog = { id: 'audit_123', ...input };
      mockAuditLogService.create.mockResolvedValue(expectedAuditLog);

      const result = await util.logAction(mockRequest as TestRequest, input);

      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        actionType: AuditActionType.CREATE,
        severity: AuditSeverity.MEDIUM,
        action: 'create-user',
        resource: 'user',
        resourceId: 'user_new123',

        // User context
        userId: 'user_123',
        userEmail: 'admin@test.com',
        userRole: UserRole.ADMIN,

        // Request context
        requestId: 'req_test123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        endpoint: '/api/v1/users',
        httpMethod: 'POST',
        sessionId: 'session_456',

        // Data context
        oldValues: undefined,
        newValues: { name: 'New User', email: 'new@test.com' },
        affectedFields: ['name', 'email'],
        metadata: undefined,

        // Result
        duration: undefined,
        success: true,
        errorMessage: undefined,
        statusCode: undefined,

        // Compliance
        compliance: ['GDPR', 'AUDIT'],
        sensitiveData: false,
        requiresReview: false,
        retentionPeriod: undefined,
      });
      expect(result).toEqual(expectedAuditLog);
    });

    it('should sanitize sensitive data', async () => {
      const input: AuditLogInput = {
        actionType: AuditActionType.UPDATE,
        action: 'update-user-password',
        resource: 'user',
        oldValues: { password: 'old_secret', name: 'User' },
        newValues: { password: 'new_secret', name: 'Updated User' },
      };

      await util.logAction(mockRequest as TestRequest, input);

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValues: { password: '[REDACTED]', name: 'User' },
          newValues: { password: '[REDACTED]', name: 'Updated User' },
        }),
      );
    });

    it('should handle missing user context gracefully', async () => {
      mockRequest.user = undefined;

      const input: AuditLogInput = {
        actionType: AuditActionType.READ,
        action: 'view-public-data',
        resource: 'public',
      };

      await util.logAction(mockRequest as TestRequest, input);

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
          userEmail: undefined,
          userRole: undefined,
        }),
      );
    });

    it('should not throw in production when audit logging fails', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockAuditLogService.create.mockRejectedValue(new Error('Database error'));

      const input: AuditLogInput = {
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
      };

      // Should not throw in production
      await expect(util.logAction(mockRequest as TestRequest, input)).resolves.toBeUndefined();

      process.env.NODE_ENV = originalEnv;

      // Reset mock for next tests
      mockAuditLogService.create.mockReset();
    });

    it('should throw in development when audit logging fails', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockAuditLogService.create.mockRejectedValue(new Error('Database error'));

      const input: AuditLogInput = {
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
      };

      await expect(util.logAction(mockRequest as TestRequest, input)).rejects.toThrow(
        'Database error',
      );

      process.env.NODE_ENV = originalEnv;

      // Reset mock for next tests
      mockAuditLogService.create.mockReset();
    });
  });

  describe('logLogin', () => {
    it('should log successful login', async () => {
      const userContext = {
        id: 'user_123',
        email: 'user@test.com',
        role: UserRole.USER,
      };

      await util.logLogin(mockRequest as TestRequest, userContext, true);

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.LOGIN,
          severity: AuditSeverity.LOW,
          action: 'user-login',
          resource: 'authentication',
          userId: 'user_123',
          userEmail: 'user@test.com',
          userRole: UserRole.USER,
          success: true,
          statusCode: 200,
          metadata: {
            loginAttempt: true,
            timestamp: expect.any(String),
          },
          compliance: ['AUDIT'],
        }),
      );
    });

    it('should log failed login with higher severity', async () => {
      const userContext = {
        email: 'user@test.com',
      };

      await util.logLogin(mockRequest as TestRequest, userContext, false, 'Invalid credentials');

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.LOGIN,
          severity: AuditSeverity.MEDIUM,
          success: false,
          errorMessage: 'Invalid credentials',
          statusCode: 401,
        }),
      );
    });
  });

  describe('logLogout', () => {
    it('should log user logout', async () => {
      const userContext = {
        id: 'user_123',
        email: 'user@test.com',
        role: UserRole.USER,
      };

      await util.logLogout(mockRequest as TestRequest, userContext);

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.LOGOUT,
          severity: AuditSeverity.LOW,
          action: 'user-logout',
          resource: 'authentication',
          userId: 'user_123',
          userEmail: 'user@test.com',
          userRole: UserRole.USER,
          success: true,
          statusCode: 200,
          metadata: {
            logoutEvent: true,
            timestamp: expect.any(String),
          },
          compliance: ['AUDIT'],
        }),
      );
    });
  });

  describe('logRoleChange', () => {
    it('should log role change with high severity', async () => {
      await util.logRoleChange(
        mockRequest as TestRequest,
        'target_user_456',
        'USER',
        'ADMIN',
        'admin_123',
      );

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.ROLE_CHANGE,
          severity: AuditSeverity.HIGH,
          action: 'role-change',
          resource: 'user',
          resourceId: 'target_user_456',
          oldValues: { role: 'USER' },
          newValues: { role: 'ADMIN' },
          affectedFields: ['role'],
          metadata: {
            roleChange: true,
            changedBy: 'admin_123',
            timestamp: expect.any(String),
          },
          requiresReview: true,
          compliance: ['AUDIT', 'GDPR'],
        }),
      );
    });
  });

  describe('logBulkOperation', () => {
    it('should log bulk operation with appropriate severity', async () => {
      await util.logBulkOperation(
        mockRequest as TestRequest,
        'bulk-create-users',
        'user',
        150,
        true,
        5000,
      );

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.BULK_OPERATION,
          severity: AuditSeverity.HIGH, // > 100 records
          action: 'bulk-create-users',
          resource: 'user',
          duration: 5000,
          success: true,
          metadata: {
            bulkOperation: true,
            recordCount: 150,
            batchId: expect.any(String),
            timestamp: expect.any(String),
          },
          requiresReview: false, // < 1000 records
        }),
      );
    });

    it('should require review for very large bulk operations', async () => {
      await util.logBulkOperation(
        mockRequest as TestRequest,
        'bulk-delete-records',
        'data',
        2000,
        true,
      );

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requiresReview: true, // > 1000 records
        }),
      );
    });

    it('should use medium severity for smaller operations', async () => {
      await util.logBulkOperation(
        mockRequest as TestRequest,
        'bulk-update-settings',
        'config',
        50,
        true,
      );

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: AuditSeverity.MEDIUM, // <= 100 records
        }),
      );
    });
  });

  describe('logSystemConfigChange', () => {
    it('should log system config change with critical severity in production', async () => {
      await util.logSystemConfigChange(
        mockRequest as TestRequest,
        'max_file_size',
        '10MB',
        '50MB',
        'production',
      );

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.SYSTEM_CONFIG,
          severity: AuditSeverity.CRITICAL, // production environment
          action: 'config-change',
          resource: 'system-config',
          resourceId: 'max_file_size',
          oldValues: { max_file_size: '10MB' },
          newValues: { max_file_size: '50MB' },
          affectedFields: ['max_file_size'],
          metadata: {
            systemConfig: true,
            configKey: 'max_file_size',
            environment: 'production',
            timestamp: expect.any(String),
          },
          requiresReview: true, // production environment
          compliance: ['AUDIT'],
        }),
      );
    });

    it('should use high severity for non-production environments', async () => {
      await util.logSystemConfigChange(
        mockRequest as TestRequest,
        'debug_mode',
        false,
        true,
        'development',
      );

      expect(mockAuditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: AuditSeverity.HIGH, // non-production
          requiresReview: false, // non-production
        }),
      );
    });
  });
});
