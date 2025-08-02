import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * DTO für sichere User-Responses
 *
 * Enthält nur öffentliche Felder und schließt sensitive
 * Informationen wie passwordHash, failedLoginCount etc. aus
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID des Benutzers',
    example: '453GsDyW0KssEuIW2lo2G',
  })
  id: string;

  @ApiProperty({
    description: 'Benutzername',
    example: 'max_mustermann',
  })
  username: string;

  @ApiProperty({
    description: 'Rolle des Benutzers',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Gibt an, ob der Benutzer aktiv ist',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Anmeldung',
    required: false,
    nullable: true,
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Zeitpunkt der Erstellung',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Aktualisierung',
  })
  updatedAt: Date;
}

/**
 * DTO für Auth-Responses mit Token
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'Benutzerinformationen',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'JWT Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
