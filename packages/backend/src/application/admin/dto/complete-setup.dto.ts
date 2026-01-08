import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
// TODO: Revert to shared schemas when backend is migrated to ESM
// import { passwordSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { z } from 'zod';
import { ValidateWithZod } from '@/application/common/validation';

// TEMPORARY: Inline schemas until backend ESM migration (Issue: Backend ESM Migration)
// Source: @bluelight-hub/shared/schemas (keep in sync!)
const usernameSchema = z
  .string()
  .min(3, 'Nutzername muss mindestens 3 Zeichen lang sein')
  .max(20, 'Nutzername darf höchstens 20 Zeichen lang sein')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Nutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten');

const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
  .regex(/[0-9]/, 'Passwort muss mindestens eine Ziffer enthalten')
  .regex(/[^a-zA-Z0-9]/, 'Passwort muss mindestens ein Sonderzeichen enthalten');

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
 * **Validierung:** Nutzt Shared Zod-Schemas aus @bluelight-hub/shared/schemas
 * für konsistente Frontend/Backend-Validierung:
 * - usernameSchema: 3-20 Zeichen, alphanumerisch + Bindestriche/Unterstriche
 * - passwordSchema: Min. 8 Zeichen, Komplexitätsregeln (Gross/Klein/Zahlen/Sonderzeichen)
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
   * Validierung via Shared Zod-Schema (usernameSchema).
   */
  @ApiProperty({
    description: 'Nutzername des Admin-Users (3-20 Zeichen, alphanumerisch + Bindestriche/Unterstriche)',
    example: 'admin',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nutzername darf nicht leer sein' })
  @ValidateWithZod(usernameSchema)
  username!: string;

  /**
   * Passwort fuer den Admin-Account.
   * Validierung via Shared Zod-Schema (passwordSchema).
   */
  @ApiProperty({
    description: 'Passwort fuer den Admin-Account (min. 8 Zeichen, Komplexitätsregeln)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Passwort darf nicht leer sein' })
  @ValidateWithZod(passwordSchema)
  password!: string;
}
