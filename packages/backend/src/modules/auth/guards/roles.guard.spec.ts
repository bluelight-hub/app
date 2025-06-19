import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../types/jwt.types';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    const createMockContext = (user?: any): ExecutionContext =>
      ({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user }),
        }),
      }) as unknown as ExecutionContext;

    it('should return true when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { roles: [UserRole.ADMIN] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MODERATOR]);

      const user = { roles: [UserRole.MODERATOR] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { roles: [UserRole.USER] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user has no roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { roles: [] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext(null);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user has no roles property', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { id: '1' };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle SUPER_ADMIN role correctly', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

      const user = { roles: [UserRole.SUPER_ADMIN] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
