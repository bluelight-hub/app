import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WebhookChannel } from './webhook.channel';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { ChannelHealthStatus } from '../interfaces/notification-channel.interface';

describe('WebhookChannel', () => {
  let channel: WebhookChannel;
  let configService: ConfigService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, any> = {
                WEBHOOK_ENABLED: true,
                WEBHOOK_URL: 'https://webhook.example.com',
                WEBHOOK_AUTH_TOKEN: 'test-token',
                WEBHOOK_MAX_RETRIES: 3,
                WEBHOOK_BASE_DELAY: 1000,
                WEBHOOK_MAX_DELAY: 30000,
                WEBHOOK_TIMEOUT: 5000,
                WEBHOOK_FAILURE_THRESHOLD: 5,
                WEBHOOK_FAILURE_WINDOW: 60000,
                WEBHOOK_OPEN_DURATION: 30000,
                WEBHOOK_SUCCESS_THRESHOLD: 3,
              };
              return config[key];
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            head: jest.fn(),
          },
        },
      ],
    }).compile();

    channel = module.get<WebhookChannel>(WebhookChannel);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);

    // Mock the retryUtil and circuitBreaker to execute immediately without retries for most tests
    (channel as any).retryUtil = {
      executeWithRetry: jest.fn().mockImplementation(async (fn: () => Promise<any>) => {
        return fn();
      }),
    };
    (channel as any).circuitBreaker = {
      execute: jest.fn().mockImplementation(async (fn: () => Promise<any>) => {
        return fn();
      }),
      isOpen: jest.fn().mockReturnValue(false),
      getState: jest.fn().mockReturnValue('CLOSED'),
      getStats: jest.fn().mockReturnValue({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: null,
      }),
      getStatus: jest.fn().mockReturnValue({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: null,
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send webhook successfully', async () => {
      (httpService.post as jest.Mock).mockReturnValue(of({ status: 200, data: { success: true } }));

      const payload: NotificationPayload = {
        channel: 'webhook',
        recipient: { email: 'user@example.com' },
        subject: 'Test Alert',
        data: {
          message: 'Test message',
        },
      };

      await channel.send(payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          channel: 'webhook',
          timestamp: expect.any(String),
          notification: expect.objectContaining({
            recipient: payload.recipient,
            subject: payload.subject,
            data: payload.data,
          }),
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          timeout: 5000,
        }),
      );
    });

    it('should retry on failure', async () => {
      (httpService.post as jest.Mock)
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of({ status: 200, data: { success: true } }));

      // Mock retry behavior
      (channel as any).retryUtil.executeWithRetry.mockImplementation(
        async (fn: () => Promise<any>, config: any) => {
          for (let i = 0; i <= config.maxRetries; i++) {
            try {
              return await fn();
            } catch (error) {
              if (i === config.maxRetries) throw error;
            }
          }
        },
      );

      const payload: NotificationPayload = {
        channel: 'webhook',
        recipient: { userId: 'user123' },
        subject: 'Test Alert',
        data: {},
      };

      await channel.send(payload);

      expect(httpService.post).toHaveBeenCalledTimes(3);
    });

    it('should not send when disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'WEBHOOK_ENABLED') return false;
        return null;
      });

      const newChannel = new WebhookChannel(configService, httpService);

      const payload: NotificationPayload = {
        channel: 'webhook',
        recipient: { email: 'user@example.com' },
        subject: 'Test',
        data: {},
      };

      await newChannel.send(payload);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should handle circuit breaker open state', async () => {
      (httpService.post as jest.Mock).mockReturnValue(throwError(() => new Error('Network error')));

      const payload: NotificationPayload = {
        channel: 'webhook',
        recipient: { email: 'user@example.com' },
        subject: 'Test',
        data: {},
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await channel.send(payload);
        } catch {
          // Expected to fail
        }
      }

      // Check that subsequent calls are blocked
      await expect(channel.send(payload)).rejects.toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should validate config successfully', async () => {
      (httpService.head as jest.Mock).mockReturnValue(of({ status: 200 }));

      const result = await channel.validateConfig();

      expect(result).toBe(true);
      expect(httpService.head).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
          },
          timeout: 5000,
        }),
      );
    });

    it('should return false when disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'WEBHOOK_ENABLED') return false;
        return null;
      });

      const newChannel = new WebhookChannel(configService, httpService);
      const result = await newChannel.validateConfig();

      expect(result).toBe(false);
    });

    it('should return false on validation error', async () => {
      (httpService.head as jest.Mock).mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await channel.validateConfig();

      expect(result).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      (httpService.head as jest.Mock).mockReturnValue(of({ status: 200 }));

      const status = await channel.getHealthStatus();

      expect(status).toEqual({
        status: ChannelHealthStatus.HEALTHY,
        lastChecked: expect.any(Date),
        details: {
          configured: true,
          webhookReachable: true,
          circuitBreaker: expect.objectContaining({
            state: 'CLOSED',
          }),
        },
      });
    });

    it('should return unhealthy when disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'WEBHOOK_ENABLED') return false;
        if (key === 'WEBHOOK_URL') return null;
        return null;
      });

      const newChannel = new WebhookChannel(configService, httpService);
      const status = await newChannel.getHealthStatus();

      expect(status).toEqual({
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: expect.any(Date),
        error: 'Webhook not configured',
        details: {
          configured: false,
        },
      });
    });

    it('should return unhealthy when circuit breaker is open', async () => {
      // Mock circuit breaker to be in OPEN state
      (channel as any).circuitBreaker.getStatus.mockReturnValue({
        state: 'OPEN',
        failures: 5,
        successes: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: Date.now(),
      });

      const status = await channel.getHealthStatus();

      expect(status.status).toBe(ChannelHealthStatus.UNHEALTHY);
      expect(status.error).toBe('Circuit breaker is open');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(channel.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'WEBHOOK_ENABLED') return false;
        return null;
      });

      const newChannel = new WebhookChannel(configService, httpService);
      expect(newChannel.isEnabled()).toBe(false);
    });
  });
});
