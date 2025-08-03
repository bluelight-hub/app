import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object für die Admin-Setup-Konfiguration
 *
 * Validiert die Eingabedaten für das Setup des Admin-Accounts.
 * Wird verwendet, um das Passwort für einen Admin-Account zu setzen.
 */
export class AdminSetupDto {
  /**
   * Das Passwort für den Admin-Account
   *
   * @example "SecurePassword123!"
   */
  @ApiProperty({
    description: 'Passwort für den Admin-Account',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Das Passwort muss mindestens 8 Zeichen lang sein' })
  @MaxLength(128, { message: 'Das Passwort darf maximal 128 Zeichen lang sein' })
  password: string;
}
