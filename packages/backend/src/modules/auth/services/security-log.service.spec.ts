import { Test, TestingModule } from '@nestjs/testing';
import { SecurityLogService } from './security-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { SecurityLogHashService } from './security-log-hash.service';

describe('SecurityLogService', () => {
  let service: SecurityLogService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _hashService: jest.Mocked<SecurityLogHashService>;

  const mockPrismaService = {
    securityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null), // No previous log
      aggregate: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    }),
  } as any;

  const mockHashService = {
    calculateHash: jest.fn().mockReturnValue('mocked-hash'),
    verifyHashChain: jest.fn().mockResolvedValue(true),
    verifyChainIntegrity: jest.fn().mockReturnValue({ isValid: true }),
    createChainCheckpoint: jest.fn().mockReturnValue({
      sequenceNumber: BigInt(100),
      hash: 'checkpoint-hash',
      merkleRoot: 'merkle-root',
      count: 100,
      timestamp: new Date(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SecurityLogHashService,
          useValue: mockHashService,
        },
      ],
    }).compile();

    service = module.get<SecurityLogService>(SecurityLogService);
    _prismaService = module.get(PrismaService);
    _hashService = module.get(SecurityLogHashService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const params = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { foo: 'bar' },
      };

      await service.logSecurityEvent(params);

      expect(mockHashService.calculateHash).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: params.eventType,
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata,
          createdAt: expect.any(Date),
          severity: 'INFO',
          message: null,
          sessionId: null,
          sequenceNumber: 1n,
        }),
        null, // previousHash
      );

      expect(mockPrismaService.securityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: params.eventType,
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata,
          createdAt: expect.any(Date),
          severity: 'INFO',
          message: null,
          sessionId: null,
          sequenceNumber: 1n,
          currentHash: 'mocked-hash',
          previousHash: null,
          hashAlgorithm: 'SHA256',
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const params = {
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: 'user123',
      };

      mockPrismaService.securityLog.create.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.logSecurityEvent(params)).resolves.not.toThrow();
    });
  });

  describe('getSecurityLogs', () => {
    it('should retrieve security logs with filters', async () => {
      const filters = {
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: 'user123',
        ipAddress: '192.168.1.1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 50,
      };

      const mockLogs = [
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_FAILED,
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: {
            id: 'user123',
            email: 'user@example.com',
            role: 'USER',
          },
        },
      ];

      mockPrismaService.securityLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getSecurityLogs(filters);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {
          eventType: filters.eventType,
          userId: filters.userId,
          ipAddress: filters.ipAddress,
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      expect(result).toEqual(mockLogs);
    });

    it('should use default limit of 100', async () => {
      await service.getSecurityLogs({});

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs', async () => {
      const daysToKeep = 30;
      const deletedCount = 150;

      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: deletedCount });

      const result = await service.cleanupOldLogs(daysToKeep);

      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      expect(result).toBe(deletedCount);
    });

    it('should use default retention period of 90 days', async () => {
      await service.cleanupOldLogs();

      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalled();
    });
  });

  describe('getUserSecurityEvents', () => {
    it('should get security events for a user', async () => {
      const userId = 'user123';
      const limit = 5;

      await service.getUserSecurityEvents(userId, limit);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  });

  describe('getIpSecurityEvents', () => {
    it('should get security events for an IP address', async () => {
      const ipAddress = '192.168.1.1';
      const limit = 5;

      await service.getIpSecurityEvents(ipAddress, limit);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: { ipAddress },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  });

  describe('verifyLogChainIntegrity', () => {
    it('should verify log chain integrity', async () => {
      const mockLogs = [
        {
          id: '1',
          sequenceNumber: BigInt(1),
          previousHash: null,
          currentHash: 'hash1',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user1',
          createdAt: new Date(),
        },
        {
          id: '2',
          sequenceNumber: BigInt(2),
          previousHash: 'hash1',
          currentHash: 'hash2',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user1',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.securityLog.findMany.mockResolvedValue(mockLogs);
      mockHashService.verifyChainIntegrity.mockReturnValue({
        isValid: true,
        totalChecked: 2,
      });

      const result = await service.verifyLogChainIntegrity(BigInt(1), BigInt(2));

      expect(result).toEqual({
        isValid: true,
        totalChecked: 2,
        brokenAtSequence: undefined,
        error: undefined,
      });

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {
          sequenceNumber: {
            gte: BigInt(1),
            lte: BigInt(2),
          },
        },
        orderBy: { sequenceNumber: 'asc' },
      });

      expect(mockHashService.verifyChainIntegrity).toHaveBeenCalledWith(mockLogs);
    });

    it('should return valid for empty logs', async () => {
      mockPrismaService.securityLog.findMany.mockResolvedValue([]);

      const result = await service.verifyLogChainIntegrity();

      expect(result).toEqual({
        isValid: true,
        totalChecked: 0,
      });
    });

    it('should handle broken chain', async () => {
      mockPrismaService.securityLog.findMany.mockResolvedValue([{}, {}]);
      mockHashService.verifyChainIntegrity.mockReturnValue({
        isValid: false,
        brokenAtSequence: BigInt(5),
        error: 'Hash mismatch',
      });

      const result = await service.verifyLogChainIntegrity();

      expect(result).toEqual({
        isValid: false,
        totalChecked: 2,
        brokenAtSequence: BigInt(5),
        error: 'Hash mismatch',
      });
    });

    it('should handle errors', async () => {
      mockPrismaService.securityLog.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.verifyLogChainIntegrity()).rejects.toThrow('Database error');
    });
  });

  describe('createLogChainCheckpoint', () => {
    it('should create a checkpoint', async () => {
      const mockLogs = [
        {
          id: '1',
          sequenceNumber: BigInt(1),
          previousHash: null,
          currentHash: 'hash1',
        },
      ];

      mockPrismaService.securityLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.createLogChainCheckpoint(100);

      expect(result).toEqual({
        sequenceNumber: BigInt(100),
        hash: 'checkpoint-hash',
        merkleRoot: 'merkle-root',
        count: 100,
        timestamp: expect.any(Date),
      });

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        orderBy: { sequenceNumber: 'desc' },
        take: 100,
      });

      expect(mockHashService.createChainCheckpoint).toHaveBeenCalledWith(mockLogs);

      // Should log checkpoint event
      expect(mockPrismaService.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: SecurityEventType.SYSTEM_CHECKPOINT,
          severity: 'INFO',
          message: 'Log chain checkpoint created',
        }),
      });
    });

    it('should return null for empty logs', async () => {
      mockPrismaService.securityLog.findMany.mockResolvedValue([]);

      const result = await service.createLogChainCheckpoint();

      expect(result).toBeNull();
      expect(mockHashService.createChainCheckpoint).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockPrismaService.securityLog.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.createLogChainCheckpoint()).rejects.toThrow('Database error');
    });
  });

  describe('detectLogAnomalies', () => {
    it('should detect missing sequences', async () => {
      mockPrismaService.securityLog.aggregate.mockResolvedValue({
        _min: { sequenceNumber: BigInt(1) },
        _max: { sequenceNumber: BigInt(5) },
      });

      mockPrismaService.securityLog.findMany.mockResolvedValue([
        { sequenceNumber: BigInt(1) },
        { sequenceNumber: BigInt(3) },
        { sequenceNumber: BigInt(5) },
      ]);

      mockHashService.verifyChainIntegrity.mockReturnValue({ isValid: true });

      const result = await service.detectLogAnomalies();

      expect(result.missingSequences).toEqual([BigInt(2), BigInt(4)]);
      expect(result.brokenChains).toEqual([]);
    });

    it('should detect broken chains', async () => {
      mockPrismaService.securityLog.aggregate.mockResolvedValue({
        _min: { sequenceNumber: BigInt(1) },
        _max: { sequenceNumber: BigInt(1000) },
      });

      mockPrismaService.securityLog.findMany.mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({ sequenceNumber: BigInt(i + 1) })),
      );

      // Mock that the chain is broken at sequence 500
      jest.spyOn(service, 'verifyLogChainIntegrity').mockResolvedValueOnce({
        isValid: false,
        totalChecked: 500,
        brokenAtSequence: BigInt(500),
        error: 'Hash mismatch at sequence 500',
      });

      const result = await service.detectLogAnomalies();

      expect(result.brokenChains).toContainEqual({
        sequence: BigInt(500),
        error: 'Hash mismatch at sequence 500',
      });
    });

    it('should handle empty logs', async () => {
      mockPrismaService.securityLog.aggregate.mockResolvedValue({
        _min: { sequenceNumber: null },
        _max: { sequenceNumber: null },
      });

      const result = await service.detectLogAnomalies();

      expect(result).toEqual({
        missingSequences: [],
        invalidHashes: [],
        brokenChains: [],
      });
    });

    it('should handle errors', async () => {
      mockPrismaService.securityLog.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(service.detectLogAnomalies()).rejects.toThrow('Database error');
    });
  });

  describe('exportVerifiedLogs', () => {
    it('should export logs with verification', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        eventTypes: [SecurityEventType.LOGIN_SUCCESS, SecurityEventType.LOGIN_FAILED],
        verifyIntegrity: true,
      };

      const mockLogs = [
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          user: { id: 'user1', email: 'user@example.com', role: 'USER' },
        },
      ];

      mockPrismaService.securityLog.findMany.mockResolvedValue(mockLogs);
      mockHashService.verifyChainIntegrity.mockReturnValue({ isValid: true });

      const result = await service.exportVerifiedLogs(filters);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
          eventType: { in: filters.eventTypes },
        },
        orderBy: { sequenceNumber: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      expect(result).toEqual({
        logs: mockLogs,
        exportedAt: expect.any(Date),
        totalCount: 1,
        verification: { isValid: true },
      });

      expect(mockHashService.verifyChainIntegrity).toHaveBeenCalledWith(mockLogs);
    });

    it('should export without verification when not requested', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        verifyIntegrity: false,
      };

      mockPrismaService.securityLog.findMany.mockResolvedValue([]);

      const result = await service.exportVerifiedLogs(filters);

      expect(result.verification).toBeNull();
      expect(mockHashService.verifyChainIntegrity).not.toHaveBeenCalled();
    });

    it('should handle empty event types filter', async () => {
      const filters = {
        eventTypes: [],
      };

      await service.exportVerifiedLogs(filters);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { sequenceNumber: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('transaction handling', () => {
    it('should handle transaction with existing log correctly', async () => {
      const existingLog = {
        sequenceNumber: BigInt(5),
        currentHash: 'previous-hash-value',
      };

      mockPrismaService.securityLog.findFirst.mockResolvedValue(existingLog);

      const params = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
      };

      await service.logSecurityEvent(params);

      expect(mockHashService.calculateHash).toHaveBeenCalledWith(
        expect.objectContaining({
          sequenceNumber: BigInt(6),
        }),
        'previous-hash-value',
      );

      expect(mockPrismaService.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sequenceNumber: BigInt(6),
          previousHash: 'previous-hash-value',
        }),
      });
    });

    it('should include all optional parameters', async () => {
      const params = {
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { resource: '/api/admin' },
        sessionId: 'session-123',
        severity: 'WARNING',
        message: 'Access denied to admin resource',
      };

      await service.logSecurityEvent(params);

      expect(mockPrismaService.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: params.eventType,
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata,
          sessionId: params.sessionId,
          severity: params.severity,
          message: params.message,
        }),
      });
    });
  });
});
