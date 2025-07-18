import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, HttpStatus } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityMetricsService } from '../services/security-metrics.service';
import { SecurityLogService } from '../services/security-log.service';
import { AuthService } from '../auth.service';
import { JWTPayload, UserRole } from '../types/jwt.types';
import { SecurityEventType } from '../enums/security-event-type.enum';

describe('SecurityController', () => {
  let controller: SecurityController;
  let mockSecurityMetricsService: jest.Mocked<SecurityMetricsService>;
  let mockSecurityLogService: jest.Mocked<SecurityLogService>;
  let mockAuthService: jest.Mocked<AuthService>;

  const mockUser: JWTPayload = {
    sub: 'user-id',
    email: 'admin@example.com',
    roles: [UserRole.SUPER_ADMIN],
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600,
    jti: 'jwt-id',
  };

  beforeEach(async () => {
    mockSecurityMetricsService = {
      getDashboardMetrics: jest.fn(),
      getFailedLoginMetrics: jest.fn(),
      getAccountLockoutMetrics: jest.fn(),
      getSuspiciousActivityMetrics: jest.fn(),
    } as any;

    mockSecurityLogService = {
      getSecurityLogs: jest.fn(),
    } as any;

    mockAuthService = {
      getCurrentUser: jest.fn(),
      unlockAccount: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        {
          provide: SecurityMetricsService,
          useValue: mockSecurityMetricsService,
        },
        {
          provide: SecurityLogService,
          useValue: mockSecurityLogService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<SecurityController>(SecurityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const mockMetrics = {
        failedLogins: 10,
        accountLockouts: 2,
        suspiciousActivities: 5,
      };
      mockSecurityMetricsService.getDashboardMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getDashboardMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getDashboardMetrics).toHaveBeenCalled();
    });
  });

  describe('getFailedLoginMetrics', () => {
    it('should return failed login metrics without date range', async () => {
      const mockMetrics = { totalFailures: 50, uniqueIps: 20 };
      mockSecurityMetricsService.getFailedLoginMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getFailedLoginMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getFailedLoginMetrics).toHaveBeenCalledWith({
        start: undefined,
        end: undefined,
      });
    });

    it('should return failed login metrics with date range', async () => {
      const mockMetrics = { totalFailures: 25, uniqueIps: 10 };
      mockSecurityMetricsService.getFailedLoginMetrics.mockResolvedValue(mockMetrics);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = await controller.getFailedLoginMetrics(startDate, endDate);

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getFailedLoginMetrics).toHaveBeenCalledWith({
        start: new Date(startDate),
        end: new Date(endDate),
      });
    });

    it('should handle invalid date format gracefully', async () => {
      const mockMetrics = { totalFailures: 0, uniqueIps: 0 };
      mockSecurityMetricsService.getFailedLoginMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getFailedLoginMetrics('invalid-date', 'also-invalid');

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getFailedLoginMetrics).toHaveBeenCalled();
    });
  });

  describe('getAccountLockoutMetrics', () => {
    it('should return account lockout metrics without date range', async () => {
      const mockMetrics = { totalLockouts: 5, affectedUsers: 5 };
      mockSecurityMetricsService.getAccountLockoutMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getAccountLockoutMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getAccountLockoutMetrics).toHaveBeenCalledWith({
        start: undefined,
        end: undefined,
      });
    });

    it('should return account lockout metrics with date range', async () => {
      const mockMetrics = { totalLockouts: 3, affectedUsers: 3 };
      mockSecurityMetricsService.getAccountLockoutMetrics.mockResolvedValue(mockMetrics);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = await controller.getAccountLockoutMetrics(startDate, endDate);

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getAccountLockoutMetrics).toHaveBeenCalledWith({
        start: new Date(startDate),
        end: new Date(endDate),
      });
    });
  });

  describe('getSuspiciousActivityMetrics', () => {
    it('should return suspicious activity metrics without date range', async () => {
      const mockMetrics = { totalActivities: 15, uniqueSources: 8 };
      mockSecurityMetricsService.getSuspiciousActivityMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getSuspiciousActivityMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getSuspiciousActivityMetrics).toHaveBeenCalledWith({
        start: undefined,
        end: undefined,
      });
    });

    it('should return suspicious activity metrics with date range', async () => {
      const mockMetrics = { totalActivities: 8, uniqueSources: 4 };
      mockSecurityMetricsService.getSuspiciousActivityMetrics.mockResolvedValue(mockMetrics);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = await controller.getSuspiciousActivityMetrics(startDate, endDate);

      expect(result).toEqual(mockMetrics);
      expect(mockSecurityMetricsService.getSuspiciousActivityMetrics).toHaveBeenCalledWith({
        start: new Date(startDate),
        end: new Date(endDate),
      });
    });
  });

  describe('getSecurityLogs', () => {
    it('should return security logs without filters', async () => {
      const mockLogs = [
        { id: '1', eventType: SecurityEventType.LOGIN_FAILED, timestamp: new Date() },
        { id: '2', eventType: SecurityEventType.ACCOUNT_LOCKED, timestamp: new Date() },
      ];
      mockSecurityLogService.getSecurityLogs.mockResolvedValue(mockLogs);

      const result = await controller.getSecurityLogs();

      expect(result).toEqual(mockLogs);
      expect(mockSecurityLogService.getSecurityLogs).toHaveBeenCalledWith({
        eventType: undefined,
        userId: undefined,
        ipAddress: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: undefined,
      });
    });

    it('should return security logs with all filters', async () => {
      const mockLogs = [
        { id: '1', eventType: SecurityEventType.LOGIN_FAILED, timestamp: new Date() },
      ];
      mockSecurityLogService.getSecurityLogs.mockResolvedValue(mockLogs);

      const result = await controller.getSecurityLogs(
        SecurityEventType.LOGIN_FAILED,
        'user-123',
        '192.168.1.1',
        '2024-01-01',
        '2024-01-31',
        '10',
      );

      expect(result).toEqual(mockLogs);
      expect(mockSecurityLogService.getSecurityLogs).toHaveBeenCalledWith({
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10,
      });
    });

    it('should handle invalid limit gracefully', async () => {
      const mockLogs = [];
      mockSecurityLogService.getSecurityLogs.mockResolvedValue(mockLogs);

      const result = await controller.getSecurityLogs(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'invalid-limit',
      );

      expect(result).toEqual(mockLogs);
      expect(mockSecurityLogService.getSecurityLogs).toHaveBeenCalledWith({
        eventType: undefined,
        userId: undefined,
        ipAddress: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: NaN, // parseInt('invalid-limit') returns NaN
      });
    });
  });

  describe('unlockAccount', () => {
    it('should unlock account successfully', async () => {
      const targetEmail = 'locked@example.com';
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'admin-id',
        email: 'admin@example.com',
      } as any);
      mockAuthService.unlockAccount.mockResolvedValue(undefined);

      const result = await controller.unlockAccount(targetEmail, mockUser);

      expect(result).toEqual({
        message: 'Account unlocked successfully',
        email: targetEmail,
        unlockedBy: mockUser.email,
        timestamp: expect.any(Date),
      });
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(mockUser.sub);
      expect(mockAuthService.unlockAccount).toHaveBeenCalledWith(targetEmail, mockUser.sub);
    });

    it('should throw ForbiddenException when admin tries to unlock their own account', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'admin-id',
        email: 'admin@example.com',
      } as any);

      await expect(controller.unlockAccount('admin@example.com', mockUser)).rejects.toThrow(
        new ForbiddenException('Cannot unlock your own account'),
      );

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(mockUser.sub);
      expect(mockAuthService.unlockAccount).not.toHaveBeenCalled();
    });

    it('should handle service errors when unlocking account', async () => {
      const targetEmail = 'locked@example.com';
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'admin-id',
        email: 'admin@example.com',
      } as any);
      mockAuthService.unlockAccount.mockRejectedValue(new Error('Database error'));

      await expect(controller.unlockAccount(targetEmail, mockUser)).rejects.toThrow(
        'Database error',
      );

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(mockUser.sub);
      expect(mockAuthService.unlockAccount).toHaveBeenCalledWith(targetEmail, mockUser.sub);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from metrics service', async () => {
      mockSecurityMetricsService.getDashboardMetrics.mockRejectedValue(
        new Error('Metrics service error'),
      );

      await expect(controller.getDashboardMetrics()).rejects.toThrow('Metrics service error');
    });

    it('should propagate errors from log service', async () => {
      mockSecurityLogService.getSecurityLogs.mockRejectedValue(new Error('Log service error'));

      await expect(controller.getSecurityLogs()).rejects.toThrow('Log service error');
    });
  });
});