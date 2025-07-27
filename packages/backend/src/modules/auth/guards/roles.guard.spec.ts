import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../types/jwt.types';
import { SecurityLogService } from '@/security/services/security-log.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockSecurityLogService = {
    log: jest.fn().mockResolvedValue({ jobId: 'test-job-id', queued: true }),
    logCritical: jest.fn().mockResolvedValue({ jobId: 'test-job-id', queued: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: SecurityLogService,
          useValue: mockSecurityLogService,
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
          getRequest: jest.fn().mockReturnValue({
            user,
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-agent' },
            path: '/test',
            method: 'GET',
          }),
        }),
      }) as unknown as ExecutionContext;

    it('should return true when no roles are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSecurityLogService.log).not.toHaveBeenCalled();
    });

    it('should return true when user has required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { roles: [UserRole.ADMIN] };
      const context = createMockContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSecurityLogService.log).not.toHaveBeenCalled();
    });

    it('should return true when user has one of multiple required roles', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.SUPPORT]);

      const user = { roles: [UserRole.SUPPORT] };
      const context = createMockContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSecurityLogService.log).not.toHaveBeenCalled();
    });

    it('should return false when user does not have required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { id: '123', roles: [UserRole.USER] };
      const context = createMockContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockSecurityLogService.log).toHaveBeenCalled();
    });

    it('should return false when user has no roles', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { id: '123', roles: [] };
      const context = createMockContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockSecurityLogService.log).toHaveBeenCalled();
    });

    it('should return false when user is null', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext(null);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockSecurityLogService.log).toHaveBeenCalled();
    });

    it('should return false when user has no roles property', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const user = { id: '1' };
      const context = createMockContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockSecurityLogService.log).toHaveBeenCalled();
    });

    it('should handle SUPER_ADMIN role correctly', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

      const user = { roles: [UserRole.SUPER_ADMIN] };
      const context = createMockContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSecurityLogService.log).not.toHaveBeenCalled();
    });
  });
});
