import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/types/jwt.types';
import {
  SessionDto,
  SessionActivityDto,
  CreateSessionActivityDto,
  SessionFilterDto,
  SessionStatisticsDto,
} from './dto/session.dto';

/**
 * Controller für die Verwaltung von Benutzersitzungen
 *
 * Dieser Controller bietet Endpunkte für:
 * - Anzeige und Filterung von Sessions
 * - Session-Statistiken und Analysen
 * - Tracking von Session-Aktivitäten
 * - Verwaltung und Revozierung von Sessions
 * - Heartbeat-Updates für Online-Status
 *
 * @class SessionController
 */
@ApiTags('sessions')
@Controller('admin/security/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Holt alle Sessions mit optionalen Filtern
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all sessions with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'List of sessions',
    type: [SessionDto],
  })
  async getSessions(@Query() filter: SessionFilterDto): Promise<SessionDto[]> {
    const sessions = await this.sessionService.getSessions(filter);
    return sessions.map(this.mapSessionToDto);
  }

  /**
   * Holt Session-Statistiken
   */
  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiResponse({
    status: 200,
    description: 'Session statistics',
    type: SessionStatisticsDto,
  })
  async getStatistics(@Query('userId') userId?: string): Promise<SessionStatisticsDto> {
    return this.sessionService.getSessionStatistics(userId);
  }

  /**
   * Holt eigene Sessions
   */
  @Get('my-sessions')
  @ApiOperation({ summary: 'Get current user sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of user sessions',
    type: [SessionDto],
  })
  async getMySessions(@Request() req: any): Promise<SessionDto[]> {
    const sessions = await this.sessionService.getSessions({ userId: req.user.userId });
    return sessions.map(this.mapSessionToDto);
  }

  /**
   * Holt Details einer spezifischen Session
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({
    status: 200,
    description: 'Session details with activities',
    type: SessionDto,
  })
  async getSessionDetails(
    @Param('id') id: string,
  ): Promise<SessionDto & { activities: SessionActivityDto[] }> {
    const session = await this.sessionService.getSessionDetails(id);
    return {
      ...this.mapSessionToDto(session),
      activities: session.activities.map(this.mapActivityToDto),
    };
  }

  /**
   * Trackt eine Session-Aktivität
   */
  @Post(':id/activity')
  @ApiOperation({ summary: 'Track session activity' })
  @ApiResponse({
    status: 201,
    description: 'Activity tracked successfully',
    type: SessionActivityDto,
  })
  async trackActivity(
    @Param('id') id: string,
    @Body() activity: CreateSessionActivityDto,
    @Request() req: any,
  ): Promise<SessionActivityDto> {
    const sessionActivity = await this.sessionService.trackActivity(id, activity, req.ip);
    return this.mapActivityToDto(sessionActivity);
  }

  /**
   * Aktualisiert Session-Heartbeat
   */
  @Put(':id/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update session heartbeat' })
  @ApiResponse({
    status: 204,
    description: 'Heartbeat updated successfully',
  })
  async updateHeartbeat(@Param('id') id: string): Promise<void> {
    await this.sessionService.updateHeartbeat(id);
  }

  /**
   * Revoziert eine Session
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({
    status: 204,
    description: 'Session revoked successfully',
  })
  async revokeSession(@Param('id') id: string, @Body('reason') reason: string): Promise<void> {
    await this.sessionService.revokeSession(id, reason);
  }

  /**
   * Revoziert eigene Session
   */
  @Delete('my-sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke own session' })
  @ApiResponse({
    status: 204,
    description: 'Session revoked successfully',
  })
  async revokeMySession(@Param('id') id: string, @Request() req: any): Promise<void> {
    const sessions = await this.sessionService.getSessions({ userId: req.user.userId });
    const session = sessions.find((s) => s.id === id);

    if (session) {
      await this.sessionService.revokeSession(id, 'User initiated');
    }
  }

  /**
   * Revoziert alle Sessions eines Benutzers
   */
  @Delete('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke all user sessions' })
  @ApiResponse({
    status: 200,
    description: 'Number of sessions revoked',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async revokeUserSessions(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ): Promise<{ count: number }> {
    const count = await this.sessionService.revokeUserSessions(userId, reason);
    return { count };
  }

  /**
   * Mappt Session zu DTO
   */
  private mapSessionToDto(session: any): SessionDto {
    return {
      id: session.id,
      userId: session.userId,
      username: session.user.username,
      email: session.user.email,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      location: session.location,
      deviceType: session.deviceType,
      browser: session.browser,
      browserVersion: session.browserVersion,
      os: session.os,
      osVersion: session.osVersion,
      loginMethod: session.loginMethod,
      isOnline: session.isOnline,
      lastHeartbeat: session.lastHeartbeat,
      lastActivityAt: session.lastActivityAt,
      activityCount: session.activityCount,
      riskScore: session.riskScore,
      suspiciousFlags: session.suspiciousFlags,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isRevoked: session.isRevoked,
      revokedAt: session.revokedAt,
      revokedReason: session.revokedReason,
    };
  }

  /**
   * Mappt Activity zu DTO
   */
  private mapActivityToDto(activity: any): SessionActivityDto {
    return {
      id: activity.id,
      sessionId: activity.sessionId,
      timestamp: activity.timestamp,
      activityType: activity.activityType,
      resource: activity.resource,
      method: activity.method,
      statusCode: activity.statusCode,
      duration: activity.duration,
      ipAddress: activity.ipAddress,
      metadata: activity.metadata,
    };
  }
}
