import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationQueue } from '../queues/notification.queue';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailChannel } from '../channels/email.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { NotificationPayload } from '../interfaces/notification-payload.interface';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailChannel: EmailChannel;
  let webhookChannel: WebhookChannel;
  let notificationQueue: NotificationQueue;
  let prismaService: PrismaService;
  let eventEmitter: EventEmitter2;
  let templateService: NotificationTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailChannel,
          useValue: {
            name: 'email',
            send: jest.fn(),
            isEnabled: jest.fn().mockReturnValue(true),
            validateConfig: jest.fn().mockResolvedValue(true),
            getHealthStatus: jest.fn().mockResolvedValue({ status: 'HEALTHY' }),
          },
        },
        {
          provide: WebhookChannel,
          useValue: {
            name: 'webhook',
            send: jest.fn(),
            isEnabled: jest.fn().mockReturnValue(true),
            validateConfig: jest.fn().mockResolvedValue(true),
            getHealthStatus: jest.fn().mockResolvedValue({ status: 'HEALTHY' }),
          },
        },
        {
          provide: NotificationQueue,
          useValue: {
            add: jest.fn().mockResolvedValue({ id: 'job-123' }),
          },
        },
        {
          provide: NotificationTemplateService,
          useValue: {
            renderTemplate: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            notificationLog: {
              create: jest.fn().mockResolvedValue({ id: 'log-123' }),
              update: jest.fn(),
            },
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

    service = module.get<NotificationService>(NotificationService);
    emailChannel = module.get<EmailChannel>(EmailChannel);
    webhookChannel = module.get<WebhookChannel>(WebhookChannel);
    notificationQueue = module.get<NotificationQueue>(NotificationQueue);
    prismaService = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    templateService = module.get<NotificationTemplateService>(NotificationTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    const payload: NotificationPayload = {
      channel: 'email',
      recipient: { email: 'test@example.com' },
      subject: 'Test Subject',
      data: { message: 'Test message' },
    };

    it('should send notification through specified channel', async () => {
      await service.send(payload);

      expect(emailChannel.send).toHaveBeenCalledWith(payload);
      expect(prismaService.notificationLog.create).toHaveBeenCalled();
      expect(prismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.sent', expect.any(Object));
    });

    it('should throw error for unknown channel', async () => {
      const unknownPayload = {
        ...payload,
        channel: 'unknown',
      };

      await expect(service.send(unknownPayload)).rejects.toThrow(
        'Unknown notification channel: unknown',
      );
    });

    it('should skip disabled channels', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(false);

      await service.send(payload);

      expect(emailChannel.send).not.toHaveBeenCalled();
      expect(prismaService.notificationLog.create).not.toHaveBeenCalled();
    });

    it('should handle send failures', async () => {
      const error = new Error('Send failed');
      (emailChannel.send as jest.Mock).mockRejectedValue(error);

      await expect(service.send(payload)).rejects.toThrow('Send failed');

      expect(prismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: {
          status: 'FAILED',
          error: 'Send failed',
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.failed', expect.any(Object));
    });
  });

  describe('queue', () => {
    const payload: NotificationPayload = {
      channel: 'webhook',
      recipient: { webhookUrl: 'https://example.com/hook' },
      subject: 'Test',
      data: {},
    };

    it('should queue notification for async processing', async () => {
      const id = await service.queue(payload);

      expect(id).toBe('log-123');
      expect(prismaService.notificationLog.create).toHaveBeenCalled();
      expect(notificationQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...payload,
          metadata: {
            notificationId: 'log-123',
          },
        }),
      );
    });
  });

  describe('sendWithTemplate', () => {
    it('should render template and send notification', async () => {
      (templateService.renderTemplate as jest.Mock).mockResolvedValue({
        subject: 'Rendered Subject',
        html: '<p>Rendered HTML</p>',
        text: 'Rendered text',
      });

      await service.sendWithTemplate(
        'email',
        { email: 'test@example.com' },
        'WELCOME',
        { name: 'John' },
        'en',
      );

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'WELCOME',
        { name: 'John' },
        'en',
      );
      expect(emailChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          recipient: { email: 'test@example.com' },
          subject: 'Rendered Subject',
          templates: {
            html: '<p>Rendered HTML</p>',
            text: 'Rendered text',
          },
        }),
      );
    });
  });

  describe('getChannels', () => {
    it('should return all channel names', () => {
      const channels = service.getChannels();
      expect(channels).toEqual(['email', 'webhook']);
    });
  });

  describe('getEnabledChannels', () => {
    it('should return only enabled channels', () => {
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(false);

      const channels = service.getEnabledChannels();
      expect(channels).toEqual(['email']);
    });
  });

  describe('validateChannel', () => {
    it('should validate existing channel', async () => {
      const result = await service.validateChannel('email');
      expect(result).toBe(true);
      expect(emailChannel.validateConfig).toHaveBeenCalled();
    });

    it('should return false for unknown channel', async () => {
      const result = await service.validateChannel('unknown');
      expect(result).toBe(false);
    });
  });

  describe('getChannelHealth', () => {
    it('should return health status for channel', async () => {
      const health = { status: 'HEALTHY', lastChecked: new Date() };
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(health);

      const result = await service.getChannelHealth('email');
      expect(result).toEqual(health);
    });

    it('should throw error for unknown channel', async () => {
      await expect(service.getChannelHealth('unknown')).rejects.toThrow('Unknown channel: unknown');
    });
  });
});
