import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JWTRefreshPayload } from '../types/jwt.types';
import { Request } from 'express';

// Mock passport-jwt
jest.mock('passport-jwt', () => ({
  Strategy: jest.fn().mockImplementation(() => ({})),
  ExtractJwt: {
    fromBodyField: jest.fn().mockReturnValue(() => 'token'),
  },
}));

// Mock @nestjs/passport
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: jest.fn().mockImplementation((_Strategy, _name) => {
    return class {
      constructor() {}
    };
  }),
}));

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let configService: ConfigService;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-refresh-secret'),
    } as unknown as ConfigService;

    strategy = new JwtRefreshStrategy(mockConfigService);
    configService = mockConfigService;
  });

  describe('validate', () => {
    const createMockRequest = (refreshToken?: string): Request => ({
      body: { refreshToken },
    } as Request);

    it('should return payload for valid refresh token', async () => {
      const req = createMockRequest('valid-refresh-token');
      const payload: JWTRefreshPayload = {
        sub: '1',
        sessionId: 'session-123',
        jti: 'jti-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      };

      const result = await strategy.validate(req, payload);

      expect(result).toBe(payload);
    });

    it('should throw UnauthorizedException when refresh token is missing from body', async () => {
      const req = createMockRequest();
      const payload: JWTRefreshPayload = {
        sub: '1',
        sessionId: 'session-123',
        jti: 'jti-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      };

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const req = createMockRequest('valid-refresh-token');
      const payload = {
        sessionId: 'session-123',
        jti: 'jti-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      } as any;

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException when sessionId is missing', async () => {
      const req = createMockRequest('valid-refresh-token');
      const payload = {
        sub: '1',
        jti: 'jti-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      } as any;

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException when jti is missing', async () => {
      const req = createMockRequest('valid-refresh-token');
      const payload = {
        sub: '1',
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      } as any;

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException when request body is null', async () => {
      const req = { body: null } as any;
      const payload: JWTRefreshPayload = {
        sub: '1',
        sessionId: 'session-123',
        jti: 'jti-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      };

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('constructor', () => {
    it('should configure strategy with correct options', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    });
  });
});