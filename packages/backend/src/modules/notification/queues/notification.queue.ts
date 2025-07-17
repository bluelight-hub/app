import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { NOTIFICATION_QUEUE } from '../constants/notification.constants';

@Injectable()
export class NotificationQueue {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue<NotificationPayload>,
  ) {}

  /**
   * Add a notification to the queue
   */
  async add(payload: NotificationPayload) {
    return this.queue.add(payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * Clean completed jobs
   */
  async clean(grace: number = 3600000) {
    await this.queue.clean(grace, 'completed');
  }

  /**
   * Pause the queue
   */
  async pause() {
    await this.queue.pause();
  }

  /**
   * Resume the queue
   */
  async resume() {
    await this.queue.resume();
  }
}
