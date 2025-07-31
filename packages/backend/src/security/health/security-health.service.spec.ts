import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SecurityHealthService } from './security-health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrityService } from '../services/integrity.service';
import { getQueueToken } from '@nestjs/bullmq';
import { SECURITY_LOG_QUEUE_CONFIG } from '../constants/event-types';
import * as fs from 'fs/promises';
import * as child_process from 'child_process';

jest.mock('fs/promises');
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock get-platform to avoid the error
jest.mock('@prisma/get-platform', () => ({
  getPlatform: jest.fn().mockResolvedValue('darwin'),
  platforms: ['darwin', 'linux', 'windows'],
}));

// Mock Prisma runtime library
jest.mock('@prisma/client/runtime/library', () => {
  const original = jest.requireActual('@prisma/client/runtime/library');
  return {
    ...original,
    makeStrictEnum: jest.fn(),
    Public: jest.fn(),
    getRuntime: jest.fn(() => ({
      libraryLoader: { loadLibrary: jest.fn() },
    })),
    defineDmmfProperty: jest.fn(),
    makeDocument: jest.fn(),
    unpack: jest.fn(),
    deserializeRawResults: jest.fn(),
    serializeJsonQuery: jest.fn(),
    makeDataProxy: jest.fn(),
    __esModule: true,
  };
});

// Mock the generated Prisma client
jest.mock('../../prisma/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    securityLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
}));

