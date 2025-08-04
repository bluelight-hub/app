import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * Data Transfer Object für die Erstellung eines neuen Benutzers über die Admin-API
 *
 * Wird von Super-Administratoren verwendet, um neue Benutzer mit spezifischen Rollen anzulegen.
 */
export class CreateUserDto {
  /**
   * Der eindeutige Benutzername für den neuen Account
   *
   * @example "max_mustermann"
   */
  @ApiProperty({
    description: 'Eindeutiger Benutzername für den neuen Benutzer',
    example: 'max_mustermann',
    minLength: 3,
  })
  @IsString()
  @MinLength(3, { message: 'Benutzername muss mindestens 3 Zeichen lang sein' })
  username: string;

  /**
   * Die Rolle des neuen Benutzers im System
   *
   * @example UserRole.USER
   * @default UserRole.USER
   */
  @ApiPropertyOptional({
    enum: UserRole,
    description:
      'Rolle des neuen Benutzers (z.B. SUPER_ADMIN, ADMIN, USER). Ohne Angabe wird die Standardrolle USER vergeben.',
    example: UserRole.USER,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Ungültige Rolle. Erlaubte Werte sind: SUPER_ADMIN, ADMIN, USER' })
  role?: UserRole;
}
