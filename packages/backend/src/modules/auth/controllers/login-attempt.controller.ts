import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { Permission } from '../types/jwt.types';
import { LoginAttemptService } from '../services/login-attempt.service';
import { LoginAttemptDto, LoginAttemptStatsDto } from '../dto/login-attempt.dto';

/**
 * Controller zur Verwaltung von Login-Versuchen
 *
 * Bietet Endpunkte für Login-Statistiken, Überwachung von fehlgeschlagenen
 * Versuchen und Verwaltung von gesperrten Accounts. Dieser Controller ist
 * geschützt und erfordert entsprechende Berechtigungen für den Zugriff.
 *
 * Alle Endpunkte erfordern:
 * - Authentifizierung via JWT Token
 * - Berechtigung AUDIT_LOG_READ
 *
 * @class LoginAttemptController
 * @example
 * ```typescript
 * // GET /auth/login-attempts/stats?startDate=2024-01-01&endDate=2024-01-31
 * // Liefert Login-Statistiken für Januar 2024
 *
 * // GET /auth/login-attempts/recent?email=user@example.com&limit=5
 * // Liefert die letzten 5 Login-Versuche für einen spezifischen Benutzer
 * ```
 */
@ApiTags('auth/login-attempts')
@Controller('auth/login-attempts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoginAttemptController {
  /**
   * Konstruktor des LoginAttemptController
   *
   * @param {LoginAttemptService} loginAttemptService - Service für Login-Versuch-Operationen
   */
  constructor(private readonly loginAttemptService: LoginAttemptService) {}

  /**
   * Liefert Login-Statistiken für einen bestimmten Zeitraum
   *
   * Dieser Endpunkt aggregiert Login-Versuche und liefert detaillierte
   * Statistiken über erfolgreiche und fehlgeschlagene Anmeldungen,
   * verdächtige Aktivitäten und geografische Verteilung.
   *
   * @param {string} startDateStr - Startdatum im ISO-Format (YYYY-MM-DD oder vollständiges ISO-8601)
   * @param {string} endDateStr - Enddatum im ISO-Format
   * @param {string} [email] - Optionale E-Mail-Adresse zur Filterung auf einen spezifischen Benutzer
   * @returns {Promise<LoginAttemptStatsDto>} Aggregierte Login-Statistiken
   * @throws {BadRequestException} Bei ungültigem Datumsformat oder wenn Startdatum nach Enddatum liegt
   *
   * @example
   * ```typescript
   * // Statistiken für Januar 2024
   * GET /auth/login-attempts/stats?startDate=2024-01-01&endDate=2024-01-31
   *
   * // Statistiken für einen spezifischen Benutzer
   * GET /auth/login-attempts/stats?startDate=2024-01-01&endDate=2024-01-31&email=user@example.com
   * ```
   */
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

  /**
   * Liefert die neuesten Login-Versuche
   *
   * Dieser Endpunkt gibt eine chronologisch sortierte Liste der neuesten
   * Login-Versuche zurück. Die Liste enthält sowohl erfolgreiche als auch
   * fehlgeschlagene Versuche mit detaillierten Informationen zu jedem Versuch.
   *
   * @param {string} [email] - Optionale E-Mail-Adresse zur Filterung auf einen spezifischen Benutzer
   * @param {number} [limit=10] - Anzahl der zurückzugebenden Versuche (1-100, Standard: 10)
   * @returns {Promise<LoginAttemptDto[]>} Array der neuesten Login-Versuche
   *
   * @example
   * ```typescript
   * // Die letzten 10 Login-Versuche (alle Benutzer)
   * GET /auth/login-attempts/recent
   *
   * // Die letzten 20 Login-Versuche für einen spezifischen Benutzer
   * GET /auth/login-attempts/recent?email=user@example.com&limit=20
   *
   * // Antwort-Beispiel:
   * [
   *   {
   *     id: "123",
   *     email: "user@example.com",
   *     attemptAt: "2024-01-15T10:30:00Z",
   *     success: true,
   *     ipAddress: "192.168.1.1",
   *     location: "Berlin, Germany",
   *     riskScore: 15
   *   }
   * ]
   * ```
   */
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
