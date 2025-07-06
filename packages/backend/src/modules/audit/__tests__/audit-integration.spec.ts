import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueue } from '../queues/audit-log.queue';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { NoAudit, Audit, AuditDelete } from '../decorators/audit.decorator';
import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import * as request from 'supertest';
import { waitForAuditProcessing } from './utils/auditTestUtils';

// Test Controller with various audit decorators
@Controller('test-audit')
class TestAuditController {
  @Get('normal')
  getNormal() {
    return { message: 'normal endpoint' };
  }

  @NoAudit()
  @Get('no-audit')
  getNoAudit() {
    return { message: 'no audit endpoint' };
  }

  @Audit({
    action: AuditActionType.APPROVE,
    severity: AuditSeverity.HIGH,
    resourceType: 'test-resource',
    context: { customField: 'customValue' },
  })
  @Post('custom-audit')
  postCustomAudit(@Body() data: any) {
    return { message: 'custom audit endpoint', data };
  }

  @AuditDelete('user')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return { message: `User ${id} deleted` };
  }
}

describe('Audit Module Integration Tests', () => {
  let app: INestApplication;
  let interceptor: AuditInterceptor;

  // Mock services
  const mockAuditLogService = {
    create: jest.fn().mockResolvedValue({ id: 'test-id' }),
    findMany: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
    findOne: jest.fn(),
    getStatistics: jest.fn(),
    archiveOldLogs: jest.fn(),
    deleteArchivedLogs: jest.fn(),
    markAsReviewed: jest.fn(),
  };

  const mockAuditLogQueue = {
    addAuditLog: jest.fn().mockResolvedValue('job-id'),
    addBulkAuditLogs: jest.fn().mockResolvedValue(['job-id']),
    getQueueStats: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestAuditController],
      providers: [
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AuditLogQueue, useValue: mockAuditLogQueue },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Create and configure interceptor
    interceptor = new AuditInterceptor(mockAuditLogService as any, mockAuditLogQueue as any);
    interceptor.setConfig({
      includePaths: ['/test-audit'],
      excludePaths: ['/health', '/metrics'],
    });

    // Apply interceptor globally
    app.useGlobalInterceptors(interceptor);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('AuditInterceptor + AuditService Integration', () => {
    it('should create audit log for normal endpoint', async () => {
      await request(app.getHttpServer()).get('/test-audit/normal').expect(200);

      await waitForAuditProcessing();

      expect(mockAuditLogQueue.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.READ,
          action: 'read',
          resource: 'test-audit',
          httpMethod: 'GET',
          endpoint: '/test-audit/normal',
          success: true,
          statusCode: 200,
        }),
      );
    });

    it('should skip audit logging for @NoAudit decorated endpoints', async () => {
      await request(app.getHttpServer()).get('/test-audit/no-audit').expect(200);

      await waitForAuditProcessing();

      expect(mockAuditLogQueue.addAuditLog).not.toHaveBeenCalled();
    });

    it('should use custom audit metadata from decorators', async () => {
      const testData = { test: 'data' };

      await request(app.getHttpServer())
        .post('/test-audit/custom-audit')
        .send(testData)
        .expect(201);

      await waitForAuditProcessing();

      expect(mockAuditLogQueue.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.CREATE, // POST maps to CREATE by default
          action: 'create',
          severity: AuditSeverity.HIGH, // Custom severity is preserved
          resource: 'test-resource', // Custom resource is preserved
          httpMethod: 'POST',
          success: true,
          metadata: expect.objectContaining({
            customField: 'customValue', // Custom context is preserved
          }),
        }),
      );
    });

    it('should handle delete operations with proper severity', async () => {
      await request(app.getHttpServer()).delete('/test-audit/users/123').expect(200);

      await waitForAuditProcessing();

      expect(mockAuditLogQueue.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.DELETE,
          action: 'delete',
          severity: AuditSeverity.HIGH,
          resource: 'user',
          resourceId: '123',
          httpMethod: 'DELETE',
          success: true,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should log failed operations with error details', async () => {
      // Create a controller that throws an error
      @Controller('test-error')
      class TestErrorController {
        @Get('throw')
        throwError() {
          throw new Error('Test error');
        }
      }

      const errorModule = await Test.createTestingModule({
        controllers: [TestErrorController],
      }).compile();

      const errorApp = errorModule.createNestApplication();
      errorApp.useGlobalInterceptors(
        new AuditInterceptor(mockAuditLogService as any, mockAuditLogQueue as any),
      );
      await errorApp.init();

      await request(errorApp.getHttpServer()).get('/test-error/throw').expect(500);

      await waitForAuditProcessing();

      expect(mockAuditLogQueue.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          severity: AuditSeverity.ERROR,
          errorMessage: 'Test error',
        }),
      );

      await errorApp.close();
    });
  });

  describe('Queue Integration', () => {
    it('should fallback to direct service call when queue fails', async () => {
      // Make queue fail
      mockAuditLogQueue.addAuditLog.mockRejectedValueOnce(new Error('Queue failed'));

      await request(app.getHttpServer()).get('/test-audit/normal').expect(200);

      await waitForAuditProcessing();

      // Should have tried queue first
      expect(mockAuditLogQueue.addAuditLog).toHaveBeenCalled();

      // Should have fallen back to direct service
      expect(mockAuditLogService.create).toHaveBeenCalled();
    });
  });

  describe('Interceptor Configuration', () => {
    it('should sanitize sensitive data', async () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'abc-123',
        token: 'jwt-token',
        email: 'test@example.com',
      };

      await request(app.getHttpServer())
        .post('/test-audit/custom-audit')
        .send(sensitiveData)
        .expect(201);

      await waitForAuditProcessing();

      expect(mockAuditLogQueue.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            request: expect.objectContaining({
              body: expect.objectContaining({
                password: '[REDACTED]',
                apiKey: '[REDACTED]',
                token: '[REDACTED]',
                username: 'testuser',
                email: 'test@example.com',
              }),
            }),
          }),
        }),
      );
    });
  });
});
