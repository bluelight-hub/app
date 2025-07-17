import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailChannel } from './email.channel';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { ChannelHealthStatus } from '../interfaces/notification-channel.interface';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let configService: ConfigService;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, any> = {
                EMAIL_ENABLED: true,
                EMAIL_HOST: 'smtp.example.com',
                EMAIL_PORT: 587,
                EMAIL_SECURE: false,
                EMAIL_USER: 'test@example.com',
                EMAIL_PASS: 'password',
                EMAIL_FROM: 'noreply@example.com',
                EMAIL_FROM_NAME: 'Bluelight Hub',
                EMAIL_MAX_RETRIES: 3,
                EMAIL_BASE_DELAY: 1000,
                EMAIL_MAX_DELAY: 30000,
                EMAIL_TIMEOUT: 5000,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    channel = module.get<EmailChannel>(EmailChannel);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the retryUtil to execute immediately without retries for most tests
    (channel as any).retryUtil = {
      executeWithRetry: jest.fn().mockImplementation(async (fn: () => Promise<any>) => {
        return fn();
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const payload: NotificationPayload = {
        channel: 'email',
        recipient: { email: 'user@example.com' },
        subject: 'Test Subject',
        data: {
          name: 'Test User',
          message: 'Test message',
        },
      };

      await channel.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'Bluelight Hub',
          address: 'noreply@example.com',
        },
        to: 'user@example.com',
        subject: 'Test Subject',
        text: expect.stringContaining('Test Subject'),
        html: expect.stringContaining('Test Subject'),
      });
    });

    it('should use templates when provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const payload: NotificationPayload = {
        channel: 'email',
        recipient: { email: 'user@example.com' },
        subject: 'Test Subject',
        templates: {
          html: '<h1>{{title}}</h1><p>{{message}}</p>',
          text: '{{title}}\n{{message}}',
        },
        data: {
          title: 'Welcome',
          message: 'Hello world',
        },
      };

      await channel.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'Bluelight Hub',
          address: 'noreply@example.com',
        },
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Welcome\nHello world',
        html: '<h1>Welcome</h1><p>Hello world</p>',
      });
    });

    it('should retry on failure', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue({ messageId: '123' });

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
        channel: 'email',
        recipient: { email: 'user@example.com' },
        subject: 'Test Subject',
        data: {},
      };

      await channel.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Connection failed'));

      // Mock retry behavior with max retries
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
        channel: 'email',
        recipient: { email: 'user@example.com' },
        subject: 'Test Subject',
        data: {},
      };

      await expect(channel.send(payload)).rejects.toThrow('Connection failed');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not send when disabled', async () => {
      // Create a new channel instance with disabled config
      const disabledConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'EMAIL_ENABLED') return false;
          return null;
        }),
      };

      const disabledChannel = new EmailChannel(disabledConfigService as any);

      const payload: NotificationPayload = {
        channel: 'email',
        recipient: { email: 'user@example.com' },
        subject: 'Test Subject',
        data: {},
      };

      await disabledChannel.send(payload);

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('validateConfig', () => {
    it('should validate config successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await channel.validateConfig();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when transporter not configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'EMAIL_HOST') return null;
        return null;
      });

      const newChannel = new EmailChannel(configService);
      const result = await newChannel.validateConfig();

      expect(result).toBe(false);
    });

    it('should return false when verification fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Auth failed'));

      const result = await channel.validateConfig();

      expect(result).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const status = await channel.getHealthStatus();

      expect(status).toEqual({
        status: ChannelHealthStatus.HEALTHY,
        lastChecked: expect.any(Date),
        details: {
          transporterConfigured: true,
          verificationPassed: true,
        },
      });
    });

    it('should return unhealthy status when transporter not configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'EMAIL_HOST') return null;
        return null;
      });

      const newChannel = new EmailChannel(configService);
      const status = await newChannel.getHealthStatus();

      expect(status).toEqual({
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: expect.any(Date),
        error: 'Email transporter not configured',
        details: {
          transporterConfigured: false,
        },
      });
    });

    it('should return unhealthy status when verification fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('SMTP connection failed'));

      const status = await channel.getHealthStatus();

      expect(status).toEqual({
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: expect.any(Date),
        error: 'SMTP connection failed',
        details: {
          transporterConfigured: true,
          verificationPassed: false,
        },
      });
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(channel.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'EMAIL_ENABLED') return false;
        return null;
      });

      const newChannel = new EmailChannel(configService);
      expect(newChannel.isEnabled()).toBe(false);
    });
  });
});
