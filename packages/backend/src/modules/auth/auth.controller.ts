import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, LoginResponseDto, TokenResponseDto, AuthUserDto } from './dto';
import { LoginResponse, TokenResponse } from './types/auth.types';
import { JwtAuthGuard, RolesGuard } from './guards';
import { CurrentUser, Public, Roles } from './decorators';
import { JWTPayload, UserRole } from './types/jwt.types';
import { Request, Response } from 'express';
import { cookieConfig, refreshCookieConfig } from '../../config/security.config';
import { SecurityLogService } from '../../security/services/security-log.service';

/**
 * Controller handling authentication endpoints for admin users.
 * Provides login, token refresh, and logout functionality.
 */
@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private securityLogService: SecurityLogService,
  ) {}

  /**
   * Authentifiziert einen Admin-Benutzer und erstellt eine neue Session.
   *
   * Führt eine Anmeldung mit E-Mail und Passwort durch, erstellt JWT-Token
   * und setzt HTTP-Only Cookies für Access- und Refresh-Token.
   *
   * @param {LoginDto} loginDto - Anmeldedaten (E-Mail und Passwort)
   * @param {Request} request - Express Request-Objekt für IP und User-Agent
   * @param {Response} response - Express Response-Objekt für Cookie-Verwaltung
   * @returns {Promise<LoginResponse>} Anmeldeantwort mit Token und Benutzerinformationen
   * @throws {UnauthorizedException} Bei ungültigen Anmeldedaten
   * @throws {TooManyRequestsException} Bei zu vielen Anmeldeversuchen
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 Versuche pro Minute
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const xForwardedFor = request.headers['x-forwarded-for'];
    const ipAddress =
      (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) || request.ip || undefined;
    const userAgent = request.headers['user-agent'] || undefined;

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set access token in httpOnly cookie
    response.cookie('access_token', result.accessToken, cookieConfig);

    // Set refresh token in httpOnly cookie with path restriction
    response.cookie('refresh_token', result.refreshToken, refreshCookieConfig);

    return result;
  }

  /**
   * Erneuert abgelaufene Access-Token mit einem gültigen Refresh-Token.
   *
   * Prüft den Refresh-Token aus Cookie oder Request-Body und erstellt
   * neue Access- und Refresh-Token bei erfolgreicher Validierung.
   *
   * @param {RefreshTokenDto} refreshTokenDto - DTO mit Refresh-Token (optional, Fallback zu Cookie)
   * @param {Request} request - Express Request-Objekt für Cookie-Zugriff
   * @param {Response} response - Express Response-Objekt für Cookie-Updates
   * @returns {Promise<TokenResponse>} Neue Token-Informationen
   * @throws {UnauthorizedException} Bei fehlendem oder ungültigem Refresh-Token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenResponse> {
    // Try to get refresh token from cookie first, fallback to body
    const refreshToken = request.cookies?.refresh_token || refreshTokenDto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // Update cookies with new tokens
    response.cookie('access_token', result.accessToken, cookieConfig);
    response.cookie('refresh_token', result.refreshToken, refreshCookieConfig);

    return result;
  }

  /**
   * Ruft die Informationen des aktuell angemeldeten Benutzers ab.
   *
   * Gibt die Benutzerdaten basierend auf dem JWT-Token zurück.
   * Erfordert eine gültige Authentifizierung.
   *
   * @param {JWTPayload} user - JWT-Payload des authentifizierten Benutzers
   * @returns {Promise<AuthUserDto>} Benutzerinformationen ohne sensible Daten
   * @throws {UnauthorizedException} Bei fehlender oder ungültiger Authentifizierung
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user data', type: AuthUserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: JWTPayload) {
    return await this.authService.getCurrentUser(user.sub);
  }

  /**
   * Meldet den aktuellen Benutzer ab und beendet die Session.
   *
   * Invalidiert die aktuelle Session und löscht die Authentication-Cookies.
   * Erfordert eine gültige Authentifizierung.
   *
   * @param {JWTPayload} user - JWT-Payload mit Session-ID des Benutzers
   * @param {Response} response - Express Response-Objekt zum Löschen der Cookies
   * @returns {Promise<void>} Kein Rückgabewert (204 No Content)
   * @throws {UnauthorizedException} Bei fehlender oder ungültiger Authentifizierung
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: JWTPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(user.sessionId);

    // Clear cookies
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
  }

  /**
   * Test endpoint for E2E tests to create security log entries.
   * Only available in test/development environments.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('test-log')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async testLog(
    @Body() body: { eventType: string; userId: string; metadata?: any },
    @Req() request: Request,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Test endpoint not available in production');
    }

    const ipAddress = request.ip || '127.0.0.1';
    const userAgent = request.headers['user-agent'] || 'Test Agent';

    const result = await this.securityLogService.log(body.eventType as any, {
      action: body.eventType,
      userId: body.userId,
      ip: ipAddress,
      userAgent,
      metadata: body.metadata || {},
    });

    return result;
  }

  /**
   * Test endpoint for critical security log entries.
   * Only available in test/development environments.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('test-log-critical')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async testLogCritical(
    @Body() body: { eventType: string; userId: string; metadata?: any },
    @Req() request: Request,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Test endpoint not available in production');
    }

    const ipAddress = request.ip || '127.0.0.1';
    const userAgent = request.headers['user-agent'] || 'Test Agent';

    const result = await this.securityLogService.logCritical(body.eventType as any, {
      action: body.eventType,
      userId: body.userId,
      ip: ipAddress,
      userAgent,
      metadata: body.metadata || {},
    });

    return result;
  }
}
