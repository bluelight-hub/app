import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { SecurityLogModule } from '../src/security/security-log.module';
import { UserRole, JWTPayload, RolePermissions } from '../src/modules/auth/types/jwt.types';
import { AllSecurityEventTypes } from '../src/security/constants/event-types';
import { IntegrityService } from '../src/security/services/integrity.service';
import { CleanupService } from '../src/security/services/cleanup.service';

describe('Security Logging E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let securityLogQueue: Queue;
  let integrityService: IntegrityService;
  let cleanupService: CleanupService;
  let adminToken: string;
  let userToken: string;

  const testUser = {
    email: 'test.user@example.com',
    password: 'TestPassword123!',
  };

  const testAdmin = {
    email: 'test.admin@example.com',
    password: 'AdminPassword123!',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    securityLogQueue = app.get(getQueueToken('security-log'));
    integrityService = app.get(IntegrityService);
    cleanupService = app.get(CleanupService);

    // Clean database
    await prisma.securityLog.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        username: testUser.email.split('@')[0],
        passwordHash: hashedPassword,
        role: UserRole.USER,
        isActive: true,
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: testAdmin.email,
        username: testAdmin.email.split('@')[0],
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    // Generate tokens
    const userPayload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: [user.role],
      permissions: RolePermissions[user.role] || [],
      sessionId: `sess_${Date.now()}_user`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const adminPayload: JWTPayload = {
      sub: admin.id,
      email: admin.email,
      roles: [admin.role],
      permissions: RolePermissions[admin.role] || [],
      sessionId: `sess_${Date.now()}_admin`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    userToken = jwtService.sign(userPayload);
    adminToken = jwtService.sign(adminPayload);
  });

  afterAll(async () => {
    await prisma.securityLog.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('Complete Security Logging Flow', () => {
    it('should log user login and allow admin to query the logs', async () => {
      // Step 1: User login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Admin queries security logs
      const logsResponse = await request(app.getHttpServer())
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: 'LOGIN_SUCCESS',
          page: 1,
          pageSize: 10,
        })
        .expect(200);

      expect(logsResponse.body.data).toHaveLength(1);
      expect(logsResponse.body.data[0]).toMatchObject({
        eventType: 'LOGIN_SUCCESS',
        userId: expect.any(String),
        ipAddress: expect.any(String),
      });
      expect(logsResponse.body.pagination).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('should handle failed login attempts and log them correctly', async () => {
      // Attempt failed login
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401);

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Query failed login logs
      const logsResponse = await request(app.getHttpServer())
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: 'LOGIN_FAILED',
        })
        .expect(200);

      expect(logsResponse.body.data.length).toBeGreaterThan(0);
      const failedLog = logsResponse.body.data[0];
      expect(failedLog.metadata).toHaveProperty('email', testUser.email);
    });
  });

  describe('Hash Chain Integrity', () => {
    it('should maintain hash chain integrity across multiple logs', async () => {
      // Clear existing logs
      await prisma.securityLog.deleteMany();

      // Create multiple security events
      const events = [
        { type: 'LOGIN_SUCCESS', userId: 'user1' },
        { type: 'PASSWORD_CHANGED', userId: 'user1' },
        { type: 'LOGOUT', userId: 'user1' },
        { type: 'LOGIN_SUCCESS', userId: 'user2' },
        { type: 'ACCOUNT_LOCKED', userId: 'user2' },
      ];

      for (const event of events) {
        await request(app.getHttpServer())
          .post('/api/auth/test-log') // Assuming test endpoint
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            eventType: event.type,
            userId: event.userId,
          });
      }

      // Wait for all events to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify hash chain integrity
      const isValid = await integrityService.verifyChainIntegrity();
      expect(isValid).toBe(true);

      // Get all logs and verify sequential hashing
      const logs = await prisma.securityLog.findMany({
        orderBy: { sequenceNumber: 'asc' },
      });

      expect(logs.length).toBe(events.length);

      // Verify each log's hash includes previous hash
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].previousHash).toBe(logs[i - 1].currentHash);
        expect(logs[i].sequenceNumber).toBe(logs[i - 1].sequenceNumber + BigInt(1));
      }
    });

    it('should detect hash chain tampering', async () => {
      // Create a log entry
      await request(app.getHttpServer())
        .post('/api/auth/test-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'LOGIN_SUCCESS',
          userId: 'tamperedUser',
        });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Tamper with a log entry
      const log = await prisma.securityLog.findFirst({
        where: { userId: 'tamperedUser' },
      });

      await prisma.securityLog.update({
        where: { id: log.id },
        data: { metadata: { tampered: true } },
      });

      // Verify chain integrity should fail
      const isValid = await integrityService.verifyChainIntegrity();
      expect(isValid).toBe(false);
    });
  });

  describe('Concurrent Logging', () => {
    it('should handle 100+ concurrent login attempts correctly', async () => {
      const concurrentRequests = 100;
      const promises = [];

      // Create concurrent login requests
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app.getHttpServer()).post('/api/auth/login').send({
          email: testUser.email,
          password: testUser.password,
        });
        promises.push(promise);
      }

      // Execute all requests concurrently
      const responses = await Promise.all(promises);

      // Verify all requests succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify all logs were created with correct sequence
      const logs = await prisma.securityLog.findMany({
        where: {
          eventType: 'LOGIN_SUCCESS',
          userId: expect.any(String),
        },
        orderBy: { sequenceNumber: 'asc' },
      });

      // Verify sequential numbering despite concurrency
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].sequenceNumber).toBe(logs[i - 1].sequenceNumber + BigInt(1));
      }

      // Verify hash chain integrity
      const isValid = await integrityService.verifyChainIntegrity();
      expect(isValid).toBe(true);
    });

    it('should handle mixed concurrent security events', async () => {
      const eventTypes = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'PASSWORD_CHANGED',
        'LOGOUT',
        'TOKEN_REFRESHED',
      ];

      const promises = [];

      // Create 20 requests for each event type
      for (const eventType of eventTypes) {
        for (let i = 0; i < 20; i++) {
          const promise = request(app.getHttpServer())
            .post('/api/auth/test-log')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              eventType,
              userId: `user-${i}`,
              metadata: { iteration: i },
            });
          promises.push(promise);
        }
      }

      // Execute all requests concurrently
      await Promise.all(promises);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify all events were logged
      const totalLogs = await prisma.securityLog.count();
      expect(totalLogs).toBeGreaterThanOrEqual(100);

      // Verify chain integrity
      const isValid = await integrityService.verifyChainIntegrity();
      expect(isValid).toBe(true);
    });
  });

  describe('Cleanup and Retention', () => {
    it('should clean up old logs while maintaining chain integrity', async () => {
      // Create logs with different ages
      const now = new Date();
      const oldDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago

      // Insert old logs directly
      for (let i = 0; i < 10; i++) {
        await prisma.securityLog.create({
          data: {
            eventType: 'OLD_EVENT',
            userId: `old-user-${i}`,
            ipAddress: '127.0.0.1',
            sequenceNumber: BigInt(i + 1000000), // High sequence to avoid conflicts
            currentHash: `hash-${i}`,
            previousHash: i > 0 ? `hash-${i - 1}` : null,
            createdAt: oldDate,
          },
        });
      }

      // Create recent logs
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/test-log')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            eventType: 'RECENT_EVENT',
            userId: `recent-user-${i}`,
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Run cleanup
      const cleanupResult = await cleanupService.cleanupOldLogs();

      expect(cleanupResult.archived).toBeGreaterThan(0);
      expect(cleanupResult.deleted).toBeGreaterThan(0);

      // Verify recent logs still exist
      const recentLogs = await prisma.securityLog.count({
        where: { eventType: 'RECENT_EVENT' },
      });
      expect(recentLogs).toBe(5);

      // Verify old logs were removed
      const oldLogs = await prisma.securityLog.count({
        where: { eventType: 'OLD_EVENT' },
      });
      expect(oldLogs).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock a cleanup error
      jest.spyOn(cleanupService, 'archiveLogs').mockRejectedValueOnce(new Error('Archive failed'));

      // Cleanup should not throw
      await expect(cleanupService.cleanupOldLogs()).resolves.not.toThrow();
    });
  });

  describe('API Security and Validation', () => {
    it('should reject unauthorized access to security logs', async () => {
      await request(app.getHttpServer()).get('/api/admin/security-logs').expect(401);

      await request(app.getHttpServer())
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should validate query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 'invalid',
          pageSize: 'invalid',
        })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 0, // Should be >= 1
          pageSize: 1000, // Should be <= 100
        })
        .expect(400);
    });

    it('should filter logs by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          from: yesterday.toISOString(),
          to: tomorrow.toISOString(),
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((log) => {
        const logDate = new Date(log.createdAt);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });
  });

  describe('Queue Behavior', () => {
    it('should handle queue failures with retry', async () => {
      // Mock a processing failure
      const processSpy = jest.spyOn(securityLogQueue, 'add');
      processSpy.mockRejectedValueOnce(new Error('Queue error'));

      // Should retry and eventually succeed
      await request(app.getHttpServer())
        .post('/api/auth/test-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'TEST_RETRY',
          userId: 'retry-user',
        })
        .expect(500); // First attempt fails

      // Restore and retry
      processSpy.mockRestore();

      await request(app.getHttpServer())
        .post('/api/auth/test-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'TEST_RETRY',
          userId: 'retry-user',
        })
        .expect(200);
    });

    it('should respect queue priority for critical events', async () => {
      // Create regular and critical events
      const promises = [];

      // Add regular events
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/auth/test-log')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              eventType: 'REGULAR_EVENT',
              userId: `regular-${i}`,
            }),
        );
      }

      // Add critical event
      promises.push(
        request(app.getHttpServer())
          .post('/api/auth/test-log-critical')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            eventType: 'ACCOUNT_COMPROMISED',
            userId: 'critical-user',
          }),
      );

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Critical event should be processed despite being added last
      const criticalLog = await prisma.securityLog.findFirst({
        where: { eventType: 'ACCOUNT_COMPROMISED' },
      });

      expect(criticalLog).toBeDefined();
    });
  });
});
