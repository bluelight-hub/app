import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@domain/common/result';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { IServerConfigRepository } from '@domain/repositories/i-server-config.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER, SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY } from '@/infrastructure/di-tokens';
import { ServerAccessGuard } from './server-access.guard';
import { SKIP_SERVER_ACCESS_KEY } from '../decorators/skip-server-access.decorator';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('ServerAccessGuard', () => {
  let guard: ServerAccessGuard;
  let mockTokenRepo: jest.Mocked<IServerAccessTokenRepository>;
  let mockServerConfigRepo: jest.Mocked<IServerConfigRepository>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  // Helper to create mock execution context
  const createMockExecutionContext = (headers: Record<string, string | undefined> = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  // Helper to create mock token
  const createMockToken = (
    overrides: Partial<{
      id: { value: string };
      tokenHash: { value: string };
      isValid: () => boolean;
      recordUsage: () => void;
      getDomainEvents: () => unknown[];
    }> = {},
  ): ServerAccessToken => {
    return {
      id: { value: 'blh_test123' },
      tokenHash: { value: '$2a$10$hashedvalue' },
      isValid: jest.fn().mockReturnValue(true),
      recordUsage: jest.fn(),
      getDomainEvents: jest.fn().mockReturnValue([]),
      ...overrides,
    } as unknown as ServerAccessToken;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTokenRepo = {
      findAllActive: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn(),
      findAllPaginated: jest.fn(),
      updateLastUsed: jest.fn(),
    };

    mockServerConfigRepo = {
      getOrCreate: jest.fn(),
      update: jest.fn(),
      isInsecureMode: jest.fn().mockResolvedValue(Result.ok(false)), // Default: SECURE Mode
      hasMigrated: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockConfigService = {
      get: jest.fn().mockReturnValue(undefined), // Default: INSECURE_MODE nicht gesetzt
    } as unknown as jest.Mocked<ConfigService>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerAccessGuard,
        {
          provide: SERVER_ACCESS_TOKEN_REPOSITORY,
          useValue: mockTokenRepo,
        },
        {
          provide: SERVER_CONFIG_REPOSITORY,
          useValue: mockServerConfigRepo,
        },
        {
          provide: LOGGER,
          useValue: mockLogger,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    guard = module.get<ServerAccessGuard>(ServerAccessGuard);
  });

  describe('canActivate', () => {
    describe('when @SkipServerAccess is present', () => {
      it('should return true without token check', async () => {
        // Given: Endpoint has @SkipServerAccess decorator
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = createMockExecutionContext();

        // When: canActivate is called
        const result = await guard.canActivate(context);

        // Then: returns true without checking token
        expect(result).toBe(true);
        expect(mockTokenRepo.findAllActive).not.toHaveBeenCalled();
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_SERVER_ACCESS_KEY, expect.any(Array));
      });
    });

    describe('when token header is missing', () => {
      it('should throw UnauthorizedException with correct message', async () => {
        // Given: No X-Server-Access-Token header
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({});

        // When/Then: throws UnauthorizedException
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(context)).rejects.toThrow('Server access token required');
      });
    });

    describe('when token is invalid (no match)', () => {
      it('should throw UnauthorizedException and log warning', async () => {
        // Given: Invalid token in header (no match in DB)
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'invalid-token-12345678',
        });
        mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([]));

        // When/Then: throws UnauthorizedException
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or revoked server access token');
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid-'));
      });
    });

    describe('when token is revoked', () => {
      it('should throw UnauthorizedException', async () => {
        // Given: Revoked token (isValid returns false)
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'valid-raw-token-here',
        });
        const revokedToken = createMockToken({
          isValid: jest.fn().mockReturnValue(false),
        });
        mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([revokedToken]));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // When/Then: throws UnauthorizedException
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('when token is expired', () => {
      it('should throw UnauthorizedException', async () => {
        // Given: Expired token (isValid returns false)
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'valid-raw-token-here',
        });
        const expiredToken = createMockToken({
          isValid: jest.fn().mockReturnValue(false),
        });
        mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([expiredToken]));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // When/Then: throws UnauthorizedException
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('when token is valid', () => {
      it('should return true and update lastUsedAt asynchronously', async () => {
        // Given: Valid token in header
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'valid-raw-token-here',
        });
        const validToken = createMockToken();
        mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
        mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // When: canActivate is called
        const result = await guard.canActivate(context);

        // Then: returns true
        expect(result).toBe(true);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('blh_test123'));
      });

      it('should call recordUsage on the token', async () => {
        // Given: Valid token
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'valid-raw-token-here',
        });
        const validToken = createMockToken();
        mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
        mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // When: canActivate is called
        await guard.canActivate(context);

        // Then: Wait for async update and verify
        await new Promise((resolve) => setImmediate(resolve));
        expect(validToken.recordUsage).toHaveBeenCalled();
      });
    });

    describe('when lastUsedAt update fails', () => {
      it('should not block request and log error', async () => {
        // Given: Valid token, but save fails
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'valid-raw-token-here',
        });
        const validToken = createMockToken();
        mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
        mockTokenRepo.save.mockResolvedValue(Result.fail('Database connection error'));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // When: canActivate is called
        const result = await guard.canActivate(context);

        // Then: returns true (not blocked)
        expect(result).toBe(true);

        // Wait for async update and verify error was logged
        await new Promise((resolve) => setImmediate(resolve));
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('blh_test123'));
      });
    });

    describe('when repository fails to fetch tokens', () => {
      it('should throw UnauthorizedException', async () => {
        // Given: Repository returns failure
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext({
          'x-server-access-token': 'some-token-value',
        });
        mockTokenRepo.findAllActive.mockResolvedValue(Result.fail('Database error'));

        // When/Then: throws UnauthorizedException
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('INSECURE_MODE (DB-Config Prioritaet)', () => {
      describe('when DB-Config is available', () => {
        it('should bypass token validation when DB insecureMode=true', async () => {
          // Given: DB config says insecureMode=true
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(true));
          const context = createMockExecutionContext({}); // No token

          // When: canActivate is called
          const result = await guard.canActivate(context);

          // Then: returns true without checking token repository
          expect(result).toBe(true);
          expect(mockTokenRepo.findAllActive).not.toHaveBeenCalled();
        });

        it('should log warning mentioning DB config when insecureMode=true from DB', async () => {
          // Given: DB config says insecureMode=true
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(true));
          const context = createMockExecutionContext({});

          // When: canActivate is called
          await guard.canActivate(context);

          // Then: warning mentions DB config source
          expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('via DB config'));
        });

        it('should require token when DB insecureMode=false', async () => {
          // Given: DB config says insecureMode=false
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(false));
          const context = createMockExecutionContext({}); // No token

          // When/Then: throws UnauthorizedException
          await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
          await expect(guard.canActivate(context)).rejects.toThrow('Server access token required');
        });

        it('should prioritize DB config over ENV variable when DB says insecureMode=false', async () => {
          // Given: DB says insecureMode=false, but ENV says true
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(false));
          mockConfigService.get.mockReturnValue('true'); // ENV says INSECURE
          const context = createMockExecutionContext({}); // No token

          // When/Then: throws UnauthorizedException (DB wins)
          await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
          // ENV should NOT be checked when DB is successful
          expect(mockConfigService.get).not.toHaveBeenCalled();
        });

        it('should prioritize DB config over ENV variable when DB says insecureMode=true', async () => {
          // Given: DB says insecureMode=true, ENV says false
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(true));
          mockConfigService.get.mockReturnValue('false'); // ENV says SECURE
          const context = createMockExecutionContext({});

          // When: canActivate is called
          const result = await guard.canActivate(context);

          // Then: returns true (DB wins, ENV not checked)
          expect(result).toBe(true);
          expect(mockConfigService.get).not.toHaveBeenCalled();
        });
      });

      describe('when DB-Config fails (Fallback to ENV)', () => {
        it('should fallback to ENV when DB query fails', async () => {
          // Given: DB fails, ENV says INSECURE_MODE=true
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('Database connection error'));
          mockConfigService.get.mockReturnValue('true');
          const context = createMockExecutionContext({});

          // When: canActivate is called
          const result = await guard.canActivate(context);

          // Then: returns true (fallback to ENV)
          expect(result).toBe(true);
          expect(mockConfigService.get).toHaveBeenCalledWith('INSECURE_MODE');
        });

        it('should log fallback warning when DB fails', async () => {
          // Given: DB fails
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('Database connection error'));
          mockConfigService.get.mockReturnValue('true');
          const context = createMockExecutionContext({});

          // When: canActivate is called
          await guard.canActivate(context);

          // Then: logs warning about DB failure and fallback
          expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to read DB config'));
          expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('falling back to ENV'));
        });

        it('should log ENV fallback source when bypassing via ENV', async () => {
          // Given: DB fails, ENV says INSECURE_MODE=true
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('Database error'));
          mockConfigService.get.mockReturnValue('true');
          const context = createMockExecutionContext({});

          // When: canActivate is called
          await guard.canActivate(context);

          // Then: logs warning mentioning ENV fallback
          expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('via ENV fallback'));
        });

        it('should require token when DB fails and ENV is false', async () => {
          // Given: DB fails, ENV says INSECURE_MODE=false
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('Database error'));
          mockConfigService.get.mockReturnValue('false');
          const context = createMockExecutionContext({});

          // When/Then: throws UnauthorizedException
          await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });

        it('should require token when DB fails and ENV is not set', async () => {
          // Given: DB fails, ENV not set
          mockReflector.getAllAndOverride.mockReturnValue(false);
          mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('Database error'));
          mockConfigService.get.mockReturnValue(undefined);
          const context = createMockExecutionContext({});

          // When/Then: throws UnauthorizedException
          await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });
      });

      describe('backward compatibility', () => {
        it('should still check @SkipServerAccess before DB config', async () => {
          // Given: @SkipServerAccess present
          mockReflector.getAllAndOverride.mockReturnValue(true);
          const context = createMockExecutionContext({});

          // When: canActivate is called
          const result = await guard.canActivate(context);

          // Then: returns true via decorator skip (DB not queried)
          expect(result).toBe(true);
          expect(mockServerConfigRepo.isInsecureMode).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('validateToken', () => {
    it('should find matching token using bcrypt.compare', async () => {
      // Given: Raw token and matching hash in DB
      const rawToken = 'my-secret-token';
      const validToken = createMockToken();
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Access private method via type assertion
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).validateToken(rawToken);

      // Then: returns matching ServerAccessToken
      expect(result).toBe(validToken);
      expect(bcrypt.compare).toHaveBeenCalledWith(rawToken, validToken.tokenHash.value);
    });

    it('should return null when no tokens match', async () => {
      // Given: Raw token with no matching hash
      const rawToken = 'non-matching-token';
      const token = createMockToken();
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([token]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // When: validateToken is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).validateToken(rawToken);

      // Then: returns null
      expect(result).toBeNull();
    });

    it('should stop at first match (performance optimization)', async () => {
      // Given: Multiple tokens, first one matches
      const token1 = createMockToken({ id: { value: 'token1' } });
      const token2 = createMockToken({ id: { value: 'token2' } });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([token1, token2]));
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      // When: validateToken is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).validateToken('any-token');

      // Then: only compares until first match
      expect(result).toBe(token1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('should check isValid() after bcrypt match', async () => {
      // Given: Token matches but is not valid
      const invalidToken = createMockToken({
        isValid: jest.fn().mockReturnValue(false),
      });
      const validToken = createMockToken({
        id: { value: 'valid-id' },
        isValid: jest.fn().mockReturnValue(true),
      });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([invalidToken, validToken]));
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // First token matches hash
        .mockResolvedValueOnce(true); // Second token also matches

      // When: validateToken is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).validateToken('any-token');

      // Then: Returns valid token (skips invalid one)
      expect(result).toBe(validToken);
      expect(invalidToken.isValid).toHaveBeenCalled();
      expect(validToken.isValid).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log warning with masked token prefix on invalid attempt', async () => {
      // Given: Invalid token
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-server-access-token': 'longtokenvalue12345678',
      });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([]));

      // When: canActivate is called
      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      // Then: logger.warn called with first 8 chars only
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/longtoke/), // First 8 chars
      );
      // Should NOT contain full token (chars beyond 8)
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('nvalue12'), // Should not contain this part
      );
    });

    it('should log debug with token ID (not hash) on success', async () => {
      // Given: Valid token
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-server-access-token': 'valid-token',
      });
      const validToken = createMockToken({ id: { value: 'blh_secret123' } });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockTokenRepo.save.mockResolvedValue(Result.ok(undefined));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // When: canActivate is called
      await guard.canActivate(context);

      // Then: logger.debug called with token ID
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('blh_secret123'));
    });

    it('should mask short tokens safely (< 8 chars)', async () => {
      // Given: Very short token (only 5 characters)
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-server-access-token': 'short', // Only 5 chars
      });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([]));

      // When: canActivate is called with short invalid token
      try {
        await guard.canActivate(context);
      } catch {
        // Expected UnauthorizedException
      }

      // Then: logger.warn should NOT log full token
      // With 5 chars, we expect only ~2-3 chars to be logged (half)
      expect(mockLogger.warn).toHaveBeenCalled();
      const warnCall = mockLogger.warn.mock.calls[0]?.[0] as string;
      expect(warnCall).toBeDefined();
      // Should not contain the full 'short' token
      expect(warnCall).not.toContain('short...');
    });
  });

  describe('checkInsecureMode (private method)', () => {
    it('should return true when DB says insecureMode=true', async () => {
      // Given: DB config returns insecureMode=true
      mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(true));

      // When: checkInsecureMode is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).checkInsecureMode();

      // Then: returns true
      expect(result).toBe(true);
    });

    it('should return false when DB says insecureMode=false', async () => {
      // Given: DB config returns insecureMode=false
      mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(false));

      // When: checkInsecureMode is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).checkInsecureMode();

      // Then: returns false
      expect(result).toBe(false);
      // ENV should NOT be checked
      expect(mockConfigService.get).not.toHaveBeenCalled();
    });

    it('should check ENV as fallback when DB fails', async () => {
      // Given: DB fails
      mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('DB error'));
      mockConfigService.get.mockReturnValue('true');

      // When: checkInsecureMode is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      const result = await (guard as any).checkInsecureMode();

      // Then: ENV fallback is used
      expect(result).toBe(true);
      expect(mockConfigService.get).toHaveBeenCalledWith('INSECURE_MODE');
    });

    it('should include error message in log when DB fails', async () => {
      // Given: DB fails with specific error
      mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.fail('Connection timeout'));
      mockConfigService.get.mockReturnValue('false');

      // When: checkInsecureMode is called
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      await (guard as any).checkInsecureMode();

      // Then: error message is logged
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Connection timeout'));
    });

    it('should not cache DB result (call DB each time)', async () => {
      // Given: Multiple calls to checkInsecureMode
      mockServerConfigRepo.isInsecureMode.mockResolvedValue(Result.ok(false));

      // When: checkInsecureMode is called twice
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      await (guard as any).checkInsecureMode();
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method in unit test
      await (guard as any).checkInsecureMode();

      // Then: DB is queried twice (no caching)
      expect(mockServerConfigRepo.isInsecureMode).toHaveBeenCalledTimes(2);
    });
  });
});
