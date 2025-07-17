export const NOTIFICATION_QUEUE = 'notification-queue';

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
} as const;

export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  timeout: 30000,
};

export const DEFAULT_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export const NOTIFICATION_EVENTS = {
  SENT: 'notification.sent',
  FAILED: 'notification.failed',
  RETRY: 'notification.retry',
  CHANNEL_HEALTHY: 'notification.channel.healthy',
  CHANNEL_UNHEALTHY: 'notification.channel.unhealthy',
} as const;
