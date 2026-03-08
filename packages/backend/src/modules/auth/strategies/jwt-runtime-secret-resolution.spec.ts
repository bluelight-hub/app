// @ts-nocheck
import { UnauthorizedException } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { Request } from 'express';
import { AppConfigService } from '@/infrastructure/services/app-config.service';
import { AuthService } from '@/modules/auth/auth.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtStrategy } from './jwt.strategy';

type SecretProvider = (request: Request, rawJwtToken: string, done: (err: unknown, secretOrKey?: string | Buffer) => void) => void;

function getSecretProvider(strategy: unknown): SecretProvider {
  return (strategy as { _secretOrKeyProvider: SecretProvider })._secretOrKeyProvider;
}

describe('JWT Runtime Secret Resolution', () => {
  let mockAppConfig: jest.Mocked<AppConfigService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockAppConfig = {
      get: jest.fn(),
      getOrThrow: jest.fn(() => {
        throw new Error('getOrThrow must not be called in constructor');
      }),
    } as unknown as jest.Mocked<AppConfigService>;

    mockAuthService = {
      findUserById: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;
  });

  it('resolves JWT_SECRET lazily in JwtStrategy', () => {
    mockAppConfig.get.mockReturnValue('runtime-jwt-secret');
    const strategy = new JwtStrategy(mockAppConfig, mockAuthService);

    expect(mockAppConfig.getOrThrow).not.toHaveBeenCalled();

    const done = jest.fn();
    getSecretProvider(strategy)({} as Request, 'raw.jwt.token', done);

    expect(mockAppConfig.get).toHaveBeenCalledWith('JWT_SECRET');
    expect(done).toHaveBeenCalledWith(null, 'runtime-jwt-secret');
  });

  it('resolves JWT_REFRESH_SECRET lazily in JwtRefreshStrategy', () => {
    mockAppConfig.get.mockReturnValue('runtime-refresh-secret');
    const strategy = new JwtRefreshStrategy(mockAppConfig, mockAuthService);

    expect(mockAppConfig.getOrThrow).not.toHaveBeenCalled();

    const done = jest.fn();
    getSecretProvider(strategy)({} as Request, 'raw.jwt.token', done);

    expect(mockAppConfig.get).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    expect(done).toHaveBeenCalledWith(null, 'runtime-refresh-secret');
  });

  it('resolves ADMIN_JWT_SECRET lazily in AdminJwtStrategy', () => {
    mockAppConfig.get.mockReturnValue('runtime-admin-secret');
    const strategy = new AdminJwtStrategy(mockAppConfig, mockAuthService, mockLogger);

    expect(mockAppConfig.getOrThrow).not.toHaveBeenCalled();

    const done = jest.fn();
    getSecretProvider(strategy)({} as Request, 'raw.jwt.token', done);

    expect(mockAppConfig.get).toHaveBeenCalledWith('ADMIN_JWT_SECRET');
    expect(done).toHaveBeenCalledWith(null, 'runtime-admin-secret');
  });

  it('returns UnauthorizedException when secret is missing', () => {
    mockAppConfig.get.mockReturnValue(undefined);
    const strategy = new JwtStrategy(mockAppConfig, mockAuthService);
    const done = jest.fn();

    getSecretProvider(strategy)({} as Request, 'raw.jwt.token', done);

    expect(done).toHaveBeenCalledTimes(1);
    const [error, secret] = done.mock.calls[0] as [unknown, string | undefined];
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(secret).toBeUndefined();
  });
});