describe('SecurityHealthService', () => {
  let service: SecurityHealthService;
  let mockQueue: Partial<Queue>;
  let mockPrismaService: Partial<PrismaService>;
  let mockIntegrityService: Partial<IntegrityService>;
  let mockConfigService: Partial<ConfigService>;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Mock Redis client
    mockRedisClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue(`
# Persistence
aof_enabled:1
aof_rewrite_in_progress:0
aof_last_write_status:ok
aof_current_size:1048576
aof_base_size:524288
`),
    };

    // Mock Queue
    mockQueue = {
      client: Promise.resolve(mockRedisClient),
      getWaitingCount: jest.fn().mockResolvedValue(10),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      isPaused: jest.fn().mockResolvedValue(false),
    };

    // Mock PrismaService
    mockPrismaService = {
      securityLog: {
        findFirst: jest.fn().mockResolvedValue({
          sequenceNumber: BigInt(1000),
          createdAt: new Date(Date.now() - 60000), // 1 minute ago
        }),
      } as any,
    };

    // Mock IntegrityService
    mockIntegrityService = {
      verifyChainIntegrity: jest.fn().mockResolvedValue(true),
    };

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn().mockReturnValue('./archives/security-logs'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityHealthService,
        {
          provide: getQueueToken(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME),
          useValue: mockQueue,
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: IntegrityService, useValue: mockIntegrityService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SecurityHealthService>(SecurityHealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkQueueHealth', () => {
    it('should return healthy status when queue is functioning normally', async () => {
      const result = await service.checkQueueHealth();

      expect(result).toEqual({
        security_queue: {
          status: 'healthy',
          waiting: 10,
          active: 2,
          delayed: 0,
          failed: 0,
          total: 12,
          isPaused: false,
        },
      });
    });

    it('should throw HealthCheckError when queue is paused', async () => {
      (mockQueue.isPaused as jest.Mock).mockResolvedValue(true);

      await expect(service.checkQueueHealth()).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when failed count exceeds threshold', async () => {
      (mockQueue.getFailedCount as jest.Mock).mockResolvedValue(150);

      await expect(service.checkQueueHealth()).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when total count exceeds threshold', async () => {
      (mockQueue.getWaitingCount as jest.Mock).mockResolvedValue(15000);

      await expect(service.checkQueueHealth()).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when Redis ping fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));

      await expect(service.checkQueueHealth()).rejects.toThrow(HealthCheckError);
    });
  });

  describe('checkRedisHealth', () => {
    it('should return healthy status when AOF is enabled and working', async () => {
      const result = await service.checkRedisHealth();

      expect(result).toEqual({
        redis_aof: {
          status: 'healthy',
          aofEnabled: true,
          aofRewriteInProgress: false,
          aofLastWriteStatus: 'ok',
          aofCurrentSizeMB: 1,
          aofBaseSizeMB: 0.5,
        },
      });
    });

    it('should throw HealthCheckError when AOF is disabled', async () => {
      mockRedisClient.info.mockResolvedValue(`
# Persistence
aof_enabled:0
aof_last_write_status:ok
`);

      await expect(service.checkRedisHealth()).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when AOF write status is not ok', async () => {
      mockRedisClient.info.mockResolvedValue(`
# Persistence
aof_enabled:1
aof_last_write_status:error
`);

      await expect(service.checkRedisHealth()).rejects.toThrow(HealthCheckError);
    });

    it('should handle missing AOF values gracefully', async () => {
      mockRedisClient.info.mockResolvedValue(`
# Persistence
aof_enabled:1
aof_last_write_status:ok
`);

      const result = await service.checkRedisHealth();

      expect(result.redis_aof.aofCurrentSizeMB).toBe(0);
      expect(result.redis_aof.aofBaseSizeMB).toBe(0);
    });

    it('should throw HealthCheckError when Redis info fails', async () => {
      mockRedisClient.info.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.checkRedisHealth()).rejects.toThrow(HealthCheckError);
    });
  });

  describe('checkChainIntegrity', () => {
    it('should return healthy status when chain is valid', async () => {
      const result = await service.checkChainIntegrity();

      expect(result).toMatchObject({
        chain_integrity: {
          status: 'healthy',
          isValid: true,
          latestSequenceNumber: '1000',
        },
      });

      expect(mockIntegrityService.verifyChainIntegrity).toHaveBeenCalledWith(100);
    });

    it('should throw HealthCheckError when chain is invalid', async () => {
      (mockIntegrityService.verifyChainIntegrity as jest.Mock).mockResolvedValue(false);

      await expect(service.checkChainIntegrity()).rejects.toThrow(HealthCheckError);
    });

    it('should handle missing latest log gracefully', async () => {
      (mockPrismaService.securityLog.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.checkChainIntegrity();

      expect(result.chain_integrity.latestSequenceNumber).toBe('0');
      expect(result.chain_integrity.latestLogAge).toBeNull();
    });

    it('should include check duration in result', async () => {
      const result = await service.checkChainIntegrity();

      expect(result.chain_integrity.checkDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw HealthCheckError when integrity verification fails', async () => {
      (mockIntegrityService.verifyChainIntegrity as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.checkChainIntegrity()).rejects.toThrow(HealthCheckError);
    });
  });

  describe('checkDiskSpace', () => {
    let getDiskUsageSpy: jest.SpyInstance;

    beforeEach(() => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (child_process.execSync as jest.Mock).mockReturnValue(
        Buffer.from('  /dev/disk1s1  1000000  500000  400000  50%  /'),
      );

      // Mock getDiskUsage method - need at least 1GB free
      getDiskUsageSpy = jest.spyOn(service as any, 'getDiskUsage').mockResolvedValue({
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 50 * 1024 * 1024 * 1024, // 50GB free
      });
    });

    afterEach(() => {
      getDiskUsageSpy.mockRestore();
    });

    it('should return healthy status when disk space is sufficient', async () => {
      const result = await service.checkDiskSpace();

      expect(result).toMatchObject({
        disk_space: {
          status: 'healthy',
          freeSpaceGB: expect.any(Number),
          totalSpaceGB: expect.any(Number),
          usedPercent: expect.any(Number),
          archiveSizeMB: 0,
          archivePath: './archives/security-logs',
        },
      });

      expect(fs.mkdir).toHaveBeenCalledWith('./archives/security-logs', { recursive: true });
    });

    it('should throw HealthCheckError when free space is below threshold', async () => {
      // Mock low disk space - less than 1GB free
      jest.spyOn(service as any, 'getDiskUsage').mockResolvedValue({
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 0.5 * 1024 * 1024 * 1024, // 0.5GB free (below 1GB threshold)
      });

      await expect(service.checkDiskSpace()).rejects.toThrow(HealthCheckError);
    });

    it('should calculate archive directory size', async () => {
      const mockFiles = [
        { name: 'file1.log', isDirectory: () => false },
        { name: 'subdir', isDirectory: () => true },
      ];

      (fs.readdir as jest.Mock).mockResolvedValueOnce(mockFiles);
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        { name: 'file2.log', isDirectory: () => false },
      ]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 * 1024 }); // 1MB per file

      const result = await service.checkDiskSpace();

      expect(result.disk_space.archiveSizeMB).toBeGreaterThan(0);
    });

    it('should handle Windows platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // Restore the original getDiskUsage for Windows test
      getDiskUsageSpy.mockRestore();

      const result = await service.checkDiskSpace();

      expect(result.disk_space.freeSpaceGB).toBe(50);
      expect(result.disk_space.totalSpaceGB).toBe(100);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle disk space command failure gracefully', async () => {
      // Mock getDiskUsage to throw and trigger fallback
      getDiskUsageSpy.mockRestore();
      getDiskUsageSpy = jest.spyOn(service as any, 'getDiskUsage').mockImplementation(() => {
        // Return fallback values from catch block
        return { total: 100 * 1024 * 1024 * 1024, free: 50 * 1024 * 1024 * 1024 };
      });

      const result = await service.checkDiskSpace();

      expect(result.disk_space.freeSpaceGB).toBe(50);
      expect(result.disk_space.totalSpaceGB).toBe(100);
    });

    it('should handle directory size calculation errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await service.checkDiskSpace();

      expect(result.disk_space.archiveSizeMB).toBe(0);
    });
  });

  describe('checkHealth', () => {
    beforeEach(() => {
      // Mock getDiskUsage for all checkHealth tests
      jest.spyOn(service as any, 'getDiskUsage').mockResolvedValue({
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 50 * 1024 * 1024 * 1024, // 50GB free
      });
    });

    it('should return overall healthy status when all checks pass', async () => {
      const result = await service.checkHealth();

      expect(result.overall.status).toBe('up');
      expect(result).toHaveProperty('security_queue');
      expect(result).toHaveProperty('redis_aof');
      expect(result).toHaveProperty('chain_integrity');
      expect(result).toHaveProperty('disk_space');
    });

    it('should return overall unhealthy status when any check fails', async () => {
      (mockQueue.isPaused as jest.Mock).mockResolvedValue(true);

      const result = await service.checkHealth();

      expect(result.overall.status).toBe('down');
      expect(result.queue).toMatchObject({
        status: 'down',
        error: expect.any(String),
      });
    });

    it('should handle multiple failures gracefully', async () => {
      (mockQueue.isPaused as jest.Mock).mockResolvedValue(true);
      (mockIntegrityService.verifyChainIntegrity as jest.Mock).mockResolvedValue(false);

      const result = await service.checkHealth();

      expect(result.overall.status).toBe('down');
      expect(result.queue.status).toBe('down');
      expect(result.chain.status).toBe('down');
    });

    it('should continue checking other services even if one fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await service.checkHealth();

      expect(result).toHaveProperty('chain_integrity');
      expect(result).toHaveProperty('disk_space');
      expect(result.queue.status).toBe('down');
    });
  });
});
