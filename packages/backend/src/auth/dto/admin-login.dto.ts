import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object für die Admin-Anmeldung
 *
 * Validiert die Eingabedaten für die Anmeldung eines Admin-Accounts.
 * Im Gegensatz zur normalen Benutzeranmeldung erfordert die Admin-Anmeldung
 * sowohl Benutzername als auch Passwort.
 */
export class AdminLoginDto {
  /**
   * Der Benutzername des Admin-Accounts
   *
   * @example "admin"
   */
  @ApiProperty({
    description: 'Benutzername des Admin-Accounts',
    example: 'admin',
    minLength: 3,
  })
  @IsString()
  @MinLength(3, { message: 'Der Benutzername muss mindestens 3 Zeichen lang sein' })
  username: string;

  /**
   * Das Passwort des Admin-Accounts
   *
   * @example "SecureAdminPassword123!"
   */
  @ApiProperty({
    description: 'Passwort des Admin-Accounts',
    example: 'SecureAdminPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Das Passwort muss mindestens 8 Zeichen lang sein' })
  password: string;
}
