import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AdminSetupDto } from './dto/admin-setup.dto';
import { AdminStatusDto } from './dto/admin-status.dto';
import { AuthResponseDto, UserResponseDto } from './dto/user-response.dto';
import { AdminPasswordDto } from './dto/admin-password.dto';
import { clearAuthCookies, setAdminCookie, setAuthCookies } from './auth.utils';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { ValidatedUser } from './strategies/jwt.strategy';
import { CurrentUser } from './decorators/current-user.decorator';
import { toUserResponseDto } from './auth.mapper';
import { milliseconds } from 'date-fns';

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
   * Aktiviert Admin-Rechte für den aktuell angemeldeten Benutzer
   *
   * Der angemeldete Benutzer muss sein Passwort eingeben, um seine
   * Admin-Rechte zu aktivieren (sofern er welche besitzt).
   *
   * @param dto - Passwort-Daten
   * @param currentUser - Der aktuell angemeldete Benutzer
   * @param res - Express Response für Cookie-Verwaltung
   * @returns Der Admin-Benutzer mit aktivierten Rechten
   */
  @Post('admin/login')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('auth-token')
  @ApiOperation({
    summary: 'Admin-Rechte aktivieren',
    description:
      'Aktiviert Admin-Rechte für den aktuell angemeldeten Benutzer durch Passwort-Eingabe',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin-Rechte erfolgreich aktiviert',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '12345' },
            username: { type: 'string', example: 'admin' },
            isAdmin: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Ungültiges Passwort',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Benutzer hat keine Admin-Rechte',
  })
  async adminLogin(
    @Body() dto: AdminPasswordDto,
    @CurrentUser() currentUser: ValidatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: { id: string; username: string; isAdmin: boolean } }> {
    // Validiere die Admin-Rechte mit dem aktuellen Benutzer
    const user = await this.authService.validateAdminCredentials(currentUser.userId, dto.password);

    if (!user) {
      throw new UnauthorizedException('Ungültiges Passwort');
    }

    const token = this.authService.signAdminToken(user);
    const isProduction = process.env.NODE_ENV === 'production';
    setAdminCookie(res, token, isProduction);

    return {
      user: {
        id: user.id,
        username: user.username,
        isAdmin: true,
      },
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
   * @param res - Express Response für Cookie-Verwaltung
   * @returns Erfolgsmeldung und optional das Admin-Token
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string; user: any; token?: string }> {
    const result = await this.authService.adminSetup(dto, user);

    // Setze Admin-Token als HttpOnly-Cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('adminToken', result.token, {
      httpOnly: true,
      secure: isProduction,
      maxAge: milliseconds({ minutes: 15 }),
      sameSite: 'lax',
    });
    return {
      message: 'Admin-Setup erfolgreich durchgeführt',
      user: result.user,
      token: result.token, // Optional im Response-Body
    };
  }

  /**
   * Gibt die Informationen des aktuell authentifizierten Benutzers zurück
   *
   * @param user - Der aktuell authentifizierte Benutzer
   * @returns Die Benutzerinformationen
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Aktuelle Benutzerinformationen abrufen',
    description: 'Gibt die Informationen des aktuell authentifizierten Benutzers zurück',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Benutzerinformationen erfolgreich abgerufen',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Keine gültige Authentifizierung',
  })
  async getCurrentUser(@CurrentUser() user: ValidatedUser): Promise<UserResponseDto> {
    const fullUser = await this.authService.findUserById(user.userId);

    if (!fullUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    return toUserResponseDto(fullUser);
  }

  /**
   * Prüft den Admin-Setup-Status
   *
   * @param user - Der aktuell authentifizierte Benutzer
   * @returns Status-Informationen für das Admin-Setup
   */
  @Get('admin/status')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Admin-Setup-Status abrufen',
    description:
      'Prüft ob ein Admin-Setup verfügbar ist und ob der aktuelle Benutzer berechtigt ist',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin-Status erfolgreich abgerufen',
    type: AdminStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Keine gültige Authentifizierung',
  })
  async getAdminStatus(@CurrentUser() user: ValidatedUser): Promise<AdminStatusDto> {
    const fullUser = await this.authService.findUserById(user.userId);
    if (!fullUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    const adminExists = await this.authService.adminExists();
    const isAdminRole = fullUser.role === 'ADMIN' || fullUser.role === 'SUPER_ADMIN';
    const hasNoPassword = !fullUser.passwordHash;

    return {
      adminSetupAvailable: !adminExists && isAdminRole && hasNoPassword,
      adminExists,
      userEligible: isAdminRole && hasNoPassword,
    };
  }

  /**
   * Verifiziert die Gültigkeit eines Admin-Tokens
   *
   * Dieser Endpunkt wird vom Frontend beim App-Start aufgerufen,
   * um zu prüfen, ob das gespeicherte Admin-Token noch gültig ist.
   *
   * @returns Status 200 wenn Token gültig, 401 wenn ungültig
   */
  @Get('admin/verify')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Admin-Token verifizieren',
    description: 'Prüft, ob das Admin-Token im Cookie noch gültig ist.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin-Token ist gültig',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Admin-Token fehlt oder ist ungültig',
  })
  async verifyAdminToken(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
