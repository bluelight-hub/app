import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type User, UserRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthService } from './auth.service';

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
            get: jest.fn(),
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
      const mockAdminExpiration = '1h';

      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('test-admin-secret') // ADMIN_JWT_SECRET
        .mockReturnValueOnce(mockAdminExpiration); // JWT_ADMIN_EXPIRES_IN
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      const result = service.signAdminToken(mockUser);

      expect(configService.get).toHaveBeenCalledWith('ADMIN_JWT_SECRET');
      expect(configService.get).toHaveBeenCalledWith('JWT_ADMIN_EXPIRES_IN', '15m');

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
          isAdmin: true,
          permissions: expect.any(Array),
        },
        {
          secret: 'test-admin-secret',
          expiresIn: mockAdminExpiration,
        },
      );

      expect(result).toBe(mockToken);
    });

    it('should use custom JWT_ADMIN_EXPIRES_IN from config', () => {
      const mockAdminExpiration = '15m';

      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('test-admin-secret') // ADMIN_JWT_SECRET
        .mockReturnValueOnce(mockAdminExpiration); // JWT_ADMIN_EXPIRES_IN
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      service.signAdminToken(mockUser);

      const signCall = jest.mocked(jwtService.sign).mock.calls[0];
      expect(signCall[1]).toEqual({
        secret: 'test-admin-secret',
        expiresIn: mockAdminExpiration,
      });
    });

    it('should include role and permissions in the payload', () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('test-admin-secret') // ADMIN_JWT_SECRET
        .mockReturnValueOnce('1h'); // JWT_ADMIN_EXPIRES_IN
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      service.signAdminToken(mockUser);

      const signCall = jest.mocked(jwtService.sign).mock.calls[0];
      const payload = signCall[0];

      expect(payload).toHaveProperty('role', mockUser.role);
      expect(payload).toHaveProperty('sub', mockUser.id);
      expect(payload).toHaveProperty('username', mockUser.username);
      expect(payload).toHaveProperty('isAdmin', true);
      expect(payload).toHaveProperty('permissions');
    });
  });
});
