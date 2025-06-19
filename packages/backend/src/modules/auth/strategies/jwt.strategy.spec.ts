import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JWTPayload, UserRole } from '../types/jwt.types';

// Mock passport-jwt
jest.mock('passport-jwt', () => ({
  Strategy: jest.fn().mockImplementation(() => ({})),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(() => 'token'),
  },
}));

// Mock @nestjs/passport
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: jest.fn().mockImplementation((_Strategy) => {
    return class {
      constructor() {}
    };
  }),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockConfigService);
    configService = mockConfigService;
  });

  describe('validate', () => {
    it('should return payload for valid token payload', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const result = await strategy.validate(payload);

      expect(result).toBe(payload);
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const payload = {
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload'),
      );
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      const payload = {
        sub: '1',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload'),
      );
    });

    it('should throw UnauthorizedException when sessionId is missing', async () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload'),
      );
    });

    it('should validate payload with organization ID', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        orgId: 'org-123',
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const result = await strategy.validate(payload);

      expect(result).toBe(payload);
      expect(result.orgId).toBe('org-123');
    });

    it('should validate payload with JWT ID', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        jti: 'jwt-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const result = await strategy.validate(payload);

      expect(result).toBe(payload);
      expect(result.jti).toBe('jwt-123');
    });
  });

  describe('constructor', () => {
    it('should configure strategy with correct options', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});
