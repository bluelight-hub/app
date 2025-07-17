import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import {
  NotificationChannel,
  ChannelHealthInfo,
  ChannelHealthStatus,
} from '../interfaces/notification-channel.interface';
import { NotificationPayload } from '../interfaces/notification-payload.interface';
import { RetryUtil, RetryConfig } from '../../../common/utils/retry.util';

@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly name = 'email';
  private readonly logger = new Logger(EmailChannel.name);
  private readonly enabled: boolean;
  private transporter: Transporter | null = null;
  private readonly retryUtil: RetryUtil;
  private readonly retryConfig: Partial<RetryConfig>;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('EMAIL_ENABLED', false);
    this.retryUtil = new RetryUtil();

    this.retryConfig = {
      maxRetries: this.configService.get<number>('EMAIL_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('EMAIL_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('EMAIL_MAX_DELAY', 30000),
      timeout: this.configService.get<number>('EMAIL_TIMEOUT', 5000),
    };

    if (this.enabled) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const secure = this.configService.get<boolean>('EMAIL_SECURE', false);
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');

    if (!host || !port) {
      this.logger.warn('Email configuration incomplete, email channel disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug('Email channel is disabled or not configured');
      return;
    }

    const { recipient, subject, templates, data } = payload;

    let html: string;
    let text: string;

    if (templates?.html || templates?.text) {
      const htmlTemplate = Handlebars.compile(templates.html || '');
      const textTemplate = Handlebars.compile(templates.text || '');
      html = htmlTemplate(data);
      text = textTemplate(data);
    } else {
      // Default templates
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${subject}</h2>
          <div>${JSON.stringify(data, null, 2).replace(/\n/g, '<br>')}</div>
        </div>
      `;
      text = `${subject}\n\n${JSON.stringify(data, null, 2)}`;
    }

    const fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Bluelight Hub');
    const fromAddress = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

    await this.retryUtil.executeWithRetry(
      async () => {
        await this.transporter!.sendMail({
          from: {
            name: fromName,
            address: fromAddress,
          },
          to: recipient.email,
          subject,
          html,
          text,
        });
      },
      this.retryConfig,
      `EmailSend-${recipient.email}`,
    );

    this.logger.log(`Email sent to ${recipient.email}`);
  }

  async validateConfig(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email configuration validation failed', error);
      return false;
    }
  }

  async getHealthStatus(): Promise<ChannelHealthInfo> {
    if (!this.transporter) {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: 'Email transporter not configured',
        details: {
          transporterConfigured: false,
        },
      };
    }

    try {
      await this.transporter.verify();
      return {
        status: ChannelHealthStatus.HEALTHY,
        lastChecked: new Date(),
        details: {
          transporterConfigured: true,
          verificationPassed: true,
        },
      };
    } catch (error) {
      return {
        status: ChannelHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        error: error.message,
        details: {
          transporterConfigured: true,
          verificationPassed: false,
        },
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
