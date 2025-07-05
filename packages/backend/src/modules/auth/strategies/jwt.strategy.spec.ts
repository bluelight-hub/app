import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JWTPayload, UserRole } from '../types/jwt.types';
import { PrismaService } from '@/prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return payload for valid token payload with active session', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const mockSession = {
        id: 'session-id',
        jti: 'session-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        lastActivityAt: new Date(),
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        lastActivityAt: new Date(),
      });

      const result = await strategy.validate(payload);

      expect(result).toBe(payload);
      expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
        where: { jti: 'session-123' },
      });
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { lastActivityAt: expect.any(Date) },
      });
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

      const mockSession = {
        id: 'session-id',
        jti: 'session-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        lastActivityAt: new Date(),
      });

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

      const mockSession = {
        id: 'session-id',
        jti: 'session-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        lastActivityAt: new Date(),
      });

      const result = await strategy.validate(payload);

      expect(result).toBe(payload);
      expect(result.jti).toBe('jwt-123');
    });

    it('should throw UnauthorizedException when session not found', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Session expired or revoked'),
      );
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const revokedSession = {
        id: 'session-id',
        jti: 'session-123',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
        revokedReason: 'User logout',
      };

      mockPrismaService.session.findUnique.mockResolvedValue(revokedSession);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Session expired or revoked'),
      );

      expect(mockPrismaService.session.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when session is expired', async () => {
      const payload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [UserRole.USER],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const expiredSession = {
        id: 'session-id',
        jti: 'session-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      mockPrismaService.session.findUnique.mockResolvedValue(expiredSession);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Session expired'),
      );

      expect(mockPrismaService.session.update).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should configure strategy with correct options', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});
