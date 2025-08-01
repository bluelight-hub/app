import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '@prisma/client';
import { setAuthCookies, clearAuthCookies } from './auth.utils';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { ValidatedUser } from './strategies/jwt.strategy';

/**
 * Controller für Authentifizierungs-Endpunkte
 *
 * Stellt REST-API-Endpunkte für Benutzerregistrierung und -anmeldung bereit.
 * Alle Endpunkte sind öffentlich zugänglich, da keine Authentifizierung
 * für die Registrierung/Anmeldung erforderlich ist.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registriert einen neuen Benutzer
   *
   * Der erste registrierte Benutzer erhält automatisch die SUPER_ADMIN-Rolle.
   * Alle weiteren Benutzer erhalten die USER-Rolle.
   *
   * @param dto - Registrierungsdaten
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
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Benutzername bereits vergeben',
  })
  async register(
    @Body() dto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: User; accessToken: string }> {
    const user = await this.authService.register(dto);

    // JWT-Tokens generieren
    const accessToken = this.authService.signAccessToken(user.id);
    const refreshToken = this.authService.signRefreshToken(user.id);

    // Tokens als HTTP-Only Cookies setzen
    const isProduction = process.env.NODE_ENV === 'production';
    setAuthCookies(res, accessToken, refreshToken, isProduction);

    return { user, accessToken };
  }

  /**
   * Meldet einen Benutzer an
   *
   * Die Anmeldung erfolgt nur mit dem Benutzernamen, ohne Passwort.
   *
   * @param dto - Anmeldedaten
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
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Benutzer nicht gefunden',
  })
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: User; accessToken: string }> {
    const user = await this.authService.login(dto);

    // JWT-Tokens generieren
    const accessToken = this.authService.signAccessToken(user.id);
    const refreshToken = this.authService.signRefreshToken(user.id);

    // Tokens als HTTP-Only Cookies setzen
    const isProduction = process.env.NODE_ENV === 'production';
    setAuthCookies(res, accessToken, refreshToken, isProduction);

    return { user, accessToken };
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
}
