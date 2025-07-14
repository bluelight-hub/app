import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { Permission } from '../types/jwt.types';
import { LoginAttemptService } from '../services/login-attempt.service';
import { LoginAttemptDto, LoginAttemptStatsDto } from '../dto/login-attempt.dto';

@ApiTags('auth/login-attempts')
@Controller('auth/login-attempts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoginAttemptController {
  constructor(private readonly loginAttemptService: LoginAttemptService) {}

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Get login attempt statistics' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Filter by email' })
  @ApiResponse({ status: 200, description: 'Login attempt statistics', type: LoginAttemptStatsDto })
  async getLoginStats(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('email') email?: string,
  ): Promise<LoginAttemptStatsDto> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.loginAttemptService.getLoginStats(startDate, endDate, email);
  }

  @Get('recent')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Get recent login attempts' })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Filter by email' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of attempts to return',
    default: 10,
  })
  @ApiResponse({ status: 200, description: 'Recent login attempts', type: [LoginAttemptDto] })
  async getRecentAttempts(
    @Query('email') email?: string,
    @Query('limit') limit?: number,
  ): Promise<LoginAttemptDto[]> {
    const attemptLimit = limit ? Math.min(Math.max(1, +limit), 100) : 10;
    const attempts = await this.loginAttemptService.getRecentAttempts(email, attemptLimit);

    return attempts.map((attempt) => ({
      id: attempt.id,
      userId: attempt.userId,
      email: attempt.email,
      attemptAt: attempt.attemptAt,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      success: attempt.success,
      failureReason: attempt.failureReason,
      location: attempt.location,
      deviceType: attempt.deviceType,
      browser: attempt.browser,
      os: attempt.os,
      suspicious: attempt.suspicious,
      riskScore: attempt.riskScore,
    }));
  }
}
