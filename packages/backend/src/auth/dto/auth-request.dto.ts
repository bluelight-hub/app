import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Unified Auth Request DTO
 *
 * Vereinheitlichtes DTO für Login und automatische Registrierung.
 * Nur der Username ist erforderlich - Passwörter sind nur für Admin-Accounts relevant.
 */
export class AuthRequestDto {
  @ApiProperty({
    description: 'Benutzername für Login oder automatische Registrierung',
    example: 'max_mustermann',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty({ message: 'Benutzername darf nicht leer sein' })
  @MinLength(3, { message: 'Benutzername muss mindestens 3 Zeichen lang sein' })
  @MaxLength(30, { message: 'Benutzername darf maximal 30 Zeichen lang sein' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten',
  })
  username: string;

  @ApiProperty({
    description: 'Passwort (nur für Admin-Accounts erforderlich)',
    example: 'admin-password-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'E-Mail-Adresse (optional, für neue Benutzer)',
    example: 'max@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;
}
