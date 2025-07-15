import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { SecurityAlertService, SecurityAlertType } from './security-alert.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('SecurityAlertService', () => {
  let service: SecurityAlertService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
        SECURITY_ALERT_AUTH_TOKEN: 'test-token',
        SECURITY_ALERTS_ENABLED: true,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock implementation for each test
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
        SECURITY_ALERT_AUTH_TOKEN: 'test-token',
        SECURITY_ALERTS_ENABLED: true,
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAlertService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<SecurityAlertService>(SecurityAlertService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAlert', () => {
    it('should send alert when enabled and webhook URL is configured', async () => {
      const payload = {
        type: SecurityAlertType.ACCOUNT_LOCKED,
        severity: 'high' as const,
        timestamp: new Date(),
        details: {
          email: 'test@example.com',
          message: 'Test alert',
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendAlert(payload);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          timeout: 5000,
        },
      );
    });

    it('should not send alert when alerts are disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SECURITY_ALERTS_ENABLED') return false;
        return null;
      });

      const alertService = new SecurityAlertService(configService as any, httpService as any);

      const payload = {
        type: SecurityAlertType.ACCOUNT_LOCKED,
        severity: 'high' as const,
        timestamp: new Date(),
        details: {
          email: 'test@example.com',
          message: 'Test alert',
        },
      };

      await alertService.sendAlert(payload);

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully', async () => {
      // Re-instantiate with enabled alerts
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
          SECURITY_ALERT_AUTH_TOKEN: 'test-token',
          SECURITY_ALERTS_ENABLED: true,
        };
        return config[key] ?? defaultValue;
      });

      const errorService = new SecurityAlertService(configService as any, httpService as any);

      const payload = {
        type: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: 'critical' as const,
        timestamp: new Date(),
        details: {
          email: 'test@example.com',
          message: 'Test alert',
        },
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      // Should not throw error
      await expect(errorService.sendAlert(payload)).resolves.not.toThrow();

      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });

  describe('sendAccountLockedAlert', () => {
    it('should send account locked alert with correct payload', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      const failedAttempts = 5;
      const ipAddress = '192.168.1.1';

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendAccountLockedAlert(email, userId, lockedUntil, failedAttempts, ipAddress);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        expect.objectContaining({
          type: SecurityAlertType.ACCOUNT_LOCKED,
          severity: 'high',
          timestamp: expect.any(Date),
          details: expect.objectContaining({
            email,
            userId,
            ipAddress,
            lockedUntil,
            failedAttempts,
            message: expect.stringContaining(`Account ${email} has been locked`),
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendSuspiciousLoginAlert', () => {
    it('should send suspicious login alert with critical severity for high risk score', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const riskScore = 85;
      const reason = 'Multiple IPs detected';

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendSuspiciousLoginAlert(
        email,
        userId,
        ipAddress,
        userAgent,
        riskScore,
        reason,
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: SecurityAlertType.SUSPICIOUS_LOGIN,
          severity: 'critical', // High risk score >= 80
          details: expect.objectContaining({
            email,
            userId,
            ipAddress,
            userAgent,
            riskScore,
            message: expect.stringContaining(`risk score ${riskScore}`),
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendBruteForceAlert', () => {
    it('should send brute force alert with critical severity', async () => {
      const ipAddress = '192.168.1.1';
      const attemptCount = 25;
      const timeWindowMinutes = 60;

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendBruteForceAlert(ipAddress, attemptCount, timeWindowMinutes);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: SecurityAlertType.BRUTE_FORCE_ATTEMPT,
          severity: 'critical',
          details: expect.objectContaining({
            ipAddress,
            message: expect.stringContaining(`${attemptCount} attempts`),
            additionalInfo: {
              attemptCount,
              timeWindowMinutes,
            },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendMultipleFailedAttemptsAlert', () => {
    it('should send high severity alert when only 1 attempt remaining', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      const failedAttempts = 4;
      const remainingAttempts = 1;
      const ipAddress = '192.168.1.1';

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendMultipleFailedAttemptsAlert(
        email,
        userId,
        failedAttempts,
        remainingAttempts,
        ipAddress,
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
          severity: 'high', // 1 or fewer attempts remaining
          details: expect.objectContaining({
            email,
            userId,
            ipAddress,
            failedAttempts,
            message: expect.stringContaining(`${remainingAttempts} attempts remaining`),
            additionalInfo: {
              remainingAttempts,
            },
          }),
        }),
        expect.any(Object),
      );
    });

    it('should send medium severity alert when multiple attempts remaining', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      const failedAttempts = 3;
      const remainingAttempts = 2;

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendMultipleFailedAttemptsAlert(
        email,
        userId,
        failedAttempts,
        remainingAttempts,
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
          severity: 'medium', // More than 1 attempt remaining
        }),
        expect.any(Object),
      );
    });
  });
});
