import { Test, TestingModule } from '@nestjs/testing';
import { LoginAttemptService } from '../login-attempt.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityAlertService } from '../security-alert.service';
import { SecurityLogService } from '../security-log.service';
import { SuspiciousActivityService } from '../suspicious-activity.service';
import { HttpService } from '@nestjs/axios';
import { RetryUtil } from '@/common/utils/retry.util';
import { CircuitBreaker } from '@/common/utils/circuit-breaker.util';
import { of } from 'rxjs';

describe('Bot Detection in LoginAttemptService', () => {
  let service: LoginAttemptService;

  const mockPrismaService = {
    loginAttempt: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
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
        LOGIN_LOCKOUT_MINUTES: 0.167,
        IP_RATE_LIMIT_ATTEMPTS: 20,
        IP_RATE_LIMIT_MINUTES: 60,
        SESSION_INACTIVITY_TIMEOUT: 30,
        MAX_CONCURRENT_SESSIONS: 5,
        SESSION_HEARTBEAT_INTERVAL: 30,
        SECURITY_ALERTS_ENABLED: 'true',
        SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com',
        SECURITY_ALERT_AUTH_TOKEN: 'test-token',
        // Add missing retry config values
        SECURITY_ALERT_MAX_RETRIES: 3,
        SECURITY_ALERT_BASE_DELAY: 100,
        SECURITY_ALERT_MAX_DELAY: 5000,
        SECURITY_ALERT_BACKOFF_MULTIPLIER: 2,
        SECURITY_ALERT_JITTER_FACTOR: 0.1,
        SECURITY_ALERT_TIMEOUT: 5000,
        // Add missing circuit breaker config
        SECURITY_ALERT_FAILURE_THRESHOLD: 5,
        SECURITY_ALERT_FAILURE_WINDOW: 60000,
        SECURITY_ALERT_OPEN_DURATION: 30000,
        SECURITY_ALERT_SUCCESS_THRESHOLD: 3,
        SECURITY_ALERT_FAILURE_RATE: 50,
        SECURITY_ALERT_MIN_CALLS: 5,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockSecurityLogService = {
    logSecurityEvent: jest.fn(),
  };

  const mockSuspiciousActivityService = {
    checkBruteForcePattern: jest.fn(),
    checkAccountEnumeration: jest.fn(),
    checkLoginPatterns: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn().mockReturnValue(
      of({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginAttemptService,
        SecurityAlertService,
        RetryUtil,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: SecurityLogService, useValue: mockSecurityLogService },
        { provide: SuspiciousActivityService, useValue: mockSuspiciousActivityService },
        {
          provide: CircuitBreaker,
          useFactory: () => new CircuitBreaker('TestBreaker'),
        },
      ],
    }).compile();

    service = module.get<LoginAttemptService>(LoginAttemptService);
  });

  describe('Bot Detection', () => {
    const testCases = [
      {
        name: 'should detect Googlebot',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        expectedBot: true,
        expectedHighRisk: true,
      },
      {
        name: 'should detect curl requests',
        userAgent: 'curl/7.64.1',
        expectedBot: true,
        expectedHighRisk: true,
      },
      {
        name: 'should detect Python requests',
        userAgent: 'python-requests/2.25.1',
        expectedBot: true,
        expectedHighRisk: true,
      },
      {
        name: 'should detect headless Chrome',
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36',
        expectedBot: true,
        expectedHighRisk: true,
      },
      {
        name: 'should detect web scrapers',
        userAgent: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
        expectedBot: true,
        expectedHighRisk: true,
      },
      {
        name: 'should not flag legitimate Chrome browser',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        expectedBot: false,
        expectedHighRisk: false,
      },
      {
        name: 'should not flag legitimate Firefox browser',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        expectedBot: false,
        expectedHighRisk: false,
      },
      {
        name: 'should detect missing user agent as suspicious',
        userAgent: undefined,
        expectedBot: true,
        expectedHighRisk: true,
      },
      {
        name: 'should detect empty user agent as suspicious',
        userAgent: '',
        expectedBot: true,
        expectedHighRisk: true,
      },
    ];

    testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Mock previous attempts
        mockPrismaService.loginAttempt.findMany.mockResolvedValue([]);
        mockPrismaService.loginAttempt.count.mockResolvedValue(0);

        // Mock login attempt creation
        mockPrismaService.loginAttempt.create.mockImplementation((data) => {
          return Promise.resolve({
            id: '123',
            ...data.data,
            attemptAt: new Date(),
          });
        });

        const loginData = {
          email: 'test@example.com',
          ipAddress: '127.0.0.1',
          userAgent: testCase.userAgent,
          success: false,
          failureReason: 'Invalid credentials',
        };

        const result = await service.recordLoginAttempt(loginData);

        // Check if bot was detected correctly
        const metadata = result.metadata as any;
        expect(metadata?.botDetected).toBe(testCase.expectedBot);

        // Check if marked as suspicious when bot detected
        if (testCase.expectedBot) {
          expect(result.suspicious).toBe(true);
        }

        // Check if appropriate risk score is assigned
        if (testCase.expectedHighRisk) {
          expect(result.riskScore).toBeGreaterThanOrEqual(25);
        }
      });
    });

    it('should calculate appropriate risk score for bot-detected login attempts', async () => {
      mockPrismaService.loginAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.loginAttempt.count.mockResolvedValue(0);

      let capturedRiskScore: number = 0;
      mockPrismaService.loginAttempt.create.mockImplementation((data) => {
        capturedRiskScore = data.data.riskScore;
        return Promise.resolve({
          id: '123',
          ...data.data,
          attemptAt: new Date(),
        });
      });

      const botUserAgent =
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

      await service.recordLoginAttempt({
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: botUserAgent,
        success: false,
        failureReason: 'Invalid credentials',
      });

      // Bot detection contributes to risk score (20 for failed + 25 for bot = 45)
      expect(capturedRiskScore).toBe(45);

      // Should NOT send suspicious login alert as risk score is below 70 threshold
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should send security alert for high-risk bot attempts with multiple failures', async () => {
      // Mock previous failed attempts to increase risk score
      const previousAttempts = [
        {
          id: '1',
          email: 'test@example.com',
          success: false,
          ipAddress: '127.0.0.1',
          attemptAt: new Date(),
        },
        {
          id: '2',
          email: 'test@example.com',
          success: false,
          ipAddress: '192.168.1.1',
          attemptAt: new Date(),
        },
        {
          id: '3',
          email: 'test@example.com',
          success: false,
          ipAddress: '10.0.0.1',
          attemptAt: new Date(),
        },
        {
          id: '4',
          email: 'test@example.com',
          success: false,
          ipAddress: '172.16.0.1',
          attemptAt: new Date(),
        },
      ];

      mockPrismaService.loginAttempt.findMany.mockResolvedValue(previousAttempts);
      mockPrismaService.loginAttempt.count.mockResolvedValue(0);

      let capturedRiskScore: number = 0;
      mockPrismaService.loginAttempt.create.mockImplementation((data) => {
        capturedRiskScore = data.data.riskScore;
        return Promise.resolve({
          id: '123',
          ...data.data,
          attemptAt: new Date(),
        });
      });

      const botUserAgent = 'curl/7.64.1';

      await service.recordLoginAttempt({
        email: 'test@example.com',
        ipAddress: '10.10.10.10',
        userAgent: botUserAgent,
        success: false,
        failureReason: 'Invalid credentials',
      });

      // Risk score should be high: 20 (failed) + 25 (bot) + 30 (4 failed attempts) + 20 (5 unique IPs) = 95
      expect(capturedRiskScore).toBeGreaterThanOrEqual(75);

      // Should send suspicious login alert for high risk
      expect(mockHttpService.post).toHaveBeenCalled();

      // Check the payload sent to the webhook
      const callArgs = mockHttpService.post.mock.calls[0];
      const payload = callArgs[1];

      expect(payload).toMatchObject({
        type: 'SUSPICIOUS_LOGIN',
        severity: expect.any(String),
        timestamp: expect.any(Date),
        details: expect.objectContaining({
          email: 'test@example.com',
          ipAddress: '10.10.10.10',
          userAgent: botUserAgent,
          riskScore: capturedRiskScore,
          message: expect.stringContaining('risk score'),
        }),
      });
    });

    it('should include bot information in device type', async () => {
      mockPrismaService.loginAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.loginAttempt.count.mockResolvedValue(0);

      let createData: any = null;
      mockPrismaService.loginAttempt.create.mockImplementation((args) => {
        createData = args.data;
        return Promise.resolve({
          id: '123',
          ...args.data,
          attemptAt: new Date(),
        });
      });

      await service.recordLoginAttempt({
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'curl/7.64.1',
        success: false,
        failureReason: 'Invalid credentials',
      });

      // Check that bot was detected in device type
      expect(createData.deviceType).toBe('bot');
      expect(createData.browser).toBe('bot');
    });
  });
});
