import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { SecurityLogIntegrityService } from '../src/security/services/integrity.service';
import { SecurityLogEventType } from '../src/security/types/security-log.types';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../src/redis/redis.service';

describe('Security Logging System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let securityQueue: Queue;
  let integrityService: SecurityLogIntegrityService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let authToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    securityQueue = app.get<Queue>(getQueueToken('security-logs'));
    integrityService = app.get<SecurityLogIntegrityService>(SecurityLogIntegrityService);
    jwtService = app.get<JwtService>(JwtService);
    redisService = app.get<RedisService>(RedisService);

    // Clean up before tests
    await prisma.securityLog.deleteMany();
    await prisma.user.deleteMany();
    await securityQueue.empty();
    await securityQueue.clean(0, 'completed');
    await securityQueue.clean(0, 'failed');

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: '$2b$10$test',
        roles: ['ADMIN'],
        status: 'ACTIVE',
      },
    });

    const normalUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        password: '$2b$10$test',
        roles: ['USER'],
        status: 'ACTIVE',
      },
    });

    authToken = jwtService.sign({ sub: normalUser.id, email: normalUser.email });
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.securityLog.deleteMany();
    await securityQueue.empty();
    await securityQueue.clean(0, 'completed');
    await securityQueue.clean(0, 'failed');
  });

  describe('Complete Flow: Login → Log → Query', () => {
    it('should create security log on login and query it', async () => {
      // 1. Login
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'test',
      });

      expect(loginResponse.status).toBe(200);

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2. Check if log was created
      const logs = await prisma.securityLog.findMany({
        where: {
          eventType: SecurityLogEventType.AUTH_LOGIN_SUCCESS,
        },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBeDefined();
      expect(logs[0].hash).toBeDefined();
      expect(logs[0].previousHash).toBeDefined();

      // 3. Query logs via API
      const queryResponse = await request(app.getHttpServer())
        .get('/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: SecurityLogEventType.AUTH_LOGIN_SUCCESS,
        });

      expect(queryResponse.status).toBe(200);
      expect(queryResponse.body.data).toHaveLength(1);
      expect(queryResponse.body.data[0].eventType).toBe(SecurityLogEventType.AUTH_LOGIN_SUCCESS);
    });

    it('should handle failed login attempts', async () => {
      // Attempt failed login
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'wrong-password',
      });

      expect(loginResponse.status).toBe(401);

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if log was created
      const logs = await prisma.securityLog.findMany({
        where: {
          eventType: SecurityLogEventType.AUTH_LOGIN_FAILED,
        },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].metadata.email).toBe('user@test.com');
      expect(logs[0].metadata.reason).toBeDefined();
    });
  });

  describe('Hash Chain Integrity', () => {
    it('should maintain chain integrity over multiple logs', async () => {
      const logPromises = [];

      // Create multiple logs
      for (let i = 0; i < 10; i++) {
        logPromises.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'user@test.com',
            password: 'test',
          }),
        );
      }

      await Promise.all(logPromises);

      // Wait for all queue processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get all logs ordered by timestamp
      const logs = await prisma.securityLog.findMany({
        orderBy: { timestamp: 'asc' },
      });

      // Verify chain integrity
      const isValid = await integrityService.verifyChain();
      expect(isValid).toBe(true);

      // Verify each log's hash
      for (let i = 1; i < logs.length; i++) {
        const calculatedHash = await integrityService.calculateHash({
          ...logs[i],
          previousHash: logs[i - 1].hash,
        });
        expect(logs[i].hash).toBe(calculatedHash);
      }
    });

    it('should detect chain tampering', async () => {
      // Create some logs
      await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'test',
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Tamper with a log
      const logs = await prisma.securityLog.findMany();
      await prisma.securityLog.update({
        where: { id: logs[0].id },
        data: { metadata: { tampered: true } },
      });

      // Verify chain should fail
      const isValid = await integrityService.verifyChain();
      expect(isValid).toBe(false);
    });
  });

  describe('Concurrent Logging', () => {
    it('should handle concurrent log creation without race conditions', async () => {
      const concurrentRequests = 50;
      const requests = [];

      // Create many concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: i % 2 === 0 ? 'user@test.com' : 'admin@test.com',
              password: 'test',
            }),
        );
      }

      await Promise.all(requests);

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check all logs were created
      const logs = await prisma.securityLog.findMany({
        orderBy: { timestamp: 'asc' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(concurrentRequests);

      // Verify chain integrity
      const isValid = await integrityService.verifyChain();
      expect(isValid).toBe(true);

      // Check for duplicate previousHash (would indicate race condition)
      const previousHashes = new Set(logs.map((log) => log.previousHash));
      expect(previousHashes.size).toBe(logs.length);
    });

    it('should handle queue backpressure gracefully', async () => {
      const heavyLoad = 100;
      const requests = [];

      // Pause the queue to simulate backpressure
      await securityQueue.pause();

      // Create many requests
      for (let i = 0; i < heavyLoad; i++) {
        requests.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'user@test.com',
            password: 'test',
          }),
        );
      }

      const responses = await Promise.all(requests);

      // All requests should succeed (queued)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Check queue size
      const jobCounts = await securityQueue.getJobCounts();
      expect(jobCounts.waiting).toBeGreaterThan(0);

      // Resume queue
      await securityQueue.resume();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // All logs should be processed
      const logs = await prisma.securityLog.findMany();
      expect(logs.length).toBeGreaterThanOrEqual(heavyLoad);

      // Chain should remain intact
      const isValid = await integrityService.verifyChain();
      expect(isValid).toBe(true);
    });
  });

  describe('Cleanup Job', () => {
    it('should archive old logs and maintain chain integrity', async () => {
      // Create old logs (manually set timestamp)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old

      // Create some old logs
      for (let i = 0; i < 5; i++) {
        await prisma.securityLog.create({
          data: {
            eventType: SecurityLogEventType.AUTH_LOGIN_SUCCESS,
            userId: 'test-user',
            metadata: { test: true },
            hash: `old-hash-${i}`,
            previousHash: i === 0 ? 'genesis' : `old-hash-${i - 1}`,
            timestamp: oldDate,
          },
        });
      }

      // Create recent logs
      await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'test',
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Trigger cleanup endpoint
      const cleanupResponse = await request(app.getHttpServer())
        .post('/security-logs/cleanup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(cleanupResponse.status).toBe(201);

      // Check that old logs are archived
      const remainingLogs = await prisma.securityLog.findMany();
      const archivedLogs = remainingLogs.filter((log) => log.archived);

      expect(archivedLogs.length).toBeGreaterThan(0);

      // Recent logs should not be archived
      const recentLogs = remainingLogs.filter((log) => !log.archived);
      expect(recentLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Security Log API', () => {
    beforeEach(async () => {
      // Create various logs for testing
      const eventTypes = [
        SecurityLogEventType.AUTH_LOGIN_SUCCESS,
        SecurityLogEventType.AUTH_LOGIN_FAILED,
        SecurityLogEventType.AUTH_LOGOUT,
        SecurityLogEventType.PERMISSION_GRANTED,
        SecurityLogEventType.PERMISSION_DENIED,
      ];

      for (const eventType of eventTypes) {
        await securityQueue.add('log', {
          eventType,
          userId: 'test-user',
          metadata: { test: true },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should filter logs by event type', async () => {
      const response = await request(app.getHttpServer())
        .get('/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: SecurityLogEventType.AUTH_LOGIN_SUCCESS,
        });

      expect(response.status).toBe(200);
      expect(
        response.body.data.every(
          (log) => log.eventType === SecurityLogEventType.AUTH_LOGIN_SUCCESS,
        ),
      ).toBe(true);
    });

    it('should filter logs by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/security-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          limit: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.total).toBeGreaterThan(2);
      expect(response.body.pages).toBeGreaterThan(1);
    });

    it('should require admin role', async () => {
      const response = await request(app.getHttpServer())
        .get('/security-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should validate chain integrity endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/security-logs/verify-chain')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.totalLogs).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle queue failures gracefully', async () => {
      // Disconnect Redis to simulate failure
      await redisService.disconnect();

      const response = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'test',
      });

      // Request should still succeed
      expect(response.status).toBe(200);

      // Reconnect
      await redisService.connect();
    });

    it('should handle database failures during chain verification', async () => {
      // Create logs
      await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'test',
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock database error
      jest.spyOn(prisma.securityLog, 'findMany').mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app.getHttpServer())
        .get('/security-logs/verify-chain')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
    });
  });
});
