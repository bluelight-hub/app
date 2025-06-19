import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from '../types/jwt.types';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);

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

    it('should return true when no permissions are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has all required permissions', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        Permission.USERS_READ,
        Permission.USERS_WRITE,
      ]);

      const user = {
        permissions: [Permission.USERS_READ, Permission.USERS_WRITE, Permission.USERS_DELETE],
      };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user lacks one required permission', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        Permission.USERS_READ,
        Permission.USERS_WRITE,
      ]);

      const user = {
        permissions: [Permission.USERS_READ],
      };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user has no permissions', () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.USERS_READ]);

      const user = { permissions: [] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.USERS_READ]);

      const context = createMockContext(null);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user has no permissions property', () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.USERS_READ]);

      const user = { id: '1' };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle system permissions correctly', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        Permission.SYSTEM_CONFIG,
        Permission.SYSTEM_LOGS,
      ]);

      const user = {
        permissions: [Permission.SYSTEM_CONFIG, Permission.SYSTEM_LOGS, Permission.SYSTEM_BACKUP],
      };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when no permissions required (empty array)', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const user = { permissions: [Permission.USERS_READ] };
      const context = createMockContext(user);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
