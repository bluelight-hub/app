import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoginAttemptService } from './login-attempt.service';
import { SecurityAlertService } from './security-alert.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateLoginAttemptDto } from '../dto/login-attempt.dto';
import { LoginAttempt, User } from '@prisma/generated/prisma';

describe('LoginAttemptService', () => {
  let service: LoginAttemptService;
  let _prismaService: PrismaService;
  let _configService: ConfigService;
  let _securityAlertService: any;

  const mockPrismaService = {
    loginAttempt: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRY: '15m',
        JWT_REFRESH_EXPIRY: '7d',
        LOGIN_MAX_ATTEMPTS: 5,
        LOGIN_WINDOW_MINUTES: 15,
        LOGIN_LOCKOUT_MINUTES: 30,
        IP_RATE_LIMIT_ATTEMPTS: 20,
        IP_RATE_LIMIT_MINUTES: 60,
        SESSION_INACTIVITY_TIMEOUT: 30,
        MAX_CONCURRENT_SESSIONS: 5,
        SESSION_HEARTBEAT_INTERVAL: 30,
        SECURITY_ALERTS_ENABLED: 'true',
        SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.test.com',
        SECURITY_ALERT_AUTH_TOKEN: 'test-token',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockSecurityAlertService = {
    sendAccountLockedAlert: jest.fn(),
    sendSuspiciousLoginAlert: jest.fn(),
    sendBruteForceAlert: jest.fn(),
    sendMultipleFailedAttemptsAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginAttemptService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SecurityAlertService, useValue: mockSecurityAlertService },
      ],
    }).compile();

    service = module.get<LoginAttemptService>(LoginAttemptService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _configService = module.get<ConfigService>(ConfigService);
    _securityAlertService = mockSecurityAlertService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordLoginAttempt', () => {
    it('should record a successful login attempt', async () => {
      const createDto: CreateLoginAttemptDto = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true,
      };

      const expectedLoginAttempt: LoginAttempt = {
        id: 'attempt-123',
        userId: createDto.userId,
        email: createDto.email,
        attemptAt: new Date(),
        ipAddress: createDto.ipAddress,
        userAgent: createDto.userAgent,
        success: true,
        failureReason: null,
        location: null,
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        suspicious: false,
        riskScore: 0,
        metadata: null,
      };

      mockPrismaService.loginAttempt.create.mockResolvedValue(expectedLoginAttempt);
      mockPrismaService.loginAttempt.findMany.mockResolvedValue([]);

      const result = await service.recordLoginAttempt(createDto);

      expect(result).toEqual(expectedLoginAttempt);
      expect(mockPrismaService.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          userId: createDto.userId,
          email: createDto.email,
          ipAddress: createDto.ipAddress,
          userAgent: createDto.userAgent,
          success: true,
          failureReason: undefined,
          deviceType: expect.any(String),
          browser: expect.any(String),
          os: expect.any(String),
          suspicious: false,
          riskScore: 0,
          metadata: undefined,
        },
      });
    });

    it('should record a failed login attempt with high risk score', async () => {
      const createDto: CreateLoginAttemptDto = {
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'bot-agent',
        success: false,
        failureReason: 'Invalid password',
      };

      const recentFailedAttempts = [
        { success: false, ipAddress: '192.168.1.1' },
        { success: false, ipAddress: '192.168.1.2' },
        { success: false, ipAddress: '192.168.1.3' },
        { success: false, ipAddress: '192.168.1.4' },
      ];

      mockPrismaService.loginAttempt.findMany.mockResolvedValue(recentFailedAttempts);
      mockPrismaService.loginAttempt.create.mockResolvedValue({
        id: 'attempt-124',
        userId: null,
        email: createDto.email,
        attemptAt: new Date(),
        ipAddress: createDto.ipAddress,
        userAgent: createDto.userAgent,
        success: false,
        failureReason: 'Invalid password',
        location: null,
        deviceType: null,
        browser: null,
        os: null,
        suspicious: true,
        riskScore: 60, // High risk due to bot agent and multiple IPs
        metadata: null,
      });

      const result = await service.recordLoginAttempt(createDto);

      expect(result.suspicious).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
    });

    it('should send suspicious login alert when risk score exceeds threshold', async () => {
      const createDto: CreateLoginAttemptDto = {
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'bot-agent',
        success: false,
        failureReason: 'Suspicious activity',
      };

      // Mock high risk score scenario with multiple failed attempts from different IPs
      const recentFailedAttempts = [
        { success: false, ipAddress: '192.168.1.1', attemptAt: new Date() },
        { success: false, ipAddress: '192.168.1.2', attemptAt: new Date() },
        { success: false, ipAddress: '192.168.1.3', attemptAt: new Date() },
        { success: false, ipAddress: '192.168.1.4', attemptAt: new Date() },
        { success: false, ipAddress: '192.168.1.5', attemptAt: new Date() },
      ];
      mockPrismaService.loginAttempt.findMany.mockResolvedValue(recentFailedAttempts);

      // The service will calculate: 20 (failed) + 30 (5 failed attempts) + 20 (>3 unique IPs) + 10 (bot agent) = 80
      mockPrismaService.loginAttempt.create.mockImplementation(async ({ data }) => {
        return {
          id: 'attempt-125',
          userId: null,
          email: data.email,
          attemptAt: new Date(),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success,
          failureReason: data.failureReason,
          location: null,
          deviceType: data.deviceType,
          browser: data.browser,
          os: data.os,
          suspicious: data.suspicious,
          riskScore: data.riskScore,
          metadata: data.metadata,
        } as LoginAttempt;
      });

      await service.recordLoginAttempt(createDto);

      expect(mockSecurityAlertService.sendSuspiciousLoginAlert).toHaveBeenCalledWith(
        createDto.email,
        null,
        createDto.ipAddress,
        createDto.userAgent,
        80,
        'Suspicious activity',
      );
    });
  });

  describe('checkAndUpdateLockout', () => {
    it('should lock account after exceeding max attempts', async () => {
      const email = 'test@example.com';
      const user: Partial<User> = {
        id: 'user-123',
        email,
      };

      mockPrismaService.loginAttempt.count.mockResolvedValue(5); // Max attempts reached
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        failedLoginCount: 5,
      });

      const result = await service.checkAndUpdateLockout(email);

      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toBeInstanceOf(Date);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email },
        data: {
          lockedUntil: expect.any(Date),
          failedLoginCount: 5,
        },
      });

      expect(mockSecurityAlertService.sendAccountLockedAlert).toHaveBeenCalledWith(
        email,
        'user-123',
        expect.any(Date),
        5,
      );
    });

    it('should not lock account if attempts are below threshold', async () => {
      const email = 'test@example.com';

      mockPrismaService.loginAttempt.count.mockResolvedValue(3); // Below max attempts

      const result = await service.checkAndUpdateLockout(email);

      expect(result.isLocked).toBe(false);
      expect(result.lockedUntil).toBeUndefined();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('isAccountLocked', () => {
    it('should return true for locked account', async () => {
      const email = 'test@example.com';
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      mockPrismaService.user.findUnique.mockResolvedValue({
        lockedUntil,
      });

      const result = await service.isAccountLocked(email);

      expect(result).toBe(true);
    });

    it('should return false and reset lockout for expired lock', async () => {
      const email = 'test@example.com';
      const lockedUntil = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      mockPrismaService.user.findUnique.mockResolvedValue({
        lockedUntil,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.isAccountLocked(email);

      expect(result).toBe(false);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email },
        data: {
          lockedUntil: null,
          failedLoginCount: 0,
        },
      });
    });

    it('should return false for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.isAccountLocked('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('checkIpRateLimit', () => {
    it('should return true when IP exceeds rate limit', async () => {
      const ipAddress = '192.168.1.1';

      mockPrismaService.loginAttempt.count.mockResolvedValue(20); // Max IP attempts

      const result = await service.checkIpRateLimit(ipAddress);

      expect(result).toBe(true);
      expect(mockSecurityAlertService.sendBruteForceAlert).toHaveBeenCalledWith(ipAddress, 20, 60);
    });

    it('should return false when IP is within rate limit', async () => {
      const ipAddress = '192.168.1.1';

      mockPrismaService.loginAttempt.count.mockResolvedValue(10); // Below limit

      const result = await service.checkIpRateLimit(ipAddress);

      expect(result).toBe(false);
    });
  });

  describe('getLoginStats', () => {
    it('should return login statistics for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.loginAttempt.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // successful
        .mockResolvedValueOnce(5); // suspicious

      mockPrismaService.loginAttempt.groupBy.mockResolvedValue([
        { ipAddress: '192.168.1.1' },
        { ipAddress: '192.168.1.2' },
        { ipAddress: '192.168.1.3' },
      ]);

      mockPrismaService.loginAttempt.aggregate.mockResolvedValue({
        _avg: { riskScore: 25.5 },
      });

      const result = await service.getLoginStats(startDate, endDate);

      expect(result).toEqual({
        totalAttempts: 100,
        successfulAttempts: 80,
        failedAttempts: 20,
        uniqueIps: 3,
        suspiciousAttempts: 5,
        averageRiskScore: 26,
        periodStart: startDate,
        periodEnd: endDate,
      });
    });
  });

  describe('getRecentAttempts', () => {
    it('should return recent login attempts', async () => {
      const mockAttempts: LoginAttempt[] = [
        {
          id: '1',
          userId: 'user-1',
          email: 'user1@example.com',
          attemptAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true,
          failureReason: null,
          location: null,
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          suspicious: false,
          riskScore: 0,
          metadata: null,
        },
        {
          id: '2',
          userId: null,
          email: 'user2@example.com',
          attemptAt: new Date(),
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          success: false,
          failureReason: 'Invalid password',
          location: null,
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
          suspicious: false,
          riskScore: 20,
          metadata: null,
        },
      ];

      mockPrismaService.loginAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getRecentAttempts(undefined, 10);

      expect(result).toEqual(mockAttempts);
      expect(mockPrismaService.loginAttempt.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { attemptAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
            },
          },
        },
      });
    });

    it('should filter by email when provided', async () => {
      const email = 'test@example.com';
      mockPrismaService.loginAttempt.findMany.mockResolvedValue([]);

      await service.getRecentAttempts(email, 5);

      expect(mockPrismaService.loginAttempt.findMany).toHaveBeenCalledWith({
        where: { email },
        orderBy: { attemptAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed login attempts for a user', async () => {
      const email = 'test@example.com';
      mockPrismaService.user.update.mockResolvedValue({});

      await service.resetFailedAttempts(email);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('checkMultipleFailedAttempts', () => {
    it('should send alert when failed attempts reach threshold', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      const failedAttempts = 3;
      const remainingAttempts = 2;
      const ipAddress = '192.168.1.1';

      await service.checkMultipleFailedAttempts(
        email,
        userId,
        failedAttempts,
        remainingAttempts,
        ipAddress,
      );

      expect(mockSecurityAlertService.sendMultipleFailedAttemptsAlert).toHaveBeenCalledWith(
        email,
        userId,
        failedAttempts,
        remainingAttempts,
        ipAddress,
      );
    });

    it('should not send alert when failed attempts are below threshold', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      const failedAttempts = 2; // Below threshold of 3
      const remainingAttempts = 3;
      const ipAddress = '192.168.1.1';

      await service.checkMultipleFailedAttempts(
        email,
        userId,
        failedAttempts,
        remainingAttempts,
        ipAddress,
      );

      expect(mockSecurityAlertService.sendMultipleFailedAttemptsAlert).not.toHaveBeenCalled();
    });
  });
});
