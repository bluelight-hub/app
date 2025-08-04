import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AdminJwtStrategy, AdminJwtPayload } from './admin-jwt.strategy';
import { UserRole } from '@prisma/client';

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminJwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-admin-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<AdminJwtStrategy>(AdminJwtStrategy);
  });

  describe('validate', () => {
    it('should return validated admin user when role is ADMIN', async () => {
      const payload: AdminJwtPayload = {
        sub: 'user-id',
        username: 'adminuser',
        role: UserRole.ADMIN,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900, // 15 minutes
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-id',
        username: 'adminuser',
        role: UserRole.ADMIN,
      });
    });

    it('should return validated admin user when role is SUPER_ADMIN', async () => {
      const payload: AdminJwtPayload = {
        sub: 'user-id',
        username: 'superadmin',
        role: UserRole.SUPER_ADMIN,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-id',
        username: 'superadmin',
        role: UserRole.SUPER_ADMIN,
      });
    });

    it('should throw UnauthorizedException when role is USER', async () => {
      const payload: AdminJwtPayload = {
        sub: 'user-id',
        username: 'regularuser',
        role: UserRole.USER,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Token is not an admin token');
    });

    it('should throw UnauthorizedException when role is missing', async () => {
      const payload = {
        sub: 'user-id',
        username: 'regularuser',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      } as AdminJwtPayload;

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Token is not an admin token');
    });

    it('should throw UnauthorizedException when isAdmin is undefined', async () => {
      const payload = {
        sub: 'user-id',
        username: 'user',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      } as AdminJwtPayload; // Force type to test undefined case

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Token is not an admin token');
    });
  });
});
