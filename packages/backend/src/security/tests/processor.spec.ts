import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SecurityLogProcessor } from '../processors/security-log.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityMetricsService } from '../metrics/security-metrics.service';
import { SecurityLogPayload } from '../interfaces/security-log.interface';
import * as crypto from 'crypto';

// Define SecurityLogAction enum for testing
enum SecurityLogAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  DATA_ACCESS = 'DATA_ACCESS',
}

describe('SecurityLogProcessor', () => {
  let processor: SecurityLogProcessor;

  const mockTransaction = jest.fn();
  const mockQueryRaw = jest.fn();
  const mockCreate = jest.fn();
  const mockMetricsService = {
    recordProcessingTime: jest.fn(),
    incrementEventCounter: jest.fn(),
    recordFailedJob: jest.fn(),
    recordSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SecurityLogProcessor,
        {
          provide: PrismaService,
          useValue: {
            $transaction: mockTransaction,
          },
        },
        {
          provide: SecurityMetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    processor = module.get<SecurityLogProcessor>(SecurityLogProcessor);

    // Setup transaction mock
    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        $queryRaw: mockQueryRaw,
        securityLog: {
          create: mockCreate,
        },
      };
      return callback(tx);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    const createMockJob = (data: SecurityLogPayload): Job<SecurityLogPayload> =>
      ({
        id: '123',
        data,
        opts: {},
        attemptsMade: 0,
        progress: jest.fn(),
        log: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        retry: jest.fn(),
        discard: jest.fn(),
        finished: jest.fn(),
        moveToCompleted: jest.fn(),
        moveToFailed: jest.fn(),
        promote: jest.fn(),
        name: 'security-log',
        queue: {} as any,
        timestamp: Date.now(),
        returnvalue: null,
        failedReason: undefined,
        stacktrace: [],
        finishedOn: null,
        processedOn: null,
      }) as unknown as Job<SecurityLogPayload>;

    it('should process a security log with no previous hash', async () => {
      const payload: SecurityLogPayload = {
        action: SecurityLogAction.USER_LOGIN,
        userId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 200,
      };

      const job = createMockJob(payload);

      mockQueryRaw.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 1n });

      await processor.process(job);

      expect(mockQueryRaw).toHaveBeenCalled();
      const queryCall = mockQueryRaw.mock.calls[0];
      expect(queryCall[0][0]).toMatch(
        /SELECT\s+"currentHash",\s+"sequenceNumber"\s+FROM\s+"SecurityLog"/s,
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: payload.action,
          userId: payload.userId,
          ipAddress: payload.ip,
          userAgent: payload.userAgent,
          currentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          previousHash: null,
          sequenceNumber: 1n,
        }),
      });
    });

    it('should process a security log with previous hash', async () => {
      const payload: SecurityLogPayload = {
        action: SecurityLogAction.USER_LOGOUT,
        userId: 'user123',
        ip: '192.168.1.1',
      };

      const job = createMockJob(payload);
      const previousHash = 'abc123def456';

      mockQueryRaw.mockResolvedValue([{ currentHash: previousHash, sequenceNumber: 1n }]);
      mockCreate.mockResolvedValue({ id: 2n });

      await processor.process(job);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: payload.action,
          userId: payload.userId,
          ipAddress: payload.ip,
          previousHash,
          currentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          sequenceNumber: 2n,
        }),
      });
    });

    it('should include all fields in hash calculation', async () => {
      const payload: SecurityLogPayload = {
        action: SecurityLogAction.DATA_ACCESS,
        userId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Chrome',
        method: 'GET',
        path: '/api/data',
        statusCode: 200,
        organizationId: 'org123',
        tenantId: 'tenant123',
        metadata: { resourceId: 'res123' },
      };

      const job = createMockJob(payload);

      mockQueryRaw.mockResolvedValue([]);

      let capturedHashInput: string | undefined;
      const originalCreateHash = jest.requireActual('crypto').createHash;
      jest.spyOn(crypto, 'createHash').mockImplementation((algorithm) => {
        const hash = originalCreateHash(algorithm);
        const originalUpdate = hash.update.bind(hash);
        hash.update = jest.fn((data: string) => {
          capturedHashInput = data;
          return originalUpdate(data);
        });
        return hash;
      });

      await processor.process(job);

      expect(capturedHashInput).toBeDefined();
      const parsedInput = JSON.parse(capturedHashInput!);
      expect(parsedInput).toMatchObject({
        eventType: payload.action,
        userId: payload.userId,
        ipAddress: payload.ip,
        userAgent: payload.userAgent,
        metadata: payload.metadata,
        sequenceNumber: '1',
        previousHash: null,
      });
      expect(parsedInput.timestamp).toBeDefined();
    });

    it('should throw error on database failure', async () => {
      const payload: SecurityLogPayload = {
        action: SecurityLogAction.USER_LOGIN,
        userId: 'user123',
        ip: '192.168.1.1',
      };

      const job = createMockJob(payload);
      const error = new Error('Database connection failed');

      mockTransaction.mockRejectedValue(error);

      await expect(processor.process(job)).rejects.toThrow(error);
    });

    it('should handle transaction rollback on create failure', async () => {
      const payload: SecurityLogPayload = {
        action: SecurityLogAction.USER_LOGIN,
        userId: 'user123',
        ip: '192.168.1.1',
      };

      const job = createMockJob(payload);
      const error = new Error('Create failed');

      mockQueryRaw.mockResolvedValue([]);
      mockCreate.mockRejectedValue(error);

      await expect(processor.process(job)).rejects.toThrow(error);
    });
  });
});
