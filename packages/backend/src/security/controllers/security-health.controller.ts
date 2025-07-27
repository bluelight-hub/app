import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SecurityHealthService } from '../health/security-health.service';

/**
 * Health Check Controller für das Security Logging System.
 * Bietet Endpunkte zur Überwachung der Systemgesundheit.
 */
@ApiTags('Security Health')
@Controller('api/health')
export class SecurityHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly securityHealth: SecurityHealthService,
  ) {}

  /**
   * Umfassender Health Check für alle Security Logging Komponenten.
   */
  @Get('security-logs')
  @HealthCheck()
  @ApiOperation({
    summary: 'Security logging system health check',
    description: 'Performs comprehensive health checks on all security logging components',
  })
  @ApiResponse({
    status: 200,
    description: 'All components are healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            security_queue: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                waiting: { type: 'number' },
                active: { type: 'number' },
                delayed: { type: 'number' },
                failed: { type: 'number' },
              },
            },
            redis_aof: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                aofEnabled: { type: 'boolean' },
                aofLastWriteStatus: { type: 'string' },
              },
            },
            chain_integrity: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                isValid: { type: 'boolean' },
                checkDurationMs: { type: 'number' },
              },
            },
            disk_space: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                freeSpaceGB: { type: 'number' },
                usedPercent: { type: 'number' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more components are unhealthy',
  })
  async checkSecurityLogsHealth() {
    return this.health.check([
      () => this.securityHealth.checkQueueHealth(),
      () => this.securityHealth.checkRedisHealth(),
      () => this.securityHealth.checkChainIntegrity(),
      () => this.securityHealth.checkDiskSpace(),
    ]);
  }

  /**
   * Schneller Queue-Health-Check für Load Balancer.
   */
  @Get('security-logs/queue')
  @ApiOperation({
    summary: 'Queue health check',
    description: 'Quick health check for the security log queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue is healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'Queue is unhealthy',
  })
  async checkQueueHealth() {
    return this.securityHealth.checkQueueHealth();
  }

  /**
   * Chain-Integritäts-Check.
   */
  @Get('security-logs/chain')
  @ApiOperation({
    summary: 'Chain integrity check',
    description: 'Verifies the integrity of the security log hash chain',
  })
  @ApiResponse({
    status: 200,
    description: 'Chain integrity is valid',
  })
  @ApiResponse({
    status: 503,
    description: 'Chain integrity is compromised',
  })
  async checkChainHealth() {
    return this.securityHealth.checkChainIntegrity();
  }
}
