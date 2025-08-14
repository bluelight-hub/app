import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object für die Benutzerregistrierung
 *
 * Validiert die Eingabedaten für die Registrierung eines neuen Benutzers.
 * Der Benutzername muss zwischen 3 und 30 Zeichen lang sein und darf nur
 * Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.
 */
export class RegisterUserDto {
  /**
   * Der gewünschte Benutzername für den neuen Account
   *
   * @example "max_mustermann"
   */
  @ApiProperty({
    description: 'Eindeutiger Benutzername',
    example: 'max_mustermann',
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
}
