import { Controller, Get, UseGuards, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, RolesGuard } from '../../modules/auth/guards';
import { Roles } from '../../modules/auth/decorators';
import { UserRole } from '../../modules/auth/types/jwt.types';
import { SecurityMetricsService } from '../metrics/security-metrics.service';

/**
 * Controller für Security Logging Metriken.
 * Bietet Prometheus-kompatible Metriken für Monitoring.
 */
@ApiTags('Security Metrics')
@Controller('api/metrics')
export class SecurityMetricsController {
  constructor(private readonly metricsService: SecurityMetricsService) {}

  /**
   * Prometheus-kompatible Metriken für Security Logs.
   * Öffentlich zugänglich für Prometheus-Scraping.
   */
  @Get('security-logs')
  @ApiExcludeEndpoint() // Exclude from Swagger as it's for Prometheus
  async getPrometheusMetrics(@Res() res: Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    const metrics = await this.metricsService.getMetrics();
    res.send(metrics);
  }

  /**
   * Erweiterte Metriken mit zusätzlichen Statistiken für Admins.
   */
  @Get('security-logs/extended')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get extended security metrics',
    description: 'Retrieve detailed metrics including database and queue statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Extended metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        prometheus: { type: 'string', description: 'Prometheus formatted metrics' },
        database: {
          type: 'object',
          properties: {
            totalLogs: { type: 'number' },
            last24h: { type: 'number' },
            last7d: { type: 'number' },
            topEventTypes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  eventType: { type: 'string' },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
        queue: {
          type: 'object',
          properties: {
            jobs: {
              type: 'object',
              properties: {
                waiting: { type: 'number' },
                active: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' },
                delayed: { type: 'number' },
              },
            },
            workerCount: { type: 'number' },
            isPaused: { type: 'boolean' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getExtendedMetrics() {
    return this.metricsService.getExtendedMetrics();
  }
}
