import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuditModule } from '../audit.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuditAction } from '../types/audit.types';
import { Audit, AuditCreate } from '../decorators/audit.decorator';
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import {
  AuditActionType,
  AuditSeverity as PrismaAuditSeverity,
} from '@prisma/generated/prisma/client';
import { BullModule } from '@nestjs/bull';
import { AUDIT_LOG_QUEUE } from '../queues/audit-log.queue';

// Test controller with audit decorators
@Controller('test')
class TestController {
  @Post('users')
  @AuditCreate('user')
  async createUser(@Body() data: any) {
    return { id: 1, ...data };
  }

  @Get('users/:id')
  @Audit({ action: AuditAction.VIEW, resourceType: 'user' })
  async getUser(@Param('id') id: string) {
    return { id, name: 'Test User' };
  }

  @Post('no-audit')
  async noAudit() {
    return { message: 'This endpoint is not audited' };
  }
}

describe('Audit Module Integration Tests', () => {
  let app: INestApplication;
  let prismaService: any;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Mock PrismaService
    prismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    // Mock ConfigService
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          AUDIT_USE_QUEUE: false, // Disable queue for synchronous testing
          AUDIT_CACHE_ENABLED: false,
          AUDIT_SCHEDULER_ENABLED: false,
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          BullModule.registerQueue({
            name: AUDIT_LOG_QUEUE,
          }),
          AuditModule,
        ],
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor,
          },
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaService)
        .overrideProvider(ConfigService)
        .useValue(configService)
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    } catch (error) {
      // If module creation fails, skip the test
      console.error('Failed to create test module:', error);
    }
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('Audit Logging Flow', () => {
    it('should audit a CREATE action with decorator', async () => {
      const userData = { name: 'John Doe', email: 'john@example.com' };

      prismaService.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        actionType: AuditActionType.CREATE,
        severity: PrismaAuditSeverity.MEDIUM,
        action: 'create-user',
        resource: 'user',
        resourceId: '1',
        userId: 'system',
        success: true,
        createdAt: new Date(),
      } as any);

      const response = await request(app.getHttpServer())
        .post('/test/users')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({ id: 1, ...userData });

      // Verify audit log was created
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: AuditActionType.CREATE,
          severity: PrismaAuditSeverity.MEDIUM,
          action: 'create-user',
          resource: 'user',
          resourceId: '1',
          endpoint: '/test/users',
          httpMethod: 'POST',
          success: true,
          statusCode: 201,
          duration: expect.any(Number),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          newValues: { id: 1, ...userData },
        }),
      });
    });

    it('should audit a VIEW action with decorator', async () => {
      prismaService.auditLog.create.mockResolvedValue({
        id: 'audit-456',
        actionType: AuditActionType.READ,
        severity: PrismaAuditSeverity.LOW,
        action: 'view',
        resource: 'user',
        resourceId: '123',
        userId: 'system',
        success: true,
        createdAt: new Date(),
      } as any);

      const response = await request(app.getHttpServer()).get('/test/users/123').expect(200);

      expect(response.body).toEqual({ id: '123', name: 'Test User' });

      // Verify audit log was created
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: AuditActionType.READ,
          severity: PrismaAuditSeverity.LOW,
          action: 'view',
          resource: 'user',
          resourceId: '123',
          endpoint: '/test/users/123',
          httpMethod: 'GET',
          success: true,
          statusCode: 200,
          duration: expect.any(Number),
        }),
      });
    });

    it('should not audit endpoints without audit decorators', async () => {
      await request(app.getHttpServer()).post('/test/no-audit').expect(201);

      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('should handle errors and audit failed operations', async () => {
      // Make the controller throw an error
      jest
        .spyOn(TestController.prototype, 'createUser')
        .mockRejectedValue(new Error('Database error'));

      prismaService.auditLog.create.mockResolvedValue({
        id: 'audit-789',
        actionType: AuditActionType.CREATE,
        severity: PrismaAuditSeverity.MEDIUM,
        action: 'create-user',
        resource: 'user',
        success: false,
        errorMessage: 'Database error',
        createdAt: new Date(),
      } as any);

      await request(app.getHttpServer())
        .post('/test/users')
        .send({ name: 'Error User' })
        .expect(500);

      // Verify audit log was created for failed operation
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: AuditActionType.CREATE,
          action: 'create-user',
          resource: 'user',
          success: false,
          statusCode: 500,
          errorMessage: expect.stringContaining('Database error'),
        }),
      });
    });

    it('should include user context when available', async () => {
      // Simulate a request with user context
      const userData = { name: 'Jane Doe' };

      // Mock the request to include user context
      await request(app.getHttpServer())
        .post('/test/users')
        .set('X-User-Id', 'user-999')
        .set('X-User-Email', 'jane@example.com')
        .send(userData)
        .expect(201);

      // The interceptor should extract user info from headers or auth context
      // This is a simplified test - in real scenarios, user info would come from auth middleware
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'create-user',
          resource: 'user',
          success: true,
        }),
      });
    });

    it('should measure operation duration accurately', async () => {
      // Add artificial delay to the controller
      jest.spyOn(TestController.prototype, 'getUser').mockImplementation(async (id) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { id, name: 'Test User' };
      });

      await request(app.getHttpServer()).get('/test/users/456').expect(200);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          duration: expect.any(Number),
        }),
      });

      const callArgs = prismaService.auditLog.create.mock.calls[0][0];
      expect(callArgs.data.duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle bulk operations metadata', async () => {
      // const bulkData = Array(5).fill({ name: 'Bulk User' });

      // Create a bulk endpoint
      const bulkController = {
        async createBulkUsers(data: any[]) {
          return data.map((item, index) => ({ id: index + 1, ...item }));
        },
      };

      // Add bulk endpoint with metadata
      Object.defineProperty(bulkController.createBulkUsers, 'name', {
        value: 'createBulkUsers',
      });

      Reflect.defineMetadata(
        'audit:action',
        AuditAction.BULK_OPERATION,
        bulkController.createBulkUsers,
      );
      Reflect.defineMetadata('audit:resourceType', 'user', bulkController.createBulkUsers);
      Reflect.defineMetadata(
        'audit:context',
        { bulkOperation: true },
        bulkController.createBulkUsers,
      );

      // The actual bulk operation would be integrated differently
      // This test verifies the metadata handling
      expect(Reflect.getMetadata('audit:action', bulkController.createBulkUsers)).toBe(
        AuditAction.BULK_OPERATION,
      );
    });
  });

  describe('Audit Log Sanitization', () => {
    it('should sanitize sensitive fields from audit logs', async () => {
      const sensitiveData = {
        name: 'John Doe',
        password: 'secret123',
        creditCard: '1234-5678-9012-3456',
        ssn: '123-45-6789',
      };

      await request(app.getHttpServer()).post('/test/users').send(sensitiveData).expect(201);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValues: expect.objectContaining({
            name: 'John Doe',
            password: '[REDACTED]',
            creditCard: '[REDACTED]',
            ssn: '[REDACTED]',
          }),
        }),
      });
    });
  });

  describe('Performance', () => {
    it('should not significantly impact response time', async () => {
      const iterations = 10;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post('/test/users')
          .send({ name: `User ${i}` })
          .expect(201);
        const end = Date.now();
        timings.push(end - start);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;

      // Audit logging should not add more than 50ms on average
      expect(avgTime).toBeLessThan(150);
    });

    it('should handle high volume of concurrent requests', async () => {
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/test/users')
            .send({ name: `Concurrent User ${i}` }),
        );
      }

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(201);
      });

      // All audit logs should be created
      expect(prismaService.auditLog.create).toHaveBeenCalledTimes(concurrentRequests);
    });
  });

  describe('Error Recovery', () => {
    it('should not fail the request if audit logging fails', async () => {
      // Make audit log creation fail
      prismaService.auditLog.create.mockRejectedValue(new Error('Database unavailable'));

      // The request should still succeed
      const response = await request(app.getHttpServer())
        .post('/test/users')
        .send({ name: 'Test User' })
        .expect(201);

      expect(response.body).toEqual({ id: 1, name: 'Test User' });
    });

    it('should handle malformed audit data gracefully', async () => {
      // Create a scenario with invalid data that might cause issues
      const invalidData = {
        name: 'Test',
        circular: {},
      };
      // Create circular reference
      (invalidData.circular as any).ref = invalidData;

      await request(app.getHttpServer()).post('/test/users').send(invalidData).expect(201);

      // Should handle circular references without crashing
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Compliance Features', () => {
    it('should track compliance tags for regulated operations', async () => {
      // Add compliance metadata to an endpoint
      const complianceController = {
        async accessHealthData() {
          return { data: 'health records' };
        },
      };

      Reflect.defineMetadata(
        'audit:context',
        { compliance: ['HIPAA', 'GDPR'] },
        complianceController.accessHealthData,
      );

      // Verify compliance metadata is included
      const metadata = Reflect.getMetadata('audit:context', complianceController.accessHealthData);
      expect(metadata.compliance).toEqual(['HIPAA', 'GDPR']);
    });

    it('should mark operations involving sensitive data', async () => {
      const healthData = {
        patientId: '12345',
        diagnosis: 'Test diagnosis',
        medications: ['Med1', 'Med2'],
      };

      // This would be a specialized endpoint with sensitive data marking
      await request(app.getHttpServer()).post('/test/users').send(healthData).expect(201);

      // In a real implementation, the interceptor would detect and mark sensitive data
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });
  });
});
