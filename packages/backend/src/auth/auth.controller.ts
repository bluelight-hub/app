import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AdminSetupDto } from './dto/admin-setup.dto';
import { AuthResponseDto } from './dto/user-response.dto';
import { clearAuthCookies, setAuthCookies } from './auth.utils';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ValidatedUser } from './strategies/jwt.strategy';
import { CurrentUser } from './decorators/current-user.decorator';
import { toUserResponseDto } from './auth.mapper';

/**
 * Controller für Authentifizierungs-Endpunkte
 *
 * Stellt REST-API-Endpunkte für Benutzerregistrierung und -anmeldung bereit.
 * Alle Endpunkte sind öffentlich zugänglich, da keine Authentifizierung
 * für die Registrierung/Anmeldung erforderlich ist.
 */
@ApiTags('auth')
@Controller({
  path: 'auth',
  version: VERSION_NEUTRAL,
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registriert einen neuen Benutzer
   *
   * Der erste registrierte Benutzer erhält automatisch die SUPER_ADMIN-Rolle.
   * Alle weiteren Benutzer erhalten die USER-Rolle.
   *
   * @param dto - Registrierungsdaten
   * @param res - Express Response für Cookie-Verwaltung
   * @returns Der erstellte Benutzer
   */
  @Post('register')
  @ApiOperation({
    summary: 'Neuen Benutzer registrieren',
    description:
      'Registriert einen neuen Benutzer ohne Passwort. Der erste Benutzer wird automatisch SUPER_ADMIN.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Benutzer erfolgreich registriert',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Benutzername bereits vergeben',
  })
  async register(
    @Body() dto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const user = await this.authService.register(dto);

    // JWT-Tokens generieren
    const accessToken = this.authService.signAccessToken(user.id);
    const refreshToken = this.authService.signRefreshToken(user.id);

    // Tokens als HTTP-Only Cookies setzen
    const isProduction = process.env.NODE_ENV === 'production';
    setAuthCookies(res, accessToken, refreshToken, isProduction);

    return {
      user: toUserResponseDto(user),
      accessToken,
    };
  }

  /**
   * Meldet einen Benutzer an
   *
   * Die Anmeldung erfolgt nur mit dem Benutzernamen, ohne Passwort.
   *
   * @param dto - Anmeldedaten
   * @param res - Express Response für Cookie-Verwaltung
   * @returns Der angemeldete Benutzer
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Benutzer anmelden',
    description: 'Meldet einen Benutzer nur mit Benutzernamen an (ohne Passwort)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Erfolgreich angemeldet',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Benutzer nicht gefunden',
  })
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const user = await this.authService.login(dto);

    // JWT-Tokens generieren
    const accessToken = this.authService.signAccessToken(user.id);
    const refreshToken = this.authService.signRefreshToken(user.id);

    // Tokens als HTTP-Only Cookies setzen
    const isProduction = process.env.NODE_ENV === 'production';
    setAuthCookies(res, accessToken, refreshToken, isProduction);

    return {
      user: toUserResponseDto(user),
      accessToken,
    };
  }

  /**
   * Erneuert Access-Token mit einem gültigen Refresh-Token
   *
   * @param req - Express Request mit authentifiziertem Benutzer
   * @param res - Express Response für Cookie-Verwaltung
   * @returns Neues Access-Token
   */
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Access-Token erneuern',
    description: 'Erneuert das Access-Token mit einem gültigen Refresh-Token aus dem Cookie',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token erfolgreich erneuert',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Ungültiges oder abgelaufenes Refresh-Token',
  })
  async refresh(
    @Req() req: Request & { user: ValidatedUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const user = await this.authService.findUserById(req.user.userId);

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Neue Tokens generieren
    const accessToken = this.authService.signAccessToken(user.id);
    const refreshToken = this.authService.signRefreshToken(user.id);

    // Tokens als HTTP-Only Cookies setzen
    const isProduction = process.env.NODE_ENV === 'production';
    setAuthCookies(res, accessToken, refreshToken, isProduction);

    return { accessToken };
  }

  /**
   * Meldet einen Benutzer ab und löscht die Authentifizierungs-Cookies
   *
   * @param res - Express Response für Cookie-Verwaltung
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Benutzer abmelden',
    description: 'Meldet den Benutzer ab und löscht alle Authentifizierungs-Cookies',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Erfolgreich abgemeldet',
  })
  async logout(@Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    clearAuthCookies(res);
    return { message: 'Erfolgreich abgemeldet' };
  }

  /**
   * Richtet das Passwort für einen Admin-Account ein
   *
   * @param dto - Admin-Setup-Daten mit Passwort
   * @param user - Der aktuelle authentifizierte Benutzer
   * @returns Erfolgsmeldung
   */
  @Post('admin/setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Admin-Passwort einrichten',
    description: 'Richtet das Passwort für einen Admin-Account ein. Erfordert Authentifizierung.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Admin-Passwort erfolgreich eingerichtet',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Admin-Setup bereits durchgeführt oder Benutzer ist kein Admin',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Keine Authentifizierung',
  })
  async adminSetup(
    @Body() dto: AdminSetupDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<{ message: string }> {
    return this.authService.adminSetup(dto, user);
  }
}
