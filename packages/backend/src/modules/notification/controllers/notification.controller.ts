import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';
import { NotificationHealthService } from '../services/notification-health.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationPayload } from '../interfaces/notification-payload.interface';

/**
 * Controller für das Notification System
 * Stellt REST-Endpoints für Benachrichtigungen bereit
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly healthService: NotificationHealthService,
    private readonly templateService: NotificationTemplateService,
  ) {}

  /**
   * Sendet eine Benachrichtigung über das System
   */
  @Post('send')
  async send(@Body() payload: NotificationPayload) {
    return this.notificationService.send(payload);
  }

  /**
   * Gibt den Gesundheitsstatus aller Notification Channels zurück
   */
  @Get('health')
  async getHealth() {
    return this.healthService.getHealthSummary();
  }

  /**
   * Listet alle verfügbaren Notification Templates auf
   */
  @Get('templates')
  async getTemplates(@Query() query: any) {
    return this.templateService.listTemplates(query);
  }
}
