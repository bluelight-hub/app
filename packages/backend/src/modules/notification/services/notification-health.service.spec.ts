import { Test, TestingModule } from '@nestjs/testing';
import { NotificationHealthService } from './notification-health.service';
import { EmailChannel } from '../channels/email.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import {
  ChannelHealthStatus,
  ChannelHealthInfo,
} from '../interfaces/notification-channel.interface';

describe('NotificationHealthService', () => {
  let service: NotificationHealthService;
  let emailChannel: EmailChannel;
  let webhookChannel: WebhookChannel;

  const mockHealthyStatus: ChannelHealthInfo = {
    status: ChannelHealthStatus.HEALTHY,
    lastChecked: new Date(),
    details: { test: 'healthy' },
  };

  const mockUnhealthyStatus: ChannelHealthInfo = {
    status: ChannelHealthStatus.UNHEALTHY,
    lastChecked: new Date(),
    error: 'Connection failed',
    details: { test: 'unhealthy' },
  };

  const mockDegradedStatus: ChannelHealthInfo = {
    status: ChannelHealthStatus.DEGRADED,
    lastChecked: new Date(),
    details: { test: 'degraded' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationHealthService,
        {
          provide: EmailChannel,
          useValue: {
            name: 'email',
            getHealthStatus: jest.fn(),
            isEnabled: jest.fn(),
          },
        },
        {
          provide: WebhookChannel,
          useValue: {
            name: 'webhook',
            getHealthStatus: jest.fn(),
            isEnabled: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationHealthService>(NotificationHealthService);
    emailChannel = module.get<EmailChannel>(EmailChannel);
    webhookChannel = module.get<WebhookChannel>(WebhookChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.onModuleDestroy();
  });

  describe('checkHealth', () => {
    it('should check health of all enabled channels', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);

      const result = await service.checkHealth();

      expect(result).toEqual({
        email: mockHealthyStatus,
        webhook: mockHealthyStatus,
      });
      expect(emailChannel.getHealthStatus).toHaveBeenCalled();
      expect(webhookChannel.getHealthStatus).toHaveBeenCalled();
    });

    it('should skip disabled channels', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(false);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);

      const result = await service.checkHealth();

      expect(result).toEqual({
        webhook: mockHealthyStatus,
      });
      expect(emailChannel.getHealthStatus).not.toHaveBeenCalled();
      expect(webhookChannel.getHealthStatus).toHaveBeenCalled();
    });

    it('should handle channel errors gracefully', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockRejectedValue(new Error('Check failed'));
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);

      const result = await service.checkHealth();

      expect(result).toEqual({
        email: {
          status: ChannelHealthStatus.UNHEALTHY,
          lastChecked: expect.any(Date),
          error: 'Check failed',
        },
        webhook: mockHealthyStatus,
      });
    });
  });

  describe('getHealthSummary', () => {
    it('should return healthy when all channels are healthy', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);

      const result = await service.getHealthSummary();

      expect(result).toEqual({
        status: 'healthy',
        channels: {
          email: mockHealthyStatus,
          webhook: mockHealthyStatus,
        },
        summary: {
          total: 2,
          healthy: 2,
          degraded: 0,
          unhealthy: 0,
        },
      });
    });

    it('should return degraded when some channels are degraded', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockDegradedStatus);

      const result = await service.getHealthSummary();

      expect(result).toEqual({
        status: 'degraded',
        channels: {
          email: mockHealthyStatus,
          webhook: mockDegradedStatus,
        },
        summary: {
          total: 2,
          healthy: 1,
          degraded: 1,
          unhealthy: 0,
        },
      });
    });

    it('should return unhealthy when some channels are unhealthy', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockUnhealthyStatus);

      const result = await service.getHealthSummary();

      expect(result).toEqual({
        status: 'unhealthy',
        channels: {
          email: mockHealthyStatus,
          webhook: mockUnhealthyStatus,
        },
        summary: {
          total: 2,
          healthy: 1,
          degraded: 0,
          unhealthy: 1,
        },
      });
    });

    it('should return unhealthy when all channels are unhealthy', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockUnhealthyStatus);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockUnhealthyStatus);

      const result = await service.getHealthSummary();

      expect(result).toEqual({
        status: 'unhealthy',
        channels: {
          email: mockUnhealthyStatus,
          webhook: mockUnhealthyStatus,
        },
        summary: {
          total: 2,
          healthy: 0,
          degraded: 0,
          unhealthy: 2,
        },
      });
    });
  });

  describe('scheduled health checks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform scheduled health checks', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);

      await service.onModuleInit();

      // Fast forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Wait for the scheduled check to complete
      await Promise.resolve();

      expect(emailChannel.getHealthStatus).toHaveBeenCalledTimes(1);
      expect(webhookChannel.getHealthStatus).toHaveBeenCalledTimes(1);
    });

    it('should continue scheduled checks even after errors', async () => {
      (emailChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (webhookChannel.isEnabled as jest.Mock).mockReturnValue(true);
      (emailChannel.getHealthStatus as jest.Mock).mockRejectedValue(new Error('Check failed'));
      (webhookChannel.getHealthStatus as jest.Mock).mockResolvedValue(mockHealthyStatus);

      await service.onModuleInit();

      // Fast forward 10 minutes (2 checks)
      jest.advanceTimersByTime(10 * 60 * 1000);

      // Wait for the scheduled checks to complete
      await Promise.resolve();

      expect(emailChannel.getHealthStatus).toHaveBeenCalledTimes(2);
      expect(webhookChannel.getHealthStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('lifecycle hooks', () => {
    it('should clean up interval on module destroy', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Initialize the module first to create the interval
      await service.onModuleInit();

      service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
