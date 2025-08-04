import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';

describe('AuthService - Admin Token', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'test-user-id',
    username: 'testadmin',
    role: UserRole.ADMIN,
    passwordHash: 'hashed-password',
    isActive: true,
    lastLoginAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('signAdminToken', () => {
    it('should generate an admin token with correct payload', () => {
      const mockToken = 'mock-admin-token';
      const mockAdminSecret = 'admin-secret';
      const mockAdminExpiration = '15m';

      jest
        .spyOn(configService, 'getOrThrow')
        .mockReturnValueOnce(mockAdminSecret)
        .mockReturnValueOnce(mockAdminExpiration);
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      const result = service.signAdminToken(mockUser);

      expect(configService.getOrThrow).toHaveBeenCalledWith('ADMIN_JWT_SECRET');
      expect(configService.getOrThrow).toHaveBeenCalledWith('ADMIN_JWT_EXPIRATION');

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          username: mockUser.username,
          isAdmin: true,
        },
        {
          secret: mockAdminSecret,
          expiresIn: mockAdminExpiration,
        },
      );

      expect(result).toBe(mockToken);
    });

    it('should use ADMIN_JWT_SECRET instead of regular JWT_SECRET', () => {
      const mockAdminSecret = 'admin-specific-secret';
      const mockAdminExpiration = '15m';

      jest
        .spyOn(configService, 'getOrThrow')
        .mockReturnValueOnce(mockAdminSecret)
        .mockReturnValueOnce(mockAdminExpiration);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      service.signAdminToken(mockUser);

      const signCall = jest.mocked(jwtService.sign).mock.calls[0];
      expect(signCall[1]).toEqual({
        secret: mockAdminSecret,
        expiresIn: mockAdminExpiration,
      });
    });

    it('should include isAdmin=true in the payload', () => {
      jest
        .spyOn(configService, 'getOrThrow')
        .mockReturnValueOnce('secret')
        .mockReturnValueOnce('15m');
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      service.signAdminToken(mockUser);

      const signCall = jest.mocked(jwtService.sign).mock.calls[0];
      const payload = signCall[0];

      expect(payload).toHaveProperty('isAdmin', true);
      expect(payload).toHaveProperty('sub', mockUser.id);
      expect(payload).toHaveProperty('username', mockUser.username);
    });
  });
});
