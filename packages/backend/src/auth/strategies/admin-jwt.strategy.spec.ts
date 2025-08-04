import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AdminJwtStrategy, AdminJwtPayload } from './admin-jwt.strategy';

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
    it('should return validated admin user when isAdmin is true', async () => {
      const payload: AdminJwtPayload = {
        sub: 'user-id',
        username: 'adminuser',
        isAdmin: true,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900, // 15 minutes
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-id',
        username: 'adminuser',
        isAdmin: true,
      });
    });

    it('should throw UnauthorizedException when isAdmin is false', async () => {
      const payload: AdminJwtPayload = {
        sub: 'user-id',
        username: 'regularuser',
        isAdmin: false,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

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
