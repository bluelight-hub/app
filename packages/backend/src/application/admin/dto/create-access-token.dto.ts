import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Request DTO zum Erstellen eines neuen Access-Tokens.
 *
 * Validiert die Eingabedaten fuer die Access-Token Erstellung.
 * Die eigentliche Business-Validierung (z.B. Whitespace-Handling)
 * erfolgt im CreateAccessTokenCommand.
 *
 * **Felder:**
 * - name: Name des Tokens zur Identifizierung (Pflicht, 3-50 Zeichen)
 *
 * @example
 * ```json
 * {
 *   "name": "CI/CD Pipeline Token"
 * }
 * ```
 */
export class CreateAccessTokenDto {
  /**
   * Name des Access-Tokens zur Identifizierung.
   * Muss zwischen 3 und 50 Zeichen lang sein.
   */
  @ApiProperty({
    description: 'Name des Access-Tokens zur Identifizierung (3-50 Zeichen)',
    example: 'CI/CD Pipeline Token',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'name muss ein String sein' })
  @MinLength(3, { message: 'name muss mindestens 3 Zeichen lang sein' })
  @MaxLength(50, { message: 'name darf maximal 50 Zeichen lang sein' })
  name!: string;
}
