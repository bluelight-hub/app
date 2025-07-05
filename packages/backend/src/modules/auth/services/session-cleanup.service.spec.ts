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
    },
    $executeRaw: jest.fn(),
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
});
