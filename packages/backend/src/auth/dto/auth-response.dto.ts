import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

/**
 * Unified Auth Response DTO
 *
 * Antwort für erfolgreiche Authentifizierung (Login oder neue Registrierung)
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'Gibt an, ob ein neuer Benutzer angelegt wurde',
    example: false,
  })
  isNewUser: boolean;

  @ApiProperty({
    description: 'Benutzerinformationen (ohne sensible Daten)',
    example: {
      id: 'user_123',
      username: 'max_mustermann',
      role: 'USER',
      createdAt: '2024-01-01T00:00:00Z',
    },
  })
  user: Omit<User, 'passwordHash'>;
}
