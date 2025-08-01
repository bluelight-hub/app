import { IsString, MinLength, MaxLength, Matches, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * Data Transfer Object für die Erstellung eines neuen Benutzers
 *
 * Wird von Administratoren verwendet, um neue Benutzer im System zu erstellen.
 * Die Rolle kann optional angegeben werden, standardmäßig wird USER verwendet.
 */
export class CreateUserDto {
  /**
   * Der eindeutige Benutzername für den neuen Account
   *
   * @example "maria_muster"
   */
  @ApiProperty({
    description: 'Eindeutiger Benutzername',
    example: 'maria_muster',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_-]+$',
  })
  @IsString()
  @MinLength(3, { message: 'Benutzername muss mindestens 3 Zeichen lang sein' })
  @MaxLength(30, { message: 'Benutzername darf maximal 30 Zeichen lang sein' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten',
  })
  username: string;

  /**
   * Die Rolle des neuen Benutzers
   *
   * @example UserRole.USER
   * @default UserRole.USER
   */
  @ApiPropertyOptional({
    description: 'Rolle des Benutzers',
    enum: UserRole,
    example: UserRole.USER,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Ungültige Benutzerrolle' })
  role?: UserRole;
}
