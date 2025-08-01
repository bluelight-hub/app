import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '@prisma/client';

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
  async register(@Body() dto: RegisterUserDto): Promise<User> {
    return this.authService.register(dto);
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
  async login(@Body() dto: LoginUserDto): Promise<User> {
    return this.authService.login(dto);
  }
}
