import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import {
  SecurityAlertServiceV2,
  SecurityAlertType,
  SecurityAlertPayload,
} from './security-alert-v2.service';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationTemplateService } from '@/modules/notification/services/notification-template.service';

describe('SecurityAlertServiceV2', () => {
  let service: SecurityAlertServiceV2;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockModuleRef = {
    get: jest.fn(),
  };

  const mockNotificationService = {
    send: jest.fn(),
  };

  const mockTemplateService = {
    getTemplate: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks BEFORE creating the service
    jest.clearAllMocks();

    // Default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SECURITY_ALERTS_ENABLED: true,
        EMAIL_ENABLED: true,
        WEBHOOK_ENABLED: false,
        SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    });

    // Mock module ref to return notification services
    mockModuleRef.get.mockImplementation((token) => {
      if (token === NotificationService) return mockNotificationService;
      if (token === NotificationTemplateService) return mockTemplateService;
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAlertServiceV2,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
      ],
    }).compile();

    service = module.get<SecurityAlertServiceV2>(SecurityAlertServiceV2);

    // Initialize the service (calls onModuleInit)
    await service.onModuleInit();
  });

  describe('constructor', () => {
    it('should initialize with alerts enabled and email channel', () => {
      expect(service).toBeDefined();
      // Config is checked during constructor initialization
      expect(mockConfigService.get).toHaveBeenCalled();
    });

    it('should initialize with both email and webhook channels when enabled', async () => {
      // Clear previous mock calls
      mockNotificationService.send.mockClear();

      // Create new config service for this test
      const multiChannelConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            SECURITY_ALERTS_ENABLED: true,
            EMAIL_ENABLED: true,
            WEBHOOK_ENABLED: true,
            SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
          };
          return config[key] !== undefined ? config[key] : defaultValue;
        }),
      };

      const newService = new SecurityAlertServiceV2(
        multiChannelConfigService as any,
        mockModuleRef as any,
      );
      await newService.onModuleInit();

      const payload: SecurityAlertPayload = {
        type: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: 'high',
        timestamp: new Date(),
        details: {
          email: 'test@example.com',
          message: 'Test',
        },
      };

      await newService.sendAlert(payload);

      expect(mockNotificationService.send).toHaveBeenCalledTimes(2); // Email and webhook
    });
  });

  describe('onModuleInit', () => {
    it('should successfully initialize notification services', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.onModuleInit();

      expect(mockModuleRef.get).toHaveBeenCalledWith(NotificationService, { strict: false });
      expect(mockModuleRef.get).toHaveBeenCalledWith(NotificationTemplateService, {
        strict: false,
      });
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should disable alerts if NotificationService is not available', async () => {
      mockModuleRef.get.mockImplementation(() => null);
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      const newService = new SecurityAlertServiceV2(mockConfigService as any, mockModuleRef as any);
      await newService.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith('NotificationService not available');

      // Verify alerts are disabled
      const payload: SecurityAlertPayload = {
        type: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: 'high',
        timestamp: new Date(),
        details: { message: 'Test' },
      };
      await newService.sendAlert(payload);
      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockModuleRef.get.mockImplementation(() => {
        throw new Error('Module not found');
      });
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      const newService = new SecurityAlertServiceV2(mockConfigService as any, mockModuleRef as any);
      await newService.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to initialize notification services',
        expect.any(Error),
      );
    });
  });

  describe('sendAlert', () => {
    const basePayload: SecurityAlertPayload = {
      type: SecurityAlertType.SUSPICIOUS_LOGIN,
      severity: 'high',
      timestamp: new Date('2024-01-10T10:00:00Z'),
      details: {
        email: 'test@example.com',
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        riskScore: 85,
        message: 'Suspicious login detected',
      },
    };

    it('should send alert when alerts are enabled', async () => {
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'template-123',
        name: 'suspicious_login',
      });

      await service.sendAlert(basePayload);

      expect(mockNotificationService.send).toHaveBeenCalledWith({
        channel: 'email',
        subject: 'Verdächtiger Anmeldeversuch erkannt',
        recipient: {
          email: 'test@example.com',
          webhookUrl: 'https://webhook.example.com/alerts',
          userId: 'user-123',
        },
        data: expect.objectContaining({
          email: 'test@example.com',
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          riskScore: 85,
          message: 'Suspicious login detected',
          alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
          severity: 'high',
          timestamp: '2024-01-10T10:00:00.000Z',
        }),
        priority: 'high',
        metadata: {
          alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
          severity: 'high',
          templateId: 'template-123',
        },
      });
    });

    it('should not send alert when alerts are disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_ALERTS_ENABLED') return false;
        return defaultValue;
      });

      const newService = new SecurityAlertServiceV2(mockConfigService as any, mockModuleRef as any);
      await newService.onModuleInit();

      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');

      await newService.sendAlert(basePayload);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Security alerts are disabled or notification service not available',
      );
    });

    it('should handle template not found gracefully', async () => {
      mockTemplateService.getTemplate.mockRejectedValue(new Error('Template not found'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.sendAlert(basePayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Template suspicious_login not found, using default message',
      );
      expect(mockNotificationService.send).toHaveBeenCalled();
      expect(mockNotificationService.send.mock.calls[0][0].metadata.templateId).toBeUndefined();

      loggerSpy.mockRestore();
    });

    it('should handle send errors without throwing', async () => {
      mockNotificationService.send.mockRejectedValue(new Error('Send failed'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(service.sendAlert(basePayload)).resolves.not.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to send security alert: Send failed',
        expect.any(String),
      );
    });

    it('should send to multiple channels when configured', async () => {
      // Create fresh mocks for this test
      const multiChannelNotificationService = {
        send: jest.fn().mockResolvedValue(undefined),
      };

      const multiChannelTemplateService = {
        getTemplate: jest.fn().mockResolvedValue({
          id: 'template-123',
          name: 'suspicious_login',
        }),
      };

      const multiChannelConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            SECURITY_ALERTS_ENABLED: true,
            EMAIL_ENABLED: true,
            WEBHOOK_ENABLED: true,
            SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
          };
          return config[key] !== undefined ? config[key] : defaultValue;
        }),
      };

      const multiChannelModuleRef = {
        get: jest.fn().mockImplementation((token) => {
          if (token === NotificationService) return multiChannelNotificationService;
          if (token === NotificationTemplateService) return multiChannelTemplateService;
          return null;
        }),
      };

      const newService = new SecurityAlertServiceV2(
        multiChannelConfigService as any,
        multiChannelModuleRef as any,
      );
      await newService.onModuleInit();

      await newService.sendAlert(basePayload);

      expect(multiChannelNotificationService.send).toHaveBeenCalledTimes(2);
      expect(multiChannelNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'email' }),
      );
      expect(multiChannelNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'webhook' }),
      );
    });

    it('should map severity to priority correctly', async () => {
      const severityTests = [
        { severity: 'low', expectedPriority: 'low' },
        { severity: 'medium', expectedPriority: 'medium' },
        { severity: 'high', expectedPriority: 'high' },
        { severity: 'critical', expectedPriority: 'critical' },
      ];

      for (const test of severityTests) {
        mockNotificationService.send.mockClear();
        const payload: SecurityAlertPayload = {
          ...basePayload,
          severity: test.severity as any,
        };

        await service.sendAlert(payload);

        expect(mockNotificationService.send).toHaveBeenCalledWith(
          expect.objectContaining({ priority: test.expectedPriority }),
        );
      }
    });
  });

  describe('sendAccountLockedAlert', () => {
    it('should send account locked alert with correct payload', async () => {
      const email = 'locked@example.com';
      const userId = 'user-456';
      const lockedUntil = new Date('2024-01-10T11:00:00Z');
      const failedAttempts = 5;
      const ipAddress = '192.168.1.10';

      await service.sendAccountLockedAlert(email, userId, lockedUntil, failedAttempts, ipAddress);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          subject: 'Konto gesperrt - Sicherheitswarnung',
          recipient: expect.objectContaining({
            email,
            userId,
          }),
          data: expect.objectContaining({
            email,
            userId,
            ipAddress,
            lockedUntil: '10.1.2024, 12:00:00',
            failedAttempts,
            alertType: SecurityAlertType.ACCOUNT_LOCKED,
            severity: 'high',
          }),
        }),
      );
    });

    it('should handle null userId', async () => {
      await service.sendAccountLockedAlert('test@example.com', null, new Date(), 3, '192.168.1.1');

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: expect.objectContaining({
            email: 'test@example.com',
            userId: null,
          }),
        }),
      );
    });

    it('should work without IP address', async () => {
      await service.sendAccountLockedAlert('test@example.com', 'user-123', new Date(), 3);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: undefined,
          }),
        }),
      );
    });
  });

  describe('sendSuspiciousLoginAlert', () => {
    it('should send suspicious login alert with critical severity for high risk score', async () => {
      await service.sendSuspiciousLoginAlert(
        'suspicious@example.com',
        'user-789',
        '192.168.1.100',
        'Suspicious Bot/1.0',
        90,
        'Multiple geo-location changes detected',
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          subject: 'Verdächtiger Anmeldeversuch erkannt',
          priority: 'critical',
          data: expect.objectContaining({
            email: 'suspicious@example.com',
            userId: 'user-789',
            ipAddress: '192.168.1.100',
            userAgent: 'Suspicious Bot/1.0',
            riskScore: 90,
            message: expect.stringContaining('risk score 90'),
            alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
            severity: 'critical',
          }),
        }),
      );
    });

    it('should send with high severity for risk score below 80', async () => {
      await service.sendSuspiciousLoginAlert(
        'test@example.com',
        null,
        '192.168.1.1',
        'Mozilla/5.0',
        75,
        'Unusual login pattern',
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
          data: expect.objectContaining({
            severity: 'high',
            riskScore: 75,
          }),
        }),
      );
    });
  });

  describe('sendBruteForceAlert', () => {
    it('should send brute force alert with correct payload', async () => {
      await service.sendBruteForceAlert('192.168.1.50', 100, 15);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          subject: 'KRITISCH: Brute-Force-Angriff erkannt',
          priority: 'critical',
          data: expect.objectContaining({
            ipAddress: '192.168.1.50',
            message: expect.stringContaining('100 attempts in 15 minutes'),
            alertType: SecurityAlertType.BRUTE_FORCE_ATTEMPT,
            severity: 'critical',
            attemptCount: 100,
            timeWindowMinutes: 15,
          }),
        }),
      );
    });
  });

  describe('sendMultipleFailedAttemptsAlert', () => {
    it('should send alert with high severity when 1 or fewer attempts remaining', async () => {
      await service.sendMultipleFailedAttemptsAlert(
        'test@example.com',
        'user-123',
        4,
        1,
        '192.168.1.1',
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          subject: 'Mehrere fehlgeschlagene Anmeldeversuche',
          priority: 'high',
          data: expect.objectContaining({
            email: 'test@example.com',
            userId: 'user-123',
            ipAddress: '192.168.1.1',
            failedAttempts: 4,
            message: expect.stringContaining('4 failed attempts, 1 attempts remaining'),
            alertType: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
            severity: 'high',
            remainingAttempts: 1,
          }),
        }),
      );
    });

    it('should send alert with medium severity when more than 1 attempt remaining', async () => {
      await service.sendMultipleFailedAttemptsAlert('test@example.com', null, 2, 3);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium',
          data: expect.objectContaining({
            severity: 'medium',
            remainingAttempts: 3,
          }),
        }),
      );
    });
  });

  describe('template handling', () => {
    it('should use correct template names for each alert type', async () => {
      const alertTypes = [
        { type: SecurityAlertType.ACCOUNT_LOCKED, templateName: 'account_locked' },
        { type: SecurityAlertType.SUSPICIOUS_LOGIN, templateName: 'suspicious_login' },
        { type: SecurityAlertType.BRUTE_FORCE_ATTEMPT, templateName: 'brute_force_detected' },
        {
          type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
          templateName: 'multiple_failed_attempts',
        },
      ];

      for (const { type, templateName } of alertTypes) {
        mockTemplateService.getTemplate.mockClear();

        const payload: SecurityAlertPayload = {
          type,
          severity: 'medium',
          timestamp: new Date(),
          details: { message: 'Test' },
        };

        await service.sendAlert(payload);

        expect(mockTemplateService.getTemplate).toHaveBeenCalledWith(undefined, templateName, 'de');
      }
    });

    it('should use correct subjects for each alert type', async () => {
      const alertTypes = [
        { type: SecurityAlertType.ACCOUNT_LOCKED, subject: 'Konto gesperrt - Sicherheitswarnung' },
        {
          type: SecurityAlertType.SUSPICIOUS_LOGIN,
          subject: 'Verdächtiger Anmeldeversuch erkannt',
        },
        {
          type: SecurityAlertType.BRUTE_FORCE_ATTEMPT,
          subject: 'KRITISCH: Brute-Force-Angriff erkannt',
        },
        {
          type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
          subject: 'Mehrere fehlgeschlagene Anmeldeversuche',
        },
      ];

      for (const { type, subject } of alertTypes) {
        mockNotificationService.send.mockClear();

        const payload: SecurityAlertPayload = {
          type,
          severity: 'medium',
          timestamp: new Date(),
          details: { message: 'Test' },
        };

        await service.sendAlert(payload);

        expect(mockNotificationService.send).toHaveBeenCalledWith(
          expect.objectContaining({ subject }),
        );
      }
    });
  });

  describe('edge cases', () => {
    it('should handle missing template service', async () => {
      mockModuleRef.get.mockImplementation((token) => {
        if (token === NotificationService) return mockNotificationService;
        if (token === NotificationTemplateService) return null;
        return null;
      });

      const newService = new SecurityAlertServiceV2(mockConfigService as any, mockModuleRef as any);
      await newService.onModuleInit();

      await newService.sendAlert({
        type: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: 'high',
        timestamp: new Date(),
        details: { message: 'Test' },
      });

      expect(mockNotificationService.send).toHaveBeenCalled();
      expect(mockNotificationService.send.mock.calls[0][0].metadata.templateId).toBeUndefined();
    });

    it('should handle additional info in payload', async () => {
      const payload: SecurityAlertPayload = {
        type: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: 'high',
        timestamp: new Date(),
        details: {
          message: 'Test',
          additionalInfo: {
            country: 'DE',
            city: 'Berlin',
            customField: 'customValue',
          },
        },
      };

      await service.sendAlert(payload);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'DE',
            city: 'Berlin',
            customField: 'customValue',
          }),
        }),
      );
    });

    it('should handle unknown severity gracefully', async () => {
      const payload: SecurityAlertPayload = {
        type: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: 'unknown' as any,
        timestamp: new Date(),
        details: { message: 'Test' },
      };

      await service.sendAlert(payload);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'medium' }), // Default priority
      );
    });
  });
});
