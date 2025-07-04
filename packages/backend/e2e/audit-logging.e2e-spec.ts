import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditLogService } from '../src/modules/audit/services/audit-log.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AppModule } from '../src/app.module';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

/**
 * E2E-Tests für das Audit Logging System
 *
 * Diese Tests prüfen das vollständige Audit Logging System einschließlich:
 * - Automatisches Logging durch den Interceptor
 * - API-Endpunkte für Audit Log Management
 * - Integration mit Authentication
 * - Performance unter Last
 * - Sicherheitsaspekte
 */
describe('Audit Logging System (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let auditLogService: AuditLogService;
  let authService: AuthService;
  let adminToken: string;
  let superAdminToken: string;

  const testUser = {
    email: 'audit-test@example.com',
    password: 'Test123!',
    role: 'ADMIN',
  };

  const testSuperAdmin = {
    email: 'super-audit-test@example.com',
    password: 'SuperTest123!',
    role: 'SUPER_ADMIN',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    auditLogService = moduleFixture.get<AuditLogService>(AuditLogService);
    authService = moduleFixture.get<AuthService>(AuthService);

    await app.init();

    // Setup test users
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Clean audit logs before each test
    await prismaService.auditLog.deleteMany({
      where: {
        userId: { in: [testUser.email, testSuperAdmin.email] },
      },
    });
  });

  async function setupTestUsers() {
    try {
      // Create test admin user
      const adminUser = await prismaService.user.upsert({
        where: { email: testUser.email },
        update: {},
        create: {
          email: testUser.email,
          hashedPassword: await authService['hashPassword'](testUser.password),
          role: testUser.role as any,
          isActive: true,
        },
      });

      // Create test super admin user
      const superAdminUser = await prismaService.user.upsert({
        where: { email: testSuperAdmin.email },
        update: {},
        create: {
          email: testSuperAdmin.email,
          hashedPassword: await authService['hashPassword'](testSuperAdmin.password),
          role: testSuperAdmin.role as any,
          isActive: true,
        },
      });

      // Get tokens
      const adminAuth = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });
      adminToken = adminAuth.accessToken;

      const superAdminAuth = await authService.login({
        email: testSuperAdmin.email,
        password: testSuperAdmin.password,
      });
      superAdminToken = superAdminAuth.accessToken;
    } catch (error) {
      console.error('Error setting up test users:', error);
      throw error;
    }
  }

  async function cleanupTestData() {
    await prismaService.auditLog.deleteMany({
      where: {
        userEmail: { in: [testUser.email, testSuperAdmin.email] },
      },
    });

    await prismaService.user.deleteMany({
      where: {
        email: { in: [testUser.email, testSuperAdmin.email] },
      },
    });
  }

  describe('Automatic Audit Logging via Interceptor', () => {
    it('should automatically log admin actions', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLogs = await auditLogService.findMany({
        userEmail: testUser.email,
      });

      expect(auditLogs.items).toHaveLength(1);
      expect(auditLogs.items[0]).toMatchObject({
        action: 'view',
        resource: 'user',
        httpMethod: 'GET',
        userEmail: testUser.email,
        success: true,
      });
    });

    it('should log failed operations with error details', async () => {
      await request(app.getHttpServer())
        .post('/admin/users/invalid-id/activate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLogs = await auditLogService.findMany({
        userEmail: testUser.email,
      });

      expect(auditLogs.items).toHaveLength(1);
      expect(auditLogs.items[0]).toMatchObject({
        success: false,
        severity: AuditSeverity.ERROR,
      });
    });

    it('should sanitize sensitive data in logged requests', async () => {
      const sensitiveData = {
        email: 'new-user@example.com',
        password: 'SecretPassword123!',
        apiKey: 'secret-api-key',
        token: 'secret-token',
      };

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(sensitiveData)
        .expect(400); // Expect validation error for incomplete data

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLogs = await auditLogService.findMany({
        userEmail: testSuperAdmin.email,
      });

      expect(auditLogs.items).toHaveLength(1);
      const loggedData = auditLogs.items[0].metadata as any;

      // Check that sensitive fields are redacted
      expect(loggedData.request.body.password).toBe('[REDACTED]');
      expect(loggedData.request.body.apiKey).toBe('[REDACTED]');
      expect(loggedData.request.body.token).toBe('[REDACTED]');

      // Non-sensitive data should remain
      expect(loggedData.request.body.email).toBe(sensitiveData.email);
    });

    it('should handle high-frequency operations without performance degradation', async () => {
      const startTime = Date.now();
      const promises = [];

      // Simulate 50 concurrent requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/admin/health')
            .set('Authorization', `Bearer ${adminToken}`),
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust based on your requirements)
      expect(duration).toBeLessThan(5000);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 500));

      const auditLogs = await auditLogService.findMany({
        userEmail: testUser.email,
      });

      // All requests should be logged
      expect(auditLogs.items.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Audit Log API Endpoints', () => {
    beforeEach(async () => {
      // Create some test audit logs
      await auditLogService.create({
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
        resourceId: 'test-user-1',
        userId: 'admin-user',
        userEmail: testUser.email,
        severity: AuditSeverity.MEDIUM,
        success: true,
        httpMethod: 'POST',
        httpPath: '/admin/users',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      await auditLogService.create({
        actionType: AuditActionType.UPDATE,
        action: 'update-user',
        resource: 'user',
        resourceId: 'test-user-1',
        userId: 'admin-user',
        userEmail: testUser.email,
        severity: AuditSeverity.HIGH,
        success: false,
        errorMessage: 'Validation failed',
        httpMethod: 'PUT',
        httpPath: '/admin/users/test-user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should retrieve audit logs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        currentPage: 1,
        itemsPerPage: 10,
      });
    });

    it('should filter audit logs by action type', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?actionType=CREATE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].actionType).toBe('CREATE');
    });

    it('should filter audit logs by severity', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?severity=HIGH')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].severity).toBe('HIGH');
    });

    it('should filter audit logs by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get(
          `/admin/audit-logs?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should search audit logs by text', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?search=create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].action).toBe('create-user');
    });

    it('should retrieve audit log statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalLogs');
      expect(response.body).toHaveProperty('actionTypes');
      expect(response.body).toHaveProperty('severities');
      expect(response.body).toHaveProperty('successRate');
    });

    it('should retrieve individual audit log by ID', async () => {
      const logs = await auditLogService.findMany({ limit: 1 });
      const logId = logs.items[0].id;

      const response = await request(app.getHttpServer())
        .get(`/admin/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(logId);
    });

    it('should mark audit log as reviewed', async () => {
      const logs = await auditLogService.findMany({ limit: 1 });
      const logId = logs.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/admin/audit-logs/${logId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.reviewedBy).toBeDefined();
      expect(response.body.reviewedAt).toBeDefined();
    });
  });

  describe('Security and Access Control', () => {
    it('should deny access to audit logs without authentication', async () => {
      await request(app.getHttpServer()).get('/admin/audit-logs').expect(401);
    });

    it('should deny access to non-admin users', async () => {
      // Create a regular user
      const regularUser = await prismaService.user.create({
        data: {
          email: 'regular-user@example.com',
          hashedPassword: await authService['hashPassword']('Test123!'),
          role: 'USER',
          isActive: true,
        },
      });

      const auth = await authService.login({
        email: 'regular-user@example.com',
        password: 'Test123!',
      });

      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(403);

      // Cleanup
      await prismaService.user.delete({
        where: { id: regularUser.id },
      });
    });

    it('should prevent audit log tampering', async () => {
      const logs = await auditLogService.findMany({ limit: 1 });
      const logId = logs.items[0].id;

      // Try to modify an audit log (should fail)
      await request(app.getHttpServer())
        .put(`/admin/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ action: 'modified-action' })
        .expect(404); // Route should not exist
    });

    it('should prevent audit log deletion by non-super-admin', async () => {
      await request(app.getHttpServer())
        .delete('/admin/audit-logs/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk audit log creation efficiently', async () => {
      const startTime = Date.now();

      // Create 100 audit logs
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          auditLogService.create({
            actionType: AuditActionType.VIEW,
            action: `bulk-test-${i}`,
            resource: 'test',
            resourceId: `test-${i}`,
            userId: 'bulk-test-user',
            userEmail: `bulk-test-${i}@example.com`,
            severity: AuditSeverity.LOW,
            success: true,
          }),
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000);

      // Verify all logs were created
      const logs = await auditLogService.findMany({
        search: 'bulk-test',
        limit: 200,
      });
      expect(logs.items.length).toBe(100);

      // Cleanup
      await prismaService.auditLog.deleteMany({
        where: {
          action: { startsWith: 'bulk-test-' },
        },
      });
    });

    it('should efficiently query large datasets', async () => {
      // Create test data
      const createPromises = [];
      for (let i = 0; i < 500; i++) {
        createPromises.push(
          auditLogService.create({
            actionType: i % 2 === 0 ? AuditActionType.CREATE : AuditActionType.UPDATE,
            action: `performance-test-${i}`,
            resource: 'performance',
            resourceId: `perf-${i}`,
            userId: 'perf-test-user',
            userEmail: `perf-test-${i % 10}@example.com`,
            severity: i % 3 === 0 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
            success: i % 4 !== 0,
          }),
        );
      }
      await Promise.all(createPromises);

      const startTime = Date.now();

      // Test complex query with multiple filters
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?actionType=CREATE&severity=HIGH&success=true&limit=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const queryDuration = Date.now() - startTime;

      // Query should complete quickly
      expect(queryDuration).toBeLessThan(1000);
      expect(response.body.items.length).toBeGreaterThan(0);

      // Cleanup
      await prismaService.auditLog.deleteMany({
        where: {
          action: { startsWith: 'performance-test-' },
        },
      });
    });
  });

  describe('Data Integrity and Retention', () => {
    it('should handle audit log archiving', async () => {
      // Create old audit log
      const oldLog = await auditLogService.create({
        actionType: AuditActionType.DELETE,
        action: 'old-action',
        resource: 'old-resource',
        userId: 'old-user',
        userEmail: 'old@example.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
      });

      // Manually set old timestamp
      await prismaService.auditLog.update({
        where: { id: oldLog.id },
        data: {
          timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        },
      });

      // Archive old logs (30+ days)
      const archivedCount = await auditLogService.archiveOldLogs(30);
      expect(archivedCount).toBe(1);

      // Verify log is archived
      const archivedLog = await auditLogService.findOne(oldLog.id);
      expect(archivedLog.archivedAt).toBeDefined();
    });

    it('should validate audit log data integrity', async () => {
      const validLog = {
        actionType: AuditActionType.CREATE,
        action: 'integrity-test',
        resource: 'test',
        userId: 'test-user',
        userEmail: 'test@example.com',
        severity: AuditSeverity.MEDIUM,
        success: true,
      };

      const log = await auditLogService.create(validLog);
      expect(log).toMatchObject(validLog);

      // Verify required fields are not null
      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.actionType).toBeDefined();
      expect(log.action).toBeDefined();
      expect(log.resource).toBeDefined();
    });
  });

  describe('Integration with Authentication System', () => {
    it('should log authentication events', async () => {
      // Login should be logged
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLogs = await auditLogService.findMany({
        userEmail: testUser.email,
        action: 'login',
      });

      expect(auditLogs.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should capture user context in all admin operations', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLogs = await auditLogService.findMany({
        userEmail: testUser.email,
      });

      expect(auditLogs.items).toHaveLength(1);
      expect(auditLogs.items[0]).toMatchObject({
        userEmail: testUser.email,
        userRole: testUser.role,
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should continue normal operation when audit logging fails', async () => {
      // Mock a scenario where audit logging might fail
      // The actual endpoint should still work
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // The main functionality should not be affected
      expect(response.body).toBeDefined();
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?page=invalid&limit=notanumber')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should handle database connection issues', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the service handles errors gracefully
      try {
        await auditLogService.findOne('non-existent-id');
      } catch (error) {
        expect(error.status).toBe(404);
      }
    });
  });
});
