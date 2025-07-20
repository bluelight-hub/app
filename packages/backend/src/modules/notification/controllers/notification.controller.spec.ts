import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from '../services/notification.service';
import { NotificationHealthService } from '../services/notification-health.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { ChannelType } from '../enums/channel-type.enum';
import { ChannelHealthInfo } from '@/modules/notification/interfaces/notification-channel.interface';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: jest.Mocked<NotificationService>;
  let healthService: jest.Mocked<NotificationHealthService>;
  let templateService: jest.Mocked<NotificationTemplateService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: NotificationHealthService,
          useValue: {
            getHealthSummary: jest.fn(),
          },
        },
        {
          provide: NotificationTemplateService,
          useValue: {
            listTemplates: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    notificationService = module.get(NotificationService);
    healthService = module.get(NotificationHealthService);
    templateService = module.get(NotificationTemplateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('send', () => {
    it('should call notificationService.send with payload', async () => {
      const payload: NotificationPayload = {
        channel: 'email',
        recipient: {
          email: 'test@example.com',
        },
        subject: 'Test Subject',
        templates: {
          html: '<h1>Test</h1>',
          text: 'Test',
        },
        data: { name: 'Test' },
      };

      notificationService.send.mockResolvedValue(undefined);

      await controller.send(payload);

      expect(notificationService.send).toHaveBeenCalledWith(payload);
    });
  });

  describe('getHealth', () => {
    it('should return health summary', async () => {
      const expectedHealth = {
        status: 'healthy',
        channels: {
          test: {
            details: 'details',
            status: 'HEALTHY',
            lastChecked: new Date(),
          } as unknown as ChannelHealthInfo,
        },
        summary: {
          total: 1,
          healthy: 1,
          degraded: 0,
          unhealthy: 0,
        },
      } as {
        status: 'healthy' | 'degraded' | 'unhealthy';
        channels: Record<string, ChannelHealthInfo>;
        summary: {
          total: number;
          healthy: number;
          degraded: number;
          unhealthy: number;
        };
      };

      healthService.getHealthSummary.mockResolvedValue(
        new Promise((resolve) => resolve(expectedHealth)),
      );

      const result = await controller.getHealth();

      expect(healthService.getHealthSummary).toHaveBeenCalled();
      expect(result).toEqual(expectedHealth);
    });
  });

  describe('getTemplates', () => {
    it('should list templates with query parameters', async () => {
      const query = { type: 'email', limit: 10 };
      const expectedTemplates = [
        {
          id: '1',
          name: 'welcome',
          channelType: ChannelType.EMAIL,
          subject: 'Welcome',
          bodyHtml: '<h1>Welcome</h1>',
          bodyText: 'Welcome',
          variables: {},
          language: 'de',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'reset-password',
          channelType: ChannelType.EMAIL,
          subject: 'Reset Password',
          bodyHtml: '<h1>Reset Password</h1>',
          bodyText: 'Reset Password',
          variables: {},
          language: 'de',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      templateService.listTemplates.mockResolvedValue(expectedTemplates);

      const result = await controller.getTemplates(query);

      expect(templateService.listTemplates).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedTemplates);
    });

    it('should list templates without query parameters', async () => {
      const expectedTemplates = [
        {
          id: '1',
          name: 'welcome',
          channelType: ChannelType.EMAIL,
          subject: 'Welcome',
          bodyHtml: '<h1>Welcome</h1>',
          bodyText: 'Welcome',
          variables: {},
          language: 'de',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'reset-password',
          channelType: ChannelType.EMAIL,
          subject: 'Reset Password',
          bodyHtml: '<h1>Reset Password</h1>',
          bodyText: 'Reset Password',
          variables: {},
          language: 'de',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      templateService.listTemplates.mockResolvedValue(expectedTemplates);

      const result = await controller.getTemplates({});

      expect(templateService.listTemplates).toHaveBeenCalledWith({});
      expect(result).toEqual(expectedTemplates);
    });
  });
});
