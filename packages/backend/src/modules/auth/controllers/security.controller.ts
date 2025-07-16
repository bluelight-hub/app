import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, IpAllowlistGuard } from '../guards';
import { Roles, CurrentUser } from '../decorators';
import { SecurityMetricsService } from '../services/security-metrics.service';
import { SecurityLogService } from '../services/security-log.service';
import { AuthService } from '../auth.service';
import { JWTPayload, UserRole } from '../types/jwt.types';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { parseDateRange, parseOptionalDate } from '../utils';

/**
 * Controller für Security-bezogene Endpunkte.
 * Bietet Zugriff auf Sicherheitsmetriken, Logs und Administrative Funktionen.
 */
@ApiTags('Security')
@Controller('api/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly securityMetricsService: SecurityMetricsService,
    private readonly securityLogService: SecurityLogService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Holt aggregierte Sicherheitsmetriken für das Dashboard
   */
  @Get('metrics/dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get security dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics() {
    return await this.securityMetricsService.getDashboardMetrics();
  }

  /**
   * Holt detaillierte Metriken für fehlgeschlagene Login-Versuche
   */
  @Get('metrics/failed-logins')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get failed login metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Failed login metrics retrieved successfully' })
  async getFailedLoginMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = parseDateRange(startDate, endDate);

    return await this.securityMetricsService.getFailedLoginMetrics({ start, end });
  }

  /**
   * Holt detaillierte Metriken für Account-Sperrungen
   */
  @Get('metrics/lockouts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get account lockout metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Account lockout metrics retrieved successfully' })
  async getAccountLockoutMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = parseDateRange(startDate, endDate);

    return await this.securityMetricsService.getAccountLockoutMetrics({ start, end });
  }

  /**
   * Holt detaillierte Metriken für verdächtige Aktivitäten
   */
  @Get('metrics/suspicious-activities')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get suspicious activity metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Suspicious activity metrics retrieved successfully' })
  async getSuspiciousActivityMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = parseDateRange(startDate, endDate);

    return await this.securityMetricsService.getSuspiciousActivityMetrics({ start, end });
  }

  /**
   * Holt Security Logs mit Filteroptionen
   */
  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get security logs' })
  @ApiQuery({ name: 'eventType', required: false, enum: SecurityEventType })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'ipAddress', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Security logs retrieved successfully' })
  async getSecurityLogs(
    @Query('eventType') eventType?: SecurityEventType,
    @Query('userId') userId?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.securityLogService.getSecurityLogs({
      eventType,
      userId,
      ipAddress,
      startDate: parseOptionalDate(startDate),
      endDate: parseOptionalDate(endDate),
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Entsperrt einen gesperrten Account (nur Super Admin)
   */
  @Post('unlock-account/:email')
  @UseGuards(IpAllowlistGuard) // Zusätzlicher Schutz für sensitive Operation
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a locked account' })
  @ApiResponse({ status: 200, description: 'Account unlocked successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unlockAccount(@Param('email') email: string, @CurrentUser() admin: JWTPayload) {
    // Zusätzliche Berechtigung: Admin kann sich nicht selbst entsperren
    const adminUser = await this.authService.getCurrentUser(admin.sub);
    if (adminUser.email === email) {
      throw new ForbiddenException('Cannot unlock your own account');
    }

    await this.authService.unlockAccount(email, admin.sub);

    return {
      message: 'Account unlocked successfully',
      email,
      unlockedBy: admin.email,
      timestamp: new Date(),
    };
  }
}
