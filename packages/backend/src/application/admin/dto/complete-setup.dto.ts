import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Request DTO fuer den initialen Server-Setup.
 *
 * Dieses DTO validiert die Admin-Credentials beim erstmaligen
 * Setup des Servers. Es wird nur einmal verwendet - nach
 * erfolgreichem Setup ist dieser Endpoint gesperrt.
 *
 * **Wichtig:** Admins haben Nutzername + Passwort.
 * Normale Nutzer haben NUR Nutzername (kein Passwort).
 *
 * **Sicherheitsaspekte:**
 * - Username: 3-50 Zeichen, alphanumerisch + Underscore
 * - Passwort-Mindestlaenge: 8 Zeichen (via class-validator)
 *
 * @example
 * ```typescript
 * const dto = new CompleteSetupDto();
 * dto.username = 'admin';
 * dto.password = 'SecurePassword123!';
 * ```
 */
export class CompleteSetupDto {
  /**
   * Nutzername des Admin-Users.
   * 3-50 Zeichen, nur alphanumerisch und Underscores.
   */
  @ApiProperty({
    description: 'Nutzername des Admin-Users (3-50 Zeichen, alphanumerisch + underscore)',
    example: 'admin',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nutzername darf nicht leer sein' })
  @MinLength(3, { message: 'Nutzername muss mindestens 3 Zeichen lang sein' })
  @MaxLength(50, { message: 'Nutzername darf maximal 50 Zeichen lang sein' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Nutzername darf nur alphanumerische Zeichen und Underscores enthalten' })
  username!: string;

  /**
   * Passwort fuer den Admin-Account.
   * Mindestens 8 Zeichen erforderlich.
   */
  @ApiProperty({
    description: 'Passwort fuer den Admin-Account (min. 8 Zeichen)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Passwort darf nicht leer sein' })
  @MinLength(8, { message: 'Passwort muss mindestens 8 Zeichen lang sein' })
  password!: string;
}
