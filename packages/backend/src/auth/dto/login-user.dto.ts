import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object für die Benutzeranmeldung
 *
 * Validiert die Eingabedaten für die Anmeldung eines bestehenden Benutzers.
 * Die Anmeldung erfolgt nur mit dem Benutzernamen, ohne Passwort.
 */
export class LoginUserDto {
  /**
   * Der Benutzername des anzumeldenden Accounts
   *
   * @example "max_mustermann"
   */
  @ApiProperty({
    description: 'Benutzername für die Anmeldung',
    example: 'max_mustermann',
  })
  @IsString()
  @IsNotEmpty({ message: 'Benutzername darf nicht leer sein' })
  username: string;
}
