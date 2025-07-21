import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

/**
 * Data Transfer Object für Benutzer-Login-Anfragen
 *
 * Enthält die Anmeldedaten (E-Mail und Passwort) sowie eine optionale
 * "Remember Me"-Option für verlängerte Session-Dauer. Wird für die
 * Authentifizierung über den POST /auth/login Endpoint verwendet.
 *
 * @class LoginDto
 *
 * @example
 * ```typescript
 * const loginData: LoginDto = {
 *   email: 'admin@bluelight-hub.com',
 *   password: 'SecurePassword123!',
 *   rememberMe: true
 * };
 * ```
 */
export class LoginDto {
  /**
   * E-Mail-Adresse des Benutzers
   *
   * Muss eine gültige E-Mail-Adresse sein.
   * Wird für die Identifikation des Benutzers verwendet.
   *
   * @property {string} email - Gültige E-Mail-Adresse
   * @example 'admin@bluelight-hub.com'
   */
  @ApiProperty({
    example: 'admin@bluelight-hub.com',
    description: 'E-Mail-Adresse des Benutzers',
  })
  @IsEmail()
  email: string;

  /**
   * Passwort des Benutzers
   *
   * Mindestlänge: 8 Zeichen. Das Passwort wird nie im Klartext
   * gespeichert oder in Responses zurückgegeben.
   *
   * @property {string} password - Benutzerpasswort (min. 8 Zeichen)
   * @example 'SecurePassword123!'
   */
  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Passwort des Benutzers (min. 8 Zeichen)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  /**
   * Remember Me Option
   *
   * Wenn aktiviert, wird die Session-Dauer verlängert
   * (z.B. 30 Tage statt 24 Stunden). Optional.
   *
   * @property {boolean} [rememberMe=false] - Verlängerte Session-Dauer
   * @default false
   * @example true
   */
  @ApiProperty({
    example: false,
    required: false,
    description: 'Verlängerte Session-Dauer wenn aktiviert',
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

/**
 * Data Transfer Object für Token-Refresh-Anfragen
 *
 * Enthält den Refresh-Token, der gegen ein neues Access-Token-Paar
 * getauscht werden soll. Wird für den POST /auth/refresh Endpoint verwendet,
 * um abgelaufene Access-Tokens zu erneuern ohne erneute Anmeldung.
 *
 * @class RefreshTokenDto
 *
 * @example
 * ```typescript
 * const refreshData: RefreshTokenDto = {
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 * };
 * ```
 */
export class RefreshTokenDto {
  /**
   * Gültiger Refresh-Token
   *
   * Ein JWT-Token, der bei der initialen Anmeldung ausgestellt wurde
   * und zur Erneuerung des Access-Tokens verwendet wird.
   *
   * @property {string} refreshToken - JWT Refresh-Token
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  @ApiProperty({
    description: 'Gültiger Refresh-Token zur Token-Erneuerung',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}
