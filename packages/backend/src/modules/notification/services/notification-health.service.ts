import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmailChannel } from '../channels/email.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import {
  NotificationChannel,
  ChannelHealthInfo,
  ChannelHealthStatus,
} from '../interfaces/notification-channel.interface';

@Injectable()
export class NotificationHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationHealthService.name);
  private readonly channels: Map<string, NotificationChannel> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly webhookChannel: WebhookChannel,
  ) {
    this.channels.set(this.emailChannel.name, this.emailChannel);
    this.channels.set(this.webhookChannel.name, this.webhookChannel);
  }

  onModuleInit() {
    // Start scheduled health checks every 5 minutes
    this.healthCheckInterval = setInterval(
      () => {
        this.performScheduledHealthCheck();
      },
      5 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Check health of all notification channels
   */
  async checkHealth(): Promise<Record<string, ChannelHealthInfo>> {
    const healthStatus: Record<string, ChannelHealthInfo> = {};

    for (const [name, channel] of this.channels) {
      if (!channel.isEnabled()) {
        continue;
      }

      try {
        healthStatus[name] = await channel.getHealthStatus();
      } catch (error) {
        this.logger.error(`Failed to check health for channel ${name}`, error);
        healthStatus[name] = {
          status: ChannelHealthStatus.UNHEALTHY,
          lastChecked: new Date(),
          error: error.message,
        };
      }
    }

    return healthStatus;
  }

  /**
   * Get overall health summary
   */
  async getHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    channels: Record<string, ChannelHealthInfo>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  }> {
    const channels = await this.checkHealth();

    const summary = {
      total: Object.keys(channels).length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
    };

    for (const health of Object.values(channels)) {
      switch (health.status) {
        case ChannelHealthStatus.HEALTHY:
          summary.healthy++;
          break;
        case ChannelHealthStatus.DEGRADED:
          summary.degraded++;
          break;
        case ChannelHealthStatus.UNHEALTHY:
          summary.unhealthy++;
          break;
      }
    }

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      channels,
      summary,
    };
  }

  /**
   * Perform scheduled health check
   */
  private async performScheduledHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealthSummary();

      if (health.status !== 'healthy') {
        this.logger.warn(`Notification system health check: ${health.status}`, health.summary);
      } else {
        this.logger.debug('Notification system health check: all channels healthy');
      }
    } catch (error) {
      this.logger.error('Failed to perform scheduled health check', error);
    }
  }
}
