import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotificationQueue } from './notification.queue';
import { NOTIFICATION_QUEUE } from '../constants/notification.constants';
import { NotificationPayload } from '../interfaces/notification-payload.interface';

describe('NotificationQueue', () => {
  let notificationQueue: NotificationQueue;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      clean: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueue,
        {
          provide: getQueueToken(NOTIFICATION_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    notificationQueue = module.get<NotificationQueue>(NotificationQueue);
  });

  it('should be defined', () => {
    expect(notificationQueue).toBeDefined();
  });

  describe('add', () => {
    it('should add notification to queue with correct options', async () => {
      const payload: NotificationPayload = {
        channel: 'email',
        recipient: { email: 'test@example.com' },
        subject: 'Test',
        templates: { html: '<p>Test</p>', text: 'Test' },
        data: { message: 'test' },
      };

      const expectedResult = { id: '123', data: payload };
      mockQueue.add.mockResolvedValue(expectedResult);

      const result = await notificationQueue.add(payload);

      expect(mockQueue.add).toHaveBeenCalledWith(payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should handle different payload types', async () => {
      const webhookPayload: NotificationPayload = {
        channel: 'webhook',
        recipient: { webhookUrl: 'https://example.com/webhook' },
        subject: 'Webhook Event',
        data: { event: 'test', timestamp: Date.now() },
        priority: 'HIGH',
        metadata: { source: 'api' },
      };

      const expectedResult = { id: '456', data: webhookPayload };
      mockQueue.add.mockResolvedValue(expectedResult);

      const result = await notificationQueue.add(webhookPayload);

      expect(mockQueue.add).toHaveBeenCalledWith(webhookPayload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);

      const stats = await notificationQueue.getStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      });
      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
    });

    it('should handle zero stats', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);

      const stats = await notificationQueue.getStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('clean', () => {
    it('should clean completed jobs with default grace period', async () => {
      await notificationQueue.clean();

      expect(mockQueue.clean).toHaveBeenCalledWith(3600000, 'completed');
    });

    it('should clean completed jobs with custom grace period', async () => {
      const grace = 7200000;
      await notificationQueue.clean(grace);

      expect(mockQueue.clean).toHaveBeenCalledWith(grace, 'completed');
    });

    it('should handle zero grace period', async () => {
      await notificationQueue.clean(0);

      expect(mockQueue.clean).toHaveBeenCalledWith(0, 'completed');
    });
  });

  describe('pause', () => {
    it('should pause the queue', async () => {
      await notificationQueue.pause();

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should handle multiple pause calls', async () => {
      await notificationQueue.pause();
      await notificationQueue.pause();

      expect(mockQueue.pause).toHaveBeenCalledTimes(2);
    });
  });

  describe('resume', () => {
    it('should resume the queue', async () => {
      await notificationQueue.resume();

      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should handle multiple resume calls', async () => {
      await notificationQueue.resume();
      await notificationQueue.resume();

      expect(mockQueue.resume).toHaveBeenCalledTimes(2);
    });
  });
});
