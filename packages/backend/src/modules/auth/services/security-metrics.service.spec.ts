import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMetricsService } from './security-metrics.service';
import { SecurityLogService } from './security-log.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecurityEventType } from '@/modules/auth/constants';

describe('SecurityMetricsService', () => {
  let service: SecurityMetricsService;
  let securityLogService: jest.Mocked<SecurityLogService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockSecurityLogs = [
    {
      id: '1',
      eventType: SecurityEventType.LOGIN_FAILED,
      severity: 'WARN',
      userId: 'user1',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      sessionId: null,
      metadata: {},
      message: null,
      createdAt: new Date(),
      user: null,
      previousHash: '',
      sequenceNumber: BigInt(1),
      hashAlgorithm: '',
      currentHash: '',
    },
    {
      id: '2',
      eventType: SecurityEventType.LOGIN_FAILED,
      severity: 'WARN',
      userId: 'user2',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      sessionId: null,
      metadata: {},
      message: null,
      createdAt: new Date(),
      user: null,
      previousHash: '',
      sequenceNumber: BigInt(1),
      hashAlgorithm: '',
      currentHash: '',
    },
    {
      id: '3',
      eventType: SecurityEventType.LOGIN_FAILED,
      severity: 'WARN',
      userId: 'user1',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      sessionId: null,
      metadata: {},
      message: null,
      createdAt: new Date(),
      user: null,
      previousHash: '',
      sequenceNumber: BigInt(1),
      hashAlgorithm: '',
      currentHash: '',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMetricsService,
        {
          provide: SecurityLogService,
          useValue: {
            getSecurityLogs: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityMetricsService>(SecurityMetricsService);
    securityLogService = module.get(SecurityLogService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFailedLoginMetrics', () => {
    it('should aggregate failed login metrics by IP and user', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue(mockSecurityLogs);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getFailedLoginMetrics(timeRange);

      expect(result.total).toBe(3);
      expect(result.byIp).toHaveLength(2);
      expect(result.byIp[0]).toEqual({ ip: '192.168.1.1', count: 2 });
      expect(result.byUser).toHaveLength(2);
      expect(result.byUser[0]).toEqual({ userId: 'user1', count: 2 });
    });

    it('should handle empty logs', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getFailedLoginMetrics(timeRange);

      expect(result.total).toBe(0);
      expect(result.byIp).toHaveLength(0);
      expect(result.byUser).toHaveLength(0);
      expect(result.byHour).toHaveLength(0);
    });
  });

  describe('getAccountLockoutMetrics', () => {
    it('should aggregate lockout metrics by reason', async () => {
      const lockoutLogs = [
        {
          id: '1',
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          severity: 'ERROR',
          userId: 'user1',
          ipAddress: null,
          userAgent: null,
          sessionId: null,
          metadata: { reason: 'max_attempts' },
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
        {
          id: '2',
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          severity: 'ERROR',
          userId: 'user2',
          ipAddress: null,
          userAgent: null,
          sessionId: null,
          metadata: { reason: 'max_attempts' },
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
        {
          id: '3',
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          severity: 'ERROR',
          userId: 'user3',
          ipAddress: null,
          userAgent: null,
          sessionId: null,
          metadata: { reason: 'suspicious_activity' },
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(lockoutLogs);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getAccountLockoutMetrics(timeRange);

      expect(result.total).toBe(3);
      expect(result.byReason).toContainEqual({ reason: 'max_attempts', count: 2 });
      expect(result.byReason).toContainEqual({ reason: 'suspicious_activity', count: 1 });
    });
  });

  describe('getDashboardMetrics', () => {
    it('should aggregate all metrics for dashboard', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      const result = await service.getDashboardMetrics();

      expect(result.summary).toHaveProperty('failedLogins');
      expect(result.summary).toHaveProperty('accountLockouts');
      expect(result.summary).toHaveProperty('suspiciousActivities');
      expect(result.details).toHaveProperty('topFailedLoginIps');
      expect(result.details).toHaveProperty('topLockedUsers');
      expect(result.details).toHaveProperty('suspiciousActivityTypes');
    });
  });

  describe('emitMetrics', () => {
    it('should emit metrics event', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      await service.emitMetrics();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.metrics',
        expect.objectContaining({
          timestamp: expect.any(Date),
          metrics: expect.any(Object),
        }),
      );
    });
  });

  describe('getSuspiciousActivityMetrics', () => {
    it('should aggregate suspicious activity metrics', async () => {
      const suspiciousLogs = [
        {
          id: '1',
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: 'ERROR',
          userId: 'user1',
          ipAddress: '192.168.1.1',
          userAgent: null,
          sessionId: null,
          metadata: { type: 'brute_force' },
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
        {
          id: '2',
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: 'ERROR',
          userId: 'user2',
          ipAddress: '192.168.1.2',
          userAgent: null,
          sessionId: null,
          metadata: { type: 'brute_force' },
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
        {
          id: '3',
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: 'ERROR',
          userId: 'user3',
          ipAddress: '192.168.1.1',
          userAgent: null,
          sessionId: null,
          metadata: { type: 'credential_stuffing' },
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(suspiciousLogs);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getSuspiciousActivityMetrics(timeRange);

      expect(result.total).toBe(3);
      expect(result.byType).toContainEqual({ type: 'brute_force', count: 2 });
      expect(result.byType).toContainEqual({ type: 'credential_stuffing', count: 1 });
      expect(result.byIp[0]).toEqual({ ip: '192.168.1.1', count: 2 });
    });

    it('should handle missing metadata', async () => {
      const suspiciousLogs = [
        {
          id: '1',
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: 'ERROR',
          userId: 'user1',
          ipAddress: null,
          userAgent: null,
          sessionId: null,
          metadata: null,
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
        {
          id: '2',
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: 'ERROR',
          userId: 'user2',
          ipAddress: '192.168.1.1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(suspiciousLogs);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getSuspiciousActivityMetrics(timeRange);

      expect(result.total).toBe(2);
      expect(result.byType).toContainEqual({ type: 'unknown', count: 2 });
    });
  });

  describe('getFailedLoginMetrics edge cases', () => {
    it('should handle missing user and IP data', async () => {
      const logs = [
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          userId: null,
          ipAddress: null,
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(logs);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getFailedLoginMetrics(timeRange);

      expect(result.total).toBe(1);
      expect(result.byIp).toHaveLength(0);
      expect(result.byUser).toHaveLength(0);
    });
  });

  describe('getAccountLockoutMetrics edge cases', () => {
    it('should handle missing metadata and user data', async () => {
      const logs = [
        {
          id: '1',
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          severity: 'ERROR',
          userId: null,
          ipAddress: null,
          userAgent: null,
          sessionId: null,
          metadata: null,
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(logs);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = await service.getAccountLockoutMetrics(timeRange);

      expect(result.total).toBe(1);
      expect(result.byReason).toContainEqual({ reason: 'unknown', count: 1 });
      expect(result.byUser).toHaveLength(0);
    });
  });

  describe('calculateTrend', () => {
    it('should calculate positive trend correctly', async () => {
      // Mock data that will result in specific trend calculations
      const failedLogins7d = Array(14)
        .fill(null)
        .map(() => ({
          id: Math.random().toString(),
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          userId: 'user1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
          previousHash: '',
          sequenceNumber: BigInt(1),
          hashAlgorithm: '',
          currentHash: '',
        }));

      const failedLogins24h = failedLogins7d.slice(0, 4); // 4 in last 24h, average is 2 per day

      securityLogService.getSecurityLogs
        .mockResolvedValueOnce(failedLogins24h)
        .mockResolvedValueOnce(failedLogins7d)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboardMetrics();

      expect(result.summary.failedLogins.trend).toBe(100); // 100% increase
    });

    it('should handle zero values in trend calculation', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      const result = await service.getDashboardMetrics();

      expect(result.summary.failedLogins.trend).toBe(0);
      expect(result.summary.accountLockouts.trend).toBe(0);
      expect(result.summary.suspiciousActivities.trend).toBe(0);
    });
  });
});
