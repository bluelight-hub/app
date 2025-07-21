import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { NotificationProcessor } from './notification.processor';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
// import { NotificationStatus } from '../enums/notification.enums';
const NotificationStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let notificationService: NotificationService;
  let prismaService: PrismaService;

  const mockJob: Partial<Job<NotificationPayload>> = {
    id: '123',
    data: {
      channel: 'email',
      recipient: { email: 'test@example.com' },
      subject: 'Test Subject',
      data: { message: 'Test message' },
      metadata: { notificationId: 'notification-123' },
    },
    attemptsMade: 0,
    opts: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: NotificationService,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            notificationLog: {
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    notificationService = module.get<NotificationService>(NotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should process notification successfully', async () => {
      (notificationService.send as jest.Mock).mockResolvedValue(undefined);
      (prismaService.notificationLog.update as jest.Mock).mockResolvedValue({});

      await processor.process(mockJob as Job<NotificationPayload>);

      expect(notificationService.send).toHaveBeenCalledWith(mockJob.data);
      expect(prismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
        data: {
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
          attempts: 1,
        },
      });
    });

    it('should handle notification without metadata', async () => {
      const jobWithoutMetadata = {
        ...mockJob,
        data: {
          ...mockJob.data,
          metadata: undefined,
        },
      };

      (notificationService.send as jest.Mock).mockResolvedValue(undefined);

      await processor.process(jobWithoutMetadata as Job<NotificationPayload>);

      expect(notificationService.send).toHaveBeenCalledWith(jobWithoutMetadata.data);
      expect(prismaService.notificationLog.update).not.toHaveBeenCalled();
    });

    it('should update status on error', async () => {
      const error = new Error('Send failed');
      (notificationService.send as jest.Mock).mockRejectedValue(error);
      (prismaService.notificationLog.update as jest.Mock).mockResolvedValue({});

      await expect(processor.process(mockJob as Job<NotificationPayload>)).rejects.toThrow(
        'Send failed',
      );

      expect(prismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
        data: {
          status: NotificationStatus.FAILED,
          attempts: 1,
          error: 'Send failed',
        },
      });
    });

    it('should mark as failed on final attempt', async () => {
      const failedJob = {
        ...mockJob,
        attemptsMade: 2, // This will be the 3rd attempt
      };

      const error = new Error('Final failure');
      (notificationService.send as jest.Mock).mockRejectedValue(error);
      (prismaService.notificationLog.update as jest.Mock).mockResolvedValue({});

      await expect(processor.process(failedJob as Job<NotificationPayload>)).rejects.toThrow(
        'Final failure',
      );

      expect(prismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
        data: {
          status: NotificationStatus.FAILED,
          attempts: 3,
          error: 'Final failure',
        },
      });
    });
  });

  describe('onCompleted', () => {
    it('should log successful completion', () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      processor.onCompleted(mockJob as Job<NotificationPayload>);

      expect(loggerSpy).toHaveBeenCalledWith('Notification job 123 completed successfully');

      loggerSpy.mockRestore();
    });
  });

  describe('onFailed', () => {
    it('should log failure with error', () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();
      const error = new Error('Processing failed');

      processor.onFailed(mockJob as Job<NotificationPayload>, error);

      expect(loggerSpy).toHaveBeenCalledWith('Notification job 123 failed: Processing failed');

      loggerSpy.mockRestore();
    });

    it('should update database on final failure', async () => {
      const failedJob = {
        ...mockJob,
        attemptsMade: 3,
        opts: {
          attempts: 3,
        },
      };
      const error = new Error('Final failure');

      (prismaService.notificationLog.update as jest.Mock).mockResolvedValue({});

      await processor.onFailed(failedJob as Job<NotificationPayload>, error);

      expect(prismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
        data: {
          status: NotificationStatus.FAILED,
          error: 'Final failure after 3 attempts',
        },
      });
    });

    it('should handle notification without metadata on failure', async () => {
      const jobWithoutMetadata = {
        ...mockJob,
        data: {
          ...mockJob.data,
          metadata: undefined,
        },
        attemptsMade: 3,
        opts: {
          attempts: 3,
        },
      };
      const error = new Error('Final failure');

      await processor.onFailed(jobWithoutMetadata as Job<NotificationPayload>, error);

      expect(prismaService.notificationLog.update).not.toHaveBeenCalled();
    });

    it('should handle database update errors gracefully', async () => {
      const failedJob = {
        ...mockJob,
        attemptsMade: 3,
        opts: {
          attempts: 3,
        },
      };
      const error = new Error('Processing error');

      (prismaService.notificationLog.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      const loggerSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      await processor.onFailed(failedJob as Job<NotificationPayload>, error);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update notification log',
        expect.any(Error),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('onActive', () => {
    it('should log when job becomes active', () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      processor.onActive(mockJob as Job<NotificationPayload>);

      expect(loggerSpy).toHaveBeenCalledWith('Processing notification job 123 to test@example.com');

      loggerSpy.mockRestore();
    });
  });

  describe('onStalled', () => {
    it('should log when job is stalled', () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'warn').mockImplementation();

      processor.onStalled(mockJob as Job<NotificationPayload>);

      expect(loggerSpy).toHaveBeenCalledWith('Notification job 123 stalled');

      loggerSpy.mockRestore();
    });
  });
});
