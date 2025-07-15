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
  });
});
