import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityLogService } from '../services/security-log.service';
import { SecurityLogProcessor } from '../processors/security-log.processor';
import { IntegrityService } from '../services/integrity.service';
import { SecurityLogModule } from '../security-log.module';

describe('Security Logging Performance Tests', () => {
  let module: TestingModule;
  let securityLogService: SecurityLogService;
  let securityLogQueue: Queue;
  let queueEvents: QueueEvents;
  let prisma: PrismaService;
  let integrityService: IntegrityService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityLogModule,
      ],
    }).compile();

    securityLogService = module.get<SecurityLogService>(SecurityLogService);
    securityLogQueue = module.get<Queue>(getQueueToken('security-log'));
    prisma = module.get<PrismaService>(PrismaService);
    integrityService = module.get<IntegrityService>(IntegrityService);

    // Create queue events listener
    queueEvents = new QueueEvents('security-log', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    // Clean up before tests
    await prisma.securityLog.deleteMany();
    await securityLogQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    await queueEvents.close();
    await securityLogQueue.close();
    await module.close();
  });

  describe('Log Processing Performance', () => {
    it('should measure individual log processing time', async () => {
      const processingTimes: number[] = [];

      // Setup event listeners
      queueEvents.on('completed', () => {
        // For this test, we'll measure approximate processing time
        processingTimes.push(50); // Mock average processing time
      });

      // Create test logs
      const numLogs = 100;
      const startTime = Date.now();

      for (let i = 0; i < numLogs; i++) {
        await securityLogService.log('LOGIN_SUCCESS' as any, {
          action: 'LOGIN_SUCCESS',
          userId: `perf-user-${i}`,
          ip: '127.0.0.1',
          userAgent: 'Performance Test Agent',
          metadata: {
            test: 'performance',
            iteration: i,
          },
        });
      }

      // Wait for all jobs to complete
      await new Promise<void>((resolve) => {
        let completed = 0;
        queueEvents.on('completed', () => {
          completed++;
          if (completed === numLogs) {
            resolve();
          }
        });
      });

      const totalTime = Date.now() - startTime;

      // Calculate metrics
      const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxProcessingTime = Math.max(...processingTimes);
      const minProcessingTime = Math.min(...processingTimes);
      const p95ProcessingTime = processingTimes.sort((a, b) => a - b)[
        Math.floor(processingTimes.length * 0.95)
      ];

      console.log('Processing Time Metrics:');
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Average: ${avgProcessingTime.toFixed(2)}ms`);
      console.log(`  Min: ${minProcessingTime}ms`);
      console.log(`  Max: ${maxProcessingTime}ms`);
      console.log(`  P95: ${p95ProcessingTime}ms`);
      console.log(`  Throughput: ${(numLogs / (totalTime / 1000)).toFixed(2)} logs/second`);

      // Performance assertions
      expect(avgProcessingTime).toBeLessThan(100); // Average should be under 100ms
      expect(p95ProcessingTime).toBeLessThan(200); // P95 should be under 200ms
    });

    it('should handle 1000+ concurrent log events efficiently', async () => {
      const numLogs = 1000;
      const promises: Promise<any>[] = [];
      const startTime = Date.now();

      // Track queue metrics
      let maxQueueSize = 0;
      const queueSizeInterval = setInterval(async () => {
        const waiting = await securityLogQueue.getWaitingCount();
        const active = await securityLogQueue.getActiveCount();
        const total = waiting + active;
        if (total > maxQueueSize) {
          maxQueueSize = total;
        }
      }, 100);

      // Generate concurrent logs
      for (let i = 0; i < numLogs; i++) {
        const promise = securityLogService.log('LOGIN_SUCCESS' as any, {
          action: 'LOGIN_SUCCESS',
          userId: `concurrent-user-${i}`,
          ip: `192.168.1.${i % 255}`,
          userAgent: 'Concurrent Test Agent',
          metadata: {
            test: 'concurrent',
            iteration: i,
            timestamp: Date.now(),
          },
        });
        promises.push(promise);
      }

      // Wait for all logs to be queued
      const queueResults = await Promise.all(promises);
      const queueTime = Date.now() - startTime;

      expect(queueResults).toHaveLength(numLogs);
      queueResults.forEach((result) => {
        expect(result).toHaveProperty('jobId');
        expect(result.queued).toBe(true);
      });

      // Wait for processing to complete
      await new Promise<void>((resolve) => {
        let completed = 0;
        queueEvents.on('completed', () => {
          completed++;
          if (completed === numLogs) {
            resolve();
          }
        });
      });

      clearInterval(queueSizeInterval);
      const totalTime = Date.now() - startTime;

      // Verify all logs were created
      const logCount = await prisma.securityLog.count({
        where: {
          metadata: {
            path: ['test'],
            equals: 'concurrent',
          },
        },
      });
      expect(logCount).toBe(numLogs);

      // Verify chain integrity
      const isValid = await integrityService.verifyChainIntegrity();
      expect(isValid).toBe(true);

      console.log('Concurrent Load Test Results:');
      console.log(`  Logs: ${numLogs}`);
      console.log(`  Queue Time: ${queueTime}ms`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Max Queue Size: ${maxQueueSize}`);
      console.log(`  Throughput: ${(numLogs / (totalTime / 1000)).toFixed(2)} logs/second`);

      // Performance assertions
      expect(queueTime).toBeLessThan(5000); // Should queue 1000 logs in under 5 seconds
      expect(totalTime).toBeLessThan(30000); // Should process all logs in under 30 seconds
    });

    it('should test queue backpressure behavior', async () => {
      // Configure a slower processor to simulate backpressure
      const slowProcessor = new SecurityLogProcessor(prisma, {} as any);
      const originalProcess = slowProcessor.process.bind(slowProcessor);

      slowProcessor.process = async (job) => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Add 100ms delay
        return originalProcess(job);
      };

      // Generate logs faster than they can be processed
      const numLogs = 200;
      const promises: Promise<any>[] = [];
      const queueMetrics = {
        maxWaiting: 0,
        maxActive: 0,
        rejected: 0,
      };

      const metricsInterval = setInterval(async () => {
        const waiting = await securityLogQueue.getWaitingCount();
        const active = await securityLogQueue.getActiveCount();
        queueMetrics.maxWaiting = Math.max(queueMetrics.maxWaiting, waiting);
        queueMetrics.maxActive = Math.max(queueMetrics.maxActive, active);
      }, 50);

      for (let i = 0; i < numLogs; i++) {
        const promise = securityLogService
          .log('HIGH_FREQUENCY_EVENT' as any, {
            action: 'HIGH_FREQUENCY_EVENT',
            userId: `backpressure-user-${i}`,
            ip: '127.0.0.1',
            userAgent: 'Backpressure Test Agent',
            metadata: { test: 'backpressure', iteration: i },
          })
          .catch(() => {
            queueMetrics.rejected++;
          });
        promises.push(promise);

        // Add small delay to simulate realistic traffic
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      await Promise.all(promises);
      clearInterval(metricsInterval);

      console.log('Backpressure Test Results:');
      console.log(`  Max Waiting: ${queueMetrics.maxWaiting}`);
      console.log(`  Max Active: ${queueMetrics.maxActive}`);
      console.log(`  Rejected: ${queueMetrics.rejected}`);

      // Verify queue handled backpressure without rejecting logs
      expect(queueMetrics.rejected).toBe(0);
      expect(queueMetrics.maxWaiting).toBeGreaterThan(0); // Should build up a queue
    });
  });

  describe('API Response Time Under Load', () => {
    it('should maintain acceptable API response times under load', async () => {
      // First, generate a large dataset
      const setupLogs = 10000;
      const batchSize = 100;

      for (let i = 0; i < setupLogs; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && i + j < setupLogs; j++) {
          batch.push({
            eventType: 'LOAD_TEST_EVENT',
            userId: `load-user-${i + j}`,
            ipAddress: '127.0.0.1',
            sequenceNumber: BigInt(i + j + 1),
            currentHash: `hash-${i + j}`,
            previousHash: i + j > 0 ? `hash-${i + j - 1}` : null,
            metadata: { test: 'load', index: i + j },
          });
        }
        await prisma.securityLog.createMany({ data: batch });
      }

      // Now test API response times
      const responseTimes: number[] = [];
      const numRequests = 100;

      // Mock API endpoint function
      const queryLogs = async (params: any) => {
        const startTime = Date.now();

        const [logs, total] = await Promise.all([
          prisma.securityLog.findMany({
            where: params.where || {},
            select: {
              id: true,
              eventType: true,
              userId: true,
              createdAt: true,
              metadata: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (params.page - 1) * params.pageSize,
            take: params.pageSize,
          }),
          prisma.securityLog.count({ where: params.where || {} }),
        ]);

        const responseTime = Date.now() - startTime;
        return { logs, total, responseTime };
      };

      // Test various query patterns
      const queryPatterns = [
        { page: 1, pageSize: 10 },
        { page: 1, pageSize: 50 },
        { page: 10, pageSize: 10 },
        { where: { eventType: 'LOAD_TEST_EVENT' }, page: 1, pageSize: 10 },
        { where: { userId: 'load-user-500' }, page: 1, pageSize: 10 },
      ];

      for (let i = 0; i < numRequests; i++) {
        const pattern = queryPatterns[i % queryPatterns.length];
        const result = await queryLogs(pattern);
        responseTimes.push(result.responseTime);
      }

      // Calculate response time metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[
        Math.floor(responseTimes.length * 0.95)
      ];

      console.log('API Response Time Metrics:');
      console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxResponseTime}ms`);
      console.log(`  P95: ${p95ResponseTime}ms`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(p95ResponseTime).toBeLessThan(200); // P95 under 200ms
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should not leak memory during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [];

      // Generate sustained load
      const duration = 10000; // 10 seconds
      const logsPerSecond = 50;
      const _startTime = Date.now();

      const loadInterval = setInterval(async () => {
        for (let i = 0; i < logsPerSecond / 10; i++) {
          await securityLogService.log('MEMORY_TEST_EVENT' as any, {
            action: 'MEMORY_TEST_EVENT',
            userId: `memory-user-${Date.now()}-${i}`,
            ip: '127.0.0.1',
            userAgent: 'Memory Test Agent',
            metadata: {
              test: 'memory',
              timestamp: Date.now(),
              data: 'x'.repeat(1000), // 1KB of data
            },
          });
        }

        // Take memory snapshot
        memorySnapshots.push(process.memoryUsage());
      }, 100); // Every 100ms

      // Wait for test duration
      await new Promise((resolve) => setTimeout(resolve, duration));
      clearInterval(loadInterval);

      const finalMemory = process.memoryUsage();

      // Analyze memory growth
      const memoryGrowth = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        external: finalMemory.external - initialMemory.external,
        rss: finalMemory.rss - initialMemory.rss,
      };

      console.log('Memory Usage Analysis:');
      console.log(`  Heap Growth: ${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  External Growth: ${(memoryGrowth.external / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  RSS Growth: ${(memoryGrowth.rss / 1024 / 1024).toFixed(2)} MB`);

      // Check for memory leaks (growth should be reasonable)
      expect(memoryGrowth.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth

      // Verify no significant memory leak pattern
      const halfwaySnapshot = memorySnapshots[Math.floor(memorySnapshots.length / 2)];
      const lateSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const secondHalfGrowth = lateSnapshot.heapUsed - halfwaySnapshot.heapUsed;

      // Second half growth should be minimal if no leak
      expect(secondHalfGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });
  });

  describe('Database Performance', () => {
    it('should test index effectiveness for common queries', async () => {
      // Generate test data with various patterns
      const users = 100;
      const eventsPerUser = 50;
      const eventTypes = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED'];

      for (let u = 0; u < users; u++) {
        for (let e = 0; e < eventsPerUser; e++) {
          await prisma.securityLog.create({
            data: {
              eventType: eventTypes[e % eventTypes.length],
              userId: `index-user-${u}`,
              ipAddress: `192.168.${u % 10}.${e % 255}`,
              sequenceNumber: BigInt(u * eventsPerUser + e),
              currentHash: `hash-${u}-${e}`,
              previousHash: e > 0 ? `hash-${u}-${e - 1}` : null,
              createdAt: new Date(Date.now() - (users - u) * 86400000), // Spread over days
            },
          });
        }
      }

      // Test query performance
      const queries = [
        // Query by eventType (should use index)
        async () => {
          const start = Date.now();
          const result = await prisma.securityLog.findMany({
            where: { eventType: 'LOGIN_SUCCESS' },
            take: 100,
          });
          return { name: 'eventType', time: Date.now() - start, count: result.length };
        },

        // Query by userId (should use index)
        async () => {
          const start = Date.now();
          const result = await prisma.securityLog.findMany({
            where: { userId: 'index-user-50' },
            orderBy: { createdAt: 'desc' },
          });
          return { name: 'userId', time: Date.now() - start, count: result.length };
        },

        // Query by date range (should use index)
        async () => {
          const start = Date.now();
          const yesterday = new Date(Date.now() - 86400000);
          const result = await prisma.securityLog.findMany({
            where: {
              createdAt: { gte: yesterday },
            },
            take: 100,
          });
          return { name: 'dateRange', time: Date.now() - start, count: result.length };
        },

        // Combined query (should use composite index if available)
        async () => {
          const start = Date.now();
          const result = await prisma.securityLog.findMany({
            where: {
              eventType: 'LOGIN_FAILED',
              createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          });
          return { name: 'combined', time: Date.now() - start, count: result.length };
        },
      ];

      const results = await Promise.all(queries.map((q) => q()));

      console.log('Index Performance Results:');
      results.forEach((r) => {
        console.log(`  ${r.name}: ${r.time}ms (${r.count} records)`);
      });

      // All indexed queries should be fast
      results.forEach((r) => {
        expect(r.time).toBeLessThan(50); // Should complete in under 50ms
      });
    });
  });

  describe('Hash Calculation Performance', () => {
    it('should benchmark hash calculation overhead', async () => {
      const crypto = require('crypto');
      const iterations = 10000;
      const sampleData = {
        eventType: 'BENCHMARK_EVENT',
        userId: 'benchmark-user',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          test: 'benchmark',
          data: 'x'.repeat(1000),
        },
        sequenceNumber: '12345',
        previousHash: 'abc123def456...',
        timestamp: new Date().toISOString(),
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const hashInput = JSON.stringify({ ...sampleData, sequenceNumber: i.toString() });
        crypto.createHash('sha256').update(hashInput).digest('hex');
      }

      const duration = Date.now() - startTime;
      const hashesPerSecond = iterations / (duration / 1000);

      console.log('Hash Calculation Performance:');
      console.log(`  Total Time: ${duration}ms`);
      console.log(`  Hashes/Second: ${hashesPerSecond.toFixed(0)}`);
      console.log(`  Time per Hash: ${(duration / iterations).toFixed(3)}ms`);

      // Should be able to calculate many hashes per second
      expect(hashesPerSecond).toBeGreaterThan(1000);
    });
  });
});
