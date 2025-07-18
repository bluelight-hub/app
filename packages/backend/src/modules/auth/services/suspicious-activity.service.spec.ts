import { Test, TestingModule } from '@nestjs/testing';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { SecurityLogService } from './security-log.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecurityEventType } from '../enums/security-event-type.enum';

describe('SuspiciousActivityService', () => {
  let service: SuspiciousActivityService;
  let securityLogService: jest.Mocked<SecurityLogService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuspiciousActivityService,
        {
          provide: SecurityLogService,
          useValue: {
            getSecurityLogs: jest.fn(),
            logSecurityEvent: jest.fn(),
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

    service = module.get<SuspiciousActivityService>(SuspiciousActivityService);
    securityLogService = module.get(SecurityLogService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkLoginPatterns', () => {
    it('should check all login patterns for a user', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      // Should check multiple patterns
      expect(securityLogService.getSecurityLogs).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkBruteForcePattern', () => {
    it('should detect brute force attempts', async () => {
      const failedAttempts = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          ipAddress: '192.168.1.1',
          userId: `user${i}`,
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(failedAttempts);

      await service.checkBruteForcePattern('192.168.1.1');

      expect(securityLogService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId: undefined,
        ipAddress: '192.168.1.1',
        metadata: expect.objectContaining({
          type: 'brute_force_attempt',
          attemptCount: 10,
        }),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.bruteforce.detected',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          attemptCount: 10,
        }),
      );
    });

    it('should not report if below threshold', async () => {
      securityLogService.getSecurityLogs.mockResolvedValue([
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          ipAddress: '192.168.1.1',
          userId: null,
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        },
      ]);

      await service.checkBruteForcePattern('192.168.1.1');

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'security.bruteforce.detected',
        expect.anything(),
      );
    });
  });

  describe('checkAccountEnumeration', () => {
    it('should detect account enumeration attempts', async () => {
      const failedAttempts = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          ipAddress: '192.168.1.1',
          userId: null,
          userAgent: null,
          sessionId: null,
          metadata: { username: `user${i}@example.com` },
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(failedAttempts);

      await service.checkAccountEnumeration('192.168.1.1');

      expect(securityLogService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId: undefined,
        ipAddress: '192.168.1.1',
        metadata: expect.objectContaining({
          type: 'account_enumeration',
          uniqueUsernames: 5,
        }),
      });
    });

    it('should not report if below threshold', async () => {
      const failedAttempts = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          ipAddress: '192.168.1.1',
          userId: null,
          userAgent: null,
          sessionId: null,
          metadata: { username: `user${i}@example.com` },
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(failedAttempts);

      await service.checkAccountEnumeration('192.168.1.1');

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle attempts without username metadata', async () => {
      const failedAttempts = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          ipAddress: '192.168.1.1',
          userId: null,
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(failedAttempts);

      await service.checkAccountEnumeration('192.168.1.1');

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  describe('checkRapidLoginAttempts', () => {
    it('should detect rapid login attempts', async () => {
      const recentLogins = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.1',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(recentLogins);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      expect(securityLogService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId: 'user1',
        ipAddress: undefined,
        metadata: expect.objectContaining({
          type: 'rapid_login_attempts',
          loginCount: 3,
          timeWindow: '1 minute',
        }),
      });
    });

    it('should not report if below threshold', async () => {
      const recentLogins = Array(2)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.1',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(recentLogins);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  describe('checkMultipleIpAddresses', () => {
    it('should detect multiple IP login attempts', async () => {
      const recentLogins = [
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.1',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        },
        {
          id: '2',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.2',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        },
        {
          id: '3',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.3',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(recentLogins);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      expect(securityLogService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId: 'user1',
        ipAddress: undefined,
        metadata: expect.objectContaining({
          type: 'multiple_ip_login',
          ipCount: 3,
          timeWindow: '10 minutes',
        }),
      });
    });

    it('should not report if below threshold', async () => {
      const recentLogins = [
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.1',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        },
        {
          id: '2',
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: '192.168.1.2',
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        },
      ];

      securityLogService.getSecurityLogs.mockResolvedValue(recentLogins);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle logins without IP addresses', async () => {
      // Use only 2 recent logins (less than 5 threshold) to avoid rapid login detection
      const recentLogins = Array(2)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: 'INFO',
          ipAddress: null,
          userId: 'user1',
          userAgent: null,
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: null,
        }));

      securityLogService.getSecurityLogs.mockResolvedValue(recentLogins);

      await service.checkLoginPatterns('user1', null); // No IP address for current login either

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  describe('checkUnusualLoginTime', () => {
    let originalDate: typeof Date;

    beforeEach(() => {
      originalDate = global.Date;
      // Clear mocks before each test
      jest.clearAllMocks();
    });

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should detect unusual login time (early morning)', async () => {
      // Mock Date to return early morning hour
      const mockDate = new Date('2024-01-01T03:00:00.000Z');
      const mockDateConstructor = jest.fn(() => mockDate) as any;
      mockDateConstructor.now = jest.fn(() => mockDate.getTime());
      global.Date = mockDateConstructor;

      // Mock getSecurityLogs to return empty array (no rapid login attempts)
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      expect(securityLogService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId: 'user1',
        ipAddress: '192.168.1.1',
        metadata: expect.objectContaining({
          type: 'unusual_login_time',
          hour: 4, // Local time (UTC+1)
          ipAddress: '192.168.1.1',
        }),
      });
    });

    it('should not report during normal hours', async () => {
      // Mock Date to return normal business hour
      const mockDate = new Date('2024-01-01T14:00:00.000Z');
      const mockDateConstructor = jest.fn(() => mockDate) as any;
      mockDateConstructor.now = jest.fn(() => mockDate.getTime());
      global.Date = mockDateConstructor;

      // Mock getSecurityLogs to return empty array (no rapid login attempts)
      securityLogService.getSecurityLogs.mockResolvedValue([]);

      await service.checkLoginPatterns('user1', '192.168.1.1');

      expect(securityLogService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });
});
