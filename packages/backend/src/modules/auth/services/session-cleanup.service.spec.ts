import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionCleanupService } from './session-cleanup.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsoleLogger } from '@nestjs/common';

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;

  const mockPrismaService = {
    session: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        SESSION_IDLE_TIMEOUT_MINUTES: 30,
        SESSION_ABSOLUTE_TIMEOUT_HOURS: 12,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    // Mock the logger to prevent console output during tests
    module.useLogger(new ConsoleLogger());

    service = module.get<SessionCleanupService>(SessionCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const mockDeletedSessions = { count: 5 };
      const mockDeletedTokens = { count: 3 };
      const mockOrphanedTokens = 2;

      mockPrismaService.session.deleteMany.mockResolvedValue(mockDeletedSessions);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue(mockDeletedTokens);
      mockPrismaService.$executeRaw.mockResolvedValue(mockOrphanedTokens);

      await service.cleanupExpiredSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            {
              lastActivityAt: {
                lt: expect.any(Date),
              },
            },
            {
              createdAt: {
                lt: expect.any(Date),
              },
            },
          ],
        },
      });

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            {
              isUsed: true,
              usedAt: { lt: expect.any(Date) },
            },
          ],
        },
      });

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockPrismaService.session.deleteMany.mockRejectedValue(error);

      await expect(service.cleanupExpiredSessions()).resolves.not.toThrow();
    });
  });

  describe('revokeIdleSessions', () => {
    it('should revoke idle sessions and their refresh tokens', async () => {
      const mockRevokedSessions = { count: 3 };
      const mockSessions = [{ jti: 'session1' }, { jti: 'session2' }, { jti: 'session3' }];

      mockPrismaService.session.updateMany.mockResolvedValue(mockRevokedSessions);
      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await service.revokeIdleSessions();

      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          isRevoked: false,
          lastActivityAt: { lt: expect.any(Date) },
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedReason: 'Idle timeout',
        },
      });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          sessionJti: {
            in: ['session1', 'session2', 'session3'],
          },
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should not update refresh tokens if no sessions were revoked', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 0 });

      await service.revokeIdleSessions();

      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldRevokedSessions', () => {
    it('should delete old revoked sessions and tokens', async () => {
      const mockDeletedSessions = { count: 10 };
      const mockDeletedTokens = { count: 15 };

      mockPrismaService.session.deleteMany.mockResolvedValue(mockDeletedSessions);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue(mockDeletedTokens);

      await service.cleanupOldRevokedSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: {
          isRevoked: true,
          revokedAt: { lt: expect.any(Date) },
        },
      });

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          isRevoked: true,
          revokedAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('configuration', () => {
    it('should use default timeout values when not configured', () => {
      const newConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => defaultValue),
      };

      const moduleRef = Test.createTestingModule({
        providers: [
          SessionCleanupService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: ConfigService,
            useValue: newConfigService,
          },
        ],
      });

      expect(() => moduleRef.compile()).not.toThrow();
    });
  });

  describe('cleanupExpiredSessions edge cases', () => {
    it('should handle when no sessions or tokens are deleted', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.$executeRaw.mockResolvedValue(0);

      await service.cleanupExpiredSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('revokeIdleSessions edge cases', () => {
    it('should handle error when fetching sessions for refresh token revocation', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.session.findMany.mockRejectedValue(new Error('Database error'));

      await service.revokeIdleSessions();

      expect(mockPrismaService.session.updateMany).toHaveBeenCalled();
    });
  });

  describe('cleanupOldRevokedSessions edge cases', () => {
    it('should handle when no old sessions exist', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupOldRevokedSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockPrismaService.session.deleteMany.mockRejectedValue(error);

      await expect(service.cleanupOldRevokedSessions()).resolves.not.toThrow();
    });
  });

  describe('enforceSessionLimit', () => {
    it('should enforce session limit when user has too many sessions', async () => {
      const userId = 'user-123';
      const sessions = Array.from({ length: 7 }, (_, i) => ({ jti: `session-${i}` }));

      mockPrismaService.session.findMany.mockResolvedValue(sessions);
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.enforceSessionLimit(userId);

      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: { jti: { in: ['session-5', 'session-6'] } },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedReason: 'Session limit exceeded',
        },
      });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { sessionJti: { in: ['session-5', 'session-6'] } },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should not revoke sessions when under the limit', async () => {
      const userId = 'user-123';
      const sessions = Array.from({ length: 3 }, (_, i) => ({ jti: `session-${i}` }));

      mockPrismaService.session.findMany.mockResolvedValue(sessions);

      await service.enforceSessionLimit(userId);

      expect(mockPrismaService.session.updateMany).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';
      mockPrismaService.session.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.enforceSessionLimit(userId)).resolves.not.toThrow();
    });
  });

  describe('checkRefreshRateLimit', () => {
    it('should allow refresh when under rate limit', async () => {
      const userId = 'user-123';
      mockPrismaService.refreshToken.count.mockResolvedValue(5);

      const result = await service.checkRefreshRateLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should deny refresh when rate limit exceeded', async () => {
      const userId = 'user-123';
      const oldestRefreshDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      mockPrismaService.refreshToken.count.mockResolvedValue(10);
      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        usedAt: oldestRefreshDate,
      });

      const result = await service.checkRefreshRateLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle case when no oldest refresh found', async () => {
      const userId = 'user-123';

      mockPrismaService.refreshToken.count.mockResolvedValue(10);
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      const result = await service.checkRefreshRateLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should allow refresh on error', async () => {
      const userId = 'user-123';
      mockPrismaService.refreshToken.count.mockRejectedValue(new Error('Database error'));

      const result = await service.checkRefreshRateLimit(userId);

      expect(result.allowed).toBe(true);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions and tokens', async () => {
      const userId = 'user-123';
      const reason = 'Password reset';

      mockPrismaService.$transaction.mockImplementation(async (queries) => {
        return Promise.all(queries);
      });
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 3 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await service.revokeAllUserSessions(userId, reason);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedReason: reason,
        },
      });
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when transaction fails', async () => {
      const userId = 'user-123';
      const reason = 'Security breach';
      const error = new Error('Transaction failed');

      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(service.revokeAllUserSessions(userId, reason)).rejects.toThrow(error);
    });
  });
});
