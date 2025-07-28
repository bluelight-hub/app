import { Test, TestingModule } from '@nestjs/testing';
import { SecurityLogHashService } from './security-log-hash.service';
import { SecurityLog } from '@prisma/generated/prisma';
import * as crypto from 'crypto';

describe('SecurityLogHashService', () => {
  let service: SecurityLogHashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityLogHashService],
    }).compile();

    service = module.get<SecurityLogHashService>(SecurityLogHashService);
  });

  describe('calculateHash', () => {
    it('should calculate hash for log data', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session123',
        metadata: { foo: 'bar' },
        message: 'User logged in',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const previousHash = 'previousHashValue';

      const hash = service.calculateHash(logData, previousHash);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hash for same input', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash1 = service.calculateHash(logData, null);
      const hash2 = service.calculateHash(logData, null);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different inputs', () => {
      const baseData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash1 = service.calculateHash(baseData, null);
      const hash2 = service.calculateHash({ ...baseData, userId: 'user456' }, null);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null/undefined fields correctly', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: null,
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        metadata: null,
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash = service.calculateHash(logData, null);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should include previousHash in calculation', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash1 = service.calculateHash(logData, 'previousHash1');
      const hash2 = service.calculateHash(logData, 'previousHash2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle complex metadata objects', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' },
          },
          boolean: true,
          number: 42,
        },
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash = service.calculateHash(logData, null);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });
  });

  describe('verifyLogIntegrity', () => {
    it('should verify valid log integrity', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const previousHash = 'previousHashValue';

      const expectedHash = service.calculateHash(logData, previousHash);

      const log: SecurityLog = {
        id: '1',
        ...logData,
        previousHash,
        currentHash: expectedHash,
        hashAlgorithm: 'SHA256',
      };

      const isValid = service.verifyLogIntegrity(log, previousHash);

      expect(isValid).toBe(true);
    });

    it('should detect invalid log integrity', () => {
      const log: SecurityLog = {
        id: '1',
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        previousHash: 'previousHashValue',
        currentHash: 'invalidHash',
        hashAlgorithm: 'SHA256',
      };

      const isValid = service.verifyLogIntegrity(log, 'previousHashValue');

      expect(isValid).toBe(false);
    });
  });

  describe('verifyChainIntegrity', () => {
    it('should verify valid chain', () => {
      const logs: SecurityLog[] = [];
      let previousHash: string | null = null;

      // Create a valid chain
      for (let i = 1; i <= 3; i++) {
        const logData = {
          sequenceNumber: BigInt(i),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: `user${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(`2024-01-0${i}T00:00:00Z`),
        };

        const currentHash = service.calculateHash(logData, previousHash);

        logs.push({
          id: `${i}`,
          ...logData,
          previousHash,
          currentHash,
          hashAlgorithm: 'SHA256',
        });

        previousHash = currentHash;
      }

      const result = service.verifyChainIntegrity(logs);

      expect(result).toEqual({
        isValid: true,
      });
    });

    it('should detect broken chain at specific sequence', () => {
      // Create first log with proper hash
      const log1Data = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const hash1 = service.calculateHash(log1Data, null);

      // Create second log with proper hash but wrong previousHash
      const log2Data = {
        sequenceNumber: BigInt(2),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user2',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-02T00:00:00Z'),
      };
      const hash2 = service.calculateHash(log2Data, 'wrongHash');

      const logs: SecurityLog[] = [
        {
          id: '1',
          ...log1Data,
          previousHash: null,
          currentHash: hash1,
          hashAlgorithm: 'SHA256',
        },
        {
          id: '2',
          ...log2Data,
          previousHash: 'wrongHash', // This should be hash1
          currentHash: hash2,
          hashAlgorithm: 'SHA256',
        },
      ];

      const result = service.verifyChainIntegrity(logs);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.brokenAtIndex).toBe(1);
      expect(result.brokenAtSequence).toBe(BigInt(2));
      expect(result.error).toBe('Previous hash mismatch at sequence 2');
    });

    it('should detect sequence gaps', () => {
      // Create first log with proper hash
      const log1Data = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const hash1 = service.calculateHash(log1Data, null);

      // Create second log with sequence gap but correct previousHash
      const log2Data = {
        sequenceNumber: BigInt(3), // Gap: should be 2
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user2',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-02T00:00:00Z'),
      };
      const hash2 = service.calculateHash(log2Data, hash1);

      const logs: SecurityLog[] = [
        {
          id: '1',
          ...log1Data,
          previousHash: null,
          currentHash: hash1,
          hashAlgorithm: 'SHA256',
        },
        {
          id: '2',
          ...log2Data,
          previousHash: hash1,
          currentHash: hash2,
          hashAlgorithm: 'SHA256',
        },
      ];

      const result = service.verifyChainIntegrity(logs);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.brokenAtIndex).toBe(1);
      expect(result.brokenAtSequence).toBe(BigInt(3));
      expect(result.error).toBe('Sequence gap detected: expected 2, got 3');
    });

    it('should detect invalid first log with previousHash', () => {
      const logs: SecurityLog[] = [
        {
          id: '1',
          sequenceNumber: BigInt(1),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: 'user1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          previousHash: 'shouldBeNull', // First log should have null previousHash
          currentHash: 'hash1',
          hashAlgorithm: 'SHA256',
        },
      ];

      const result = service.verifyChainIntegrity(logs);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.brokenAtIndex).toBe(0);
      expect(result.brokenAtSequence).toBe(BigInt(1));
      expect(result.error).toBe('First log entry should not have a previous hash');
    });

    it('should handle empty logs array', () => {
      const result = service.verifyChainIntegrity([]);

      expect(result).toEqual({
        isValid: true,
      });
    });
  });

  describe('findChainBreakpoint', () => {
    it('should find breakpoint in chain', () => {
      // Create first log with proper hash
      const log1Data = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const hash1 = service.calculateHash(log1Data, null);

      const validLog1: SecurityLog = {
        id: '1',
        ...log1Data,
        previousHash: null,
        currentHash: hash1,
        hashAlgorithm: 'SHA256',
      };

      // Create second log with invalid hash (tampered)
      const invalidLog: SecurityLog = {
        id: '2',
        sequenceNumber: BigInt(2),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user2',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-02T00:00:00Z'),
        previousHash: hash1,
        currentHash: 'tamperedHash', // This hash is invalid
        hashAlgorithm: 'SHA256',
      };

      const logs = [validLog1, invalidLog];

      const breakpoint = service.findChainBreakpoint(logs);

      expect(breakpoint).toBe(1);
    });

    it('should return -1 for valid chain', () => {
      const logs: SecurityLog[] = [];
      let previousHash: string | null = null;

      // Create a valid chain
      for (let i = 1; i <= 3; i++) {
        const logData = {
          sequenceNumber: BigInt(i),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: `user${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(`2024-01-0${i}T00:00:00Z`),
        };

        const currentHash = service.calculateHash(logData, previousHash);

        logs.push({
          id: `${i}`,
          ...logData,
          previousHash,
          currentHash,
          hashAlgorithm: 'SHA256',
        });

        previousHash = currentHash;
      }

      const breakpoint = service.findChainBreakpoint(logs);

      expect(breakpoint).toBe(-1);
    });

    it('should start search from specified index', () => {
      const logs: SecurityLog[] = [
        {
          id: '1',
          sequenceNumber: BigInt(1),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: 'user1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          previousHash: null,
          currentHash: 'invalidHash', // This is invalid but will be skipped
          hashAlgorithm: 'SHA256',
        },
        {
          id: '2',
          sequenceNumber: BigInt(2),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: 'user2',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          previousHash: 'hash1',
          currentHash: 'hash2',
          hashAlgorithm: 'SHA256',
        },
      ];

      const breakpoint = service.findChainBreakpoint(logs, 1);

      expect(breakpoint).toBe(1); // Should find break at index 1, not 0
    });
  });

  describe('calculateMerkleRoot', () => {
    it('should calculate merkle root for array of hashes', () => {
      const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];

      const merkleRoot = service.calculateMerkleRoot(hashes);

      expect(merkleRoot).toBeDefined();
      expect(merkleRoot).toHaveLength(64);
    });

    it('should return empty string for empty array', () => {
      const merkleRoot = service.calculateMerkleRoot([]);

      expect(merkleRoot).toBe('');
    });

    it('should return same hash for single element', () => {
      const hash = 'singleHash';
      const merkleRoot = service.calculateMerkleRoot([hash]);

      expect(merkleRoot).toBe(hash);
    });

    it('should handle odd number of hashes', () => {
      const hashes = ['hash1', 'hash2', 'hash3'];

      const merkleRoot = service.calculateMerkleRoot(hashes);

      expect(merkleRoot).toBeDefined();
      expect(merkleRoot).toHaveLength(64);
    });

    it('should produce consistent merkle root', () => {
      const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];

      const merkleRoot1 = service.calculateMerkleRoot(hashes);
      const merkleRoot2 = service.calculateMerkleRoot(hashes);

      expect(merkleRoot1).toBe(merkleRoot2);
    });

    it('should produce different merkle root for different inputs', () => {
      const hashes1 = ['hash1', 'hash2', 'hash3', 'hash4'];
      const hashes2 = ['hash1', 'hash2', 'hash3', 'hash5'];

      const merkleRoot1 = service.calculateMerkleRoot(hashes1);
      const merkleRoot2 = service.calculateMerkleRoot(hashes2);

      expect(merkleRoot1).not.toBe(merkleRoot2);
    });
  });

  describe('createChainCheckpoint', () => {
    it('should create checkpoint for logs', () => {
      const logs: SecurityLog[] = [
        {
          id: '1',
          sequenceNumber: BigInt(1),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: 'user1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          previousHash: null,
          currentHash: 'hash1',
          hashAlgorithm: 'SHA256',
        },
        {
          id: '2',
          sequenceNumber: BigInt(2),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: 'user2',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          previousHash: 'hash1',
          currentHash: 'hash2',
          hashAlgorithm: 'SHA256',
        },
      ];

      const checkpoint = service.createChainCheckpoint(logs);

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.sequenceNumber).toBe(BigInt(2));
      expect(checkpoint?.hash).toBe('hash2');
      expect(checkpoint?.merkleRoot).toEqual(expect.any(String));
      expect(checkpoint?.timestamp).toEqual(expect.any(Date));
      expect(checkpoint?.count).toBe(2);
    });

    it('should return null for empty logs', () => {
      const checkpoint = service.createChainCheckpoint([]);

      expect(checkpoint).toBeNull();
    });

    it('should use last log sequence number', () => {
      const logs: SecurityLog[] = [];
      for (let i = 1; i <= 10; i++) {
        logs.push({
          id: `${i}`,
          sequenceNumber: BigInt(i),
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          userId: `user${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(`2024-01-${i.toString().padStart(2, '0')}T00:00:00Z`),
          previousHash: i === 1 ? null : `hash${i - 1}`,
          currentHash: `hash${i}`,
          hashAlgorithm: 'SHA256',
        });
      }

      const checkpoint = service.createChainCheckpoint(logs);

      expect(checkpoint?.sequenceNumber).toBe(BigInt(10));
      expect(checkpoint?.hash).toBe('hash10');
      expect(checkpoint?.count).toBe(10);
    });
  });

  describe('hash algorithm consistency', () => {
    it('should use SHA-256 algorithm', () => {
      const logData = {
        sequenceNumber: BigInt(1),
        eventType: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: null,
        metadata: {},
        message: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      // Calculate hash using service
      const serviceHash = service.calculateHash(logData, null);

      // Calculate hash manually
      const dataToHash = [
        logData.sequenceNumber.toString(),
        logData.eventType,
        logData.severity,
        logData.userId || '',
        logData.ipAddress || '',
        logData.userAgent || '',
        logData.sessionId || '',
        JSON.stringify(logData.metadata || {}),
        logData.message || '',
        logData.createdAt.toISOString(),
        '',
      ].join('|');

      const manualHash = crypto.createHash('sha256').update(dataToHash, 'utf8').digest('hex');

      expect(serviceHash).toBe(manualHash);
    });
  });
});
