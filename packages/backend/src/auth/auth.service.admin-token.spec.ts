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

      jest.spyOn(configService, 'get').mockReturnValue(mockAdminExpiration);
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      const result = service.signAdminToken(mockUser);

      expect(configService.get).toHaveBeenCalledWith('JWT_ADMIN_EXPIRES_IN', '1h');

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
          isAdmin: true,
          permissions: expect.any(Array),
        },
        {
          expiresIn: mockAdminExpiration,
        },
      );

      expect(result).toBe(mockToken);
    });

    it('should use custom JWT_ADMIN_EXPIRES_IN from config', () => {
      const mockAdminExpiration = '15m';

      jest.spyOn(configService, 'get').mockReturnValue(mockAdminExpiration);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      service.signAdminToken(mockUser);

      const signCall = jest.mocked(jwtService.sign).mock.calls[0];
      expect(signCall[1]).toEqual({
        expiresIn: mockAdminExpiration,
      });
    });

    it('should include role and permissions in the payload', () => {
      jest.spyOn(configService, 'get').mockReturnValue('1h');
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
