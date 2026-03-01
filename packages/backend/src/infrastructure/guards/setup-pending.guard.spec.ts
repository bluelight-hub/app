import { type ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Result } from '@domain/common/result';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { SKIP_SETUP_CHECK_KEY } from '../decorators/skip-setup-check.decorator';
import { SetupPendingGuard } from './setup-pending.guard';

/**
 * Creates a mock ExecutionContext for testing guards.
 */
function createMockExecutionContext(): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('SetupPendingGuard', () => {
  let guard: SetupPendingGuard;
  let mockPrisma: { user: { count: jest.Mock } };
  let mockTokenRepo: jest.Mocked<IServerAccessTokenRepository>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPrisma = {
      user: {
        count: jest.fn(),
      },
    };

    mockTokenRepo = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn(),
      countActive: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
    };

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    // Direct instantiation (like ServerAccessGuard tests)
    guard = new SetupPendingGuard(mockPrisma as unknown as PrismaService, mockTokenRepo, mockReflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('canActivate - Basic Tests', () => {
    it('should return true when @SkipSetupCheck is present', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      // When
      const result = await guard.canActivate(context);

      // Then
      expect(result).toBe(true);
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
      expect(mockTokenRepo.countActive).not.toHaveBeenCalled();
    });

    it('should return true when setup is complete (admin + active token)', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When
      const result = await guard.canActivate(context);

      // Then
      expect(result).toBe(true);
    });

    it('should throw ServiceUnavailableException when no admin exists', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When & Then
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when no active token exists', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0));
      const context = createMockExecutionContext();

      // When & Then
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when neither admin nor token exists', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0));
      const context = createMockExecutionContext();

      // When & Then
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should check for ADMIN and SUPER_ADMIN roles', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When
      await guard.canActivate(context);

      // Then
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
          isDeleted: false,
        },
      });
    });

    it('should have correct error response format', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0));
      const context = createMockExecutionContext();

      // When & Then
      try {
        await guard.canActivate(context);
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const response = (error as ServiceUnavailableException).getResponse();
        expect(response).toEqual({
          error: 'SERVER_NOT_SETUP',
          message: 'Server setup required',
        });
      }
    });
  });

  describe('canActivate - Cache Tests', () => {
    it('should use cached result within TTL (no repeated DB calls)', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - First call
      await guard.canActivate(context);

      // Advance time by 5 seconds (within TTL)
      jest.advanceTimersByTime(5000);

      // When - Second call (should use cache)
      await guard.canActivate(context);

      // Then - DB only called once
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockTokenRepo.countActive).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after TTL expires', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - First call
      await guard.canActivate(context);

      // Advance time past TTL (10 seconds + 1ms)
      jest.advanceTimersByTime(10_001);

      // When - Second call (should query DB again)
      await guard.canActivate(context);

      // Then - DB called twice
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(2);
      expect(mockTokenRepo.countActive).toHaveBeenCalledTimes(2);
    });

    it('should refresh cache exactly at TTL boundary', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - First call
      await guard.canActivate(context);

      // Advance time to exactly TTL (10 seconds) - this triggers refresh
      // Cache condition: now - cacheTimestamp < CACHE_TTL_MS
      // At exactly 10s: 10000 - 0 = 10000, NOT < 10000, so cache expired
      jest.advanceTimersByTime(10_000);

      // When - Second call (exactly at TTL boundary - cache is expired)
      await guard.canActivate(context);

      // Then - DB called twice (cache expired at exactly TTL)
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(2);
      expect(mockTokenRepo.countActive).toHaveBeenCalledTimes(2);
    });

    it('should cache negative result (setup not complete)', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0));
      const context = createMockExecutionContext();

      // When - First call
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);

      // Advance time within TTL
      jest.advanceTimersByTime(5000);

      // When - Second call (should use cache)
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);

      // Then - DB only called once
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockTokenRepo.countActive).toHaveBeenCalledTimes(1);
    });

    it('should re-validate after cache expires when setup becomes incomplete', async () => {
      // Given - Setup is initially complete
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - First call (setup complete, cached)
      await guard.canActivate(context);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);

      // Advance time past TTL
      jest.advanceTimersByTime(10_001);

      // Now admin is deleted (setup incomplete)
      mockPrisma.user.count.mockResolvedValue(0);

      // When - Second call after TTL (should re-query and find no admin)
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);

      // Then - DB was queried again
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(2);
    });

    it('should treat inactive admin as no admin (setup not complete)', async () => {
      // Given - Only inactive admins exist (query returns 0 due to isActive filter)
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0); // isActive: true filter means inactive admins not counted
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When & Then
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('canActivate - Error Handling', () => {
    it('should treat token repository failure as setup not complete (graceful degradation)', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1); // Admin exists
      mockTokenRepo.countActive.mockResolvedValue(Result.fail('Database error'));
      const context = createMockExecutionContext();

      // When & Then - Should throw because token check failed
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should propagate Prisma errors', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockRejectedValue(new Error('Connection refused'));
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When & Then - Prisma error should propagate
      await expect(guard.canActivate(context)).rejects.toThrow('Connection refused');
    });

    it('should handle null token count result as setup not complete', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      // Simulating a case where value is undefined/null but isSuccess is true
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(undefined as unknown as number));
      const context = createMockExecutionContext();

      // When & Then - Should treat as no active tokens
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('canActivate - Concurrent Requests', () => {
    it('should handle parallel requests with cache (no DB flooding)', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - First call populates the cache
      const firstResult = await guard.canActivate(context);
      expect(firstResult).toBe(true);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);

      // When - Parallel requests after cache is populated
      const parallelResults = await Promise.all([guard.canActivate(context), guard.canActivate(context), guard.canActivate(context), guard.canActivate(context)]);

      // Then - All should succeed and use cache (no additional DB calls)
      expect(parallelResults).toEqual([true, true, true, true]);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(mockTokenRepo.countActive).toHaveBeenCalledTimes(1);
    });

    it('should handle race condition on first request gracefully', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Simulate slow DB response
      let resolvePromise: (value: number) => void;
      const slowPromise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });
      mockPrisma.user.count.mockReturnValue(slowPromise as Promise<number>);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - Start two concurrent requests
      const promise1 = guard.canActivate(context);
      const promise2 = guard.canActivate(context);

      // Resolve the DB query
      resolvePromise?.(1);

      // Then - Both should complete successfully
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('canActivate - Decorator Detection', () => {
    it('should check both handler and class for decorator', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When
      await guard.canActivate(context);

      // Then - verify getAllAndOverride was called with correct key and array of functions
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_SETUP_CHECK_KEY, expect.any(Array));
      const callArgs = mockReflector.getAllAndOverride.mock.calls[0];
      expect(callArgs[0]).toBe(SKIP_SETUP_CHECK_KEY);
      expect(callArgs[1]).toHaveLength(2); // [handler, class]
    });

    it('should skip DB check when method has decorator', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      // When
      const result = await guard.canActivate(context);

      // Then
      expect(result).toBe(true);
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
    });
  });
});
