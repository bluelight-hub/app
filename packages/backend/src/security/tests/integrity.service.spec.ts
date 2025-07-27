import { Test } from '@nestjs/testing';
import { IntegrityService } from '../services/integrity.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// Define SecurityLog type for testing
interface SecurityLog {
  id: string;
  eventType: string;
  severity: string;
  userId: string;
  user: null;
  ipAddress: string;
  userAgent: string;
  sessionId: string | null;
  metadata: any;
  message: string | null;
  sequenceNumber: bigint;
  previousHash: string | null;
  currentHash: string;
  hashAlgorithm: string;
  createdAt: Date;
}

describe('IntegrityService', () => {
  let service: IntegrityService;

  const mockFindMany = jest.fn();
  const mockFindFirst = jest.fn();
  const mockFindUnique = jest.fn();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IntegrityService,
        {
          provide: PrismaService,
          useValue: {
            securityLog: {
              findMany: mockFindMany,
              findFirst: mockFindFirst,
              findUnique: mockFindUnique,
            },
          },
        },
      ],
    }).compile();

    service = module.get<IntegrityService>(IntegrityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockReset();
    mockFindFirst.mockReset();
    mockFindUnique.mockReset();
  });

  describe('verifyChainIntegrity', () => {
    const createMockLog = (
      id: string,
      currentHash: string,
      previousHash: string | null,
      sequenceNumber: bigint,
    ): SecurityLog => ({
      id,
      eventType: 'USER_LOGIN',
      severity: 'INFO',
      userId: 'user123',
      user: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      sessionId: null,
      metadata: null,
      message: null,
      sequenceNumber,
      previousHash,
      currentHash,
      hashAlgorithm: 'SHA256',
      createdAt: new Date(),
    });

    it('should return valid for empty logs', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await service.verifyChainIntegrity();

      expect(result).toBe(true);
    });

    it('should verify a valid chain', async () => {
      const hash1 = crypto.randomBytes(32).toString('hex');
      const hash2 = crypto.randomBytes(32).toString('hex');
      const hash3 = crypto.randomBytes(32).toString('hex');

      const logs = [
        createMockLog('1', hash1, null, 1n),
        createMockLog('2', hash2, hash1, 2n),
        createMockLog('3', hash3, hash2, 3n),
      ];

      mockFindMany.mockResolvedValue(logs);

      const result = await service.verifyChainIntegrity();

      expect(result).toBe(true);
    });

    it('should detect broken chain when first entry has previousHash', async () => {
      const logs = [createMockLog('1', 'hash1', 'wronghash', 1n)];

      mockFindMany.mockResolvedValue(logs);

      const result = await service.verifyChainIntegrity();

      expect(result).toBe(false);
    });

    it('should detect broken chain when previousHash mismatch', async () => {
      const hash1 = crypto.randomBytes(32).toString('hex');
      const hash2 = crypto.randomBytes(32).toString('hex');

      const logs = [
        createMockLog('1', hash1, null, 1n),
        createMockLog('2', hash2, 'wronghash', 2n), // Should be hash1
      ];

      mockFindMany.mockResolvedValue(logs);

      const result = await service.verifyChainIntegrity();

      expect(result).toBe(false);
    });

    it('should detect invalid hash format', async () => {
      const logs = [createMockLog('1', 'invalid-hash', null, 1n)];

      mockFindMany.mockResolvedValue(logs);

      const result = await service.verifyChainIntegrity();

      expect(result).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const hash1 = crypto.randomBytes(32).toString('hex');
      const hash2 = crypto.randomBytes(32).toString('hex');

      const logs = [createMockLog('1', hash1, null, 1n), createMockLog('2', hash2, hash1, 2n)];

      mockFindMany.mockResolvedValue(logs);

      const result = await service.verifyChainIntegrity(2);

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { sequenceNumber: 'asc' },
        take: 2,
      });

      expect(result).toBe(true);
    });
  });

  describe('findLastValidEntry', () => {
    it('should return last entry ID for valid chain', async () => {
      const hash = crypto.randomBytes(32).toString('hex');
      const lastLog = {
        id: '10',
        currentHash: hash,
        previousHash: 'somehash',
      };

      // Mock the findMany call for verifyChainIntegrityDetailed
      mockFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(lastLog);

      const result = await service.findLastValidEntry();

      expect(result).toBe('10');
      expect(mockFindFirst).toHaveBeenCalledWith({
        orderBy: { sequenceNumber: 'desc' },
      });
    });

    it('should return null for empty chain', async () => {
      // Mock the findMany call for verifyChainIntegrityDetailed
      mockFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(null);

      const result = await service.findLastValidEntry();

      expect(result).toBeNull();
    });

    it('should return ID before broken entry', async () => {
      const hash1 = crypto.randomBytes(32).toString('hex');
      const hash2 = crypto.randomBytes(32).toString('hex');
      const hash3 = crypto.randomBytes(32).toString('hex');
      const hash4 = crypto.randomBytes(32).toString('hex');
      const hash5 = crypto.randomBytes(32).toString('hex');

      // Create mock logs with broken chain at log 5
      const logs = [
        { id: '1', currentHash: hash1, previousHash: null, sequenceNumber: 1n },
        { id: '2', currentHash: hash2, previousHash: hash1, sequenceNumber: 2n },
        { id: '3', currentHash: hash3, previousHash: hash2, sequenceNumber: 3n },
        { id: '4', currentHash: hash4, previousHash: hash3, sequenceNumber: 4n },
        { id: '5', currentHash: hash5, previousHash: 'wronghash', sequenceNumber: 5n }, // broken chain - should be hash4
      ];

      // Mock the findMany call for verifyChainIntegrityDetailed
      mockFindMany.mockResolvedValue(logs);

      // Mock the broken log with sequenceNumber
      mockFindUnique.mockResolvedValue({
        id: '5',
        sequenceNumber: 5n,
      });

      // Mock the previous log
      mockFindFirst.mockResolvedValue({
        id: '4',
        sequenceNumber: 4n,
      });

      const result = await service.findLastValidEntry();

      expect(result).toBe('4');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: '5' },
      });
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { sequenceNumber: 4n },
      });
    });

    it('should return null when first entry is broken', async () => {
      // Create mock log with broken first entry (has previousHash when it shouldn't)
      const logs = [
        { id: '1', currentHash: 'hash1', previousHash: 'shouldbenull', sequenceNumber: 1n },
      ];

      // Mock the findMany call for verifyChainIntegrityDetailed
      mockFindMany.mockResolvedValue(logs);

      const result = await service.findLastValidEntry();

      expect(result).toBeNull();
    });
  });
});
