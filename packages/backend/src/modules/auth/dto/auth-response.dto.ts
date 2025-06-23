import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../types/jwt.types';

/**
 * DTO für authentifizierten Benutzer
 * @class AuthUserDto
 * @description Enthält die Informationen eines authentifizierten Benutzers
 */
export class AuthUserDto {
  /** Eindeutige ID des Benutzers (NanoID) */
  @ApiProperty({ description: 'User ID' })
  id: string;

  /** E-Mail-Adresse des Benutzers */
  @ApiProperty({ description: 'User email address' })
  email: string;

  /** Rollen des Benutzers im System */
  @ApiProperty({ description: 'User roles', enum: UserRole, isArray: true })
  roles: UserRole[];

  /** Berechtigungen des Benutzers basierend auf seinen Rollen */
  @ApiProperty({ description: 'User permissions', type: [String] })
  permissions: string[];

  /** Aktivitätsstatus des Benutzerkontos */
  @ApiProperty({ description: 'Whether user is active' })
  isActive: boolean;

  /** MFA-Aktivierungsstatus des Benutzers */
  @ApiProperty({ description: 'Whether MFA is enabled for the user' })
  isMfaEnabled: boolean;

  /** Erstellungsdatum des Benutzerkontos */
  @ApiProperty({ description: 'User creation date', type: Date })
  createdAt: Date;

  /** Letztes Aktualisierungsdatum des Benutzerkontos */
  @ApiProperty({ description: 'User last update date', type: Date })
  updatedAt: Date;
}

/**
 * DTO für Login Response
 * @class LoginResponseDto
 * @description Enthält die Antwort nach erfolgreichem Login mit optionaler MFA-Anforderung
 */
export class LoginResponseDto {
  /** JWT Access Token für API-Zugriff */
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  /** JWT Refresh Token für Token-Erneuerung */
  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  /** Informationen über den authentifizierten Benutzer */
  @ApiProperty({ description: 'Authenticated user information', type: AuthUserDto })
  user: AuthUserDto;

  /** Indikator, ob eine MFA-Verifizierung erforderlich ist */
  @ApiPropertyOptional({ description: 'Whether MFA verification is required' })
  requiresMfa?: boolean;

  /** Challenge-ID für die MFA-Verifizierung */
  @ApiPropertyOptional({ description: 'MFA challenge ID for verification' })
  mfaChallengeId?: string;
}

/**
 * DTO für Token Response
 * @class TokenResponseDto
 * @description Enthält die JWT-Tokens nach erfolgreicher Token-Erneuerung
 */
export class TokenResponseDto {
  /** Neuer JWT Access Token nach erfolgreicher Erneuerung */
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  /** Neuer JWT Refresh Token nach erfolgreicher Erneuerung */
  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;
}
