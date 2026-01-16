import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
// TODO: Revert to shared schemas when backend is migrated to ESM
// import { passwordSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { z } from 'zod';
import { ValidateWithZod } from '@/application/common/validation';
import { isPasswordBlocked } from '@/infrastructure/password/password-blocklist.const';

// TEMPORARY: Inline schemas until backend ESM migration (Issue: Backend ESM Migration)
// Source: @bluelight-hub/shared/schemas (keep in sync!)
const usernameSchema = z
  .string()
  .min(3, 'Nutzername muss mindestens 3 Zeichen lang sein')
  .max(20, 'Nutzername darf höchstens 20 Zeichen lang sein')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Nutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten');

/**
 * Passwort-Schema gemäß NIST SP 800-63B-4 (Juli 2025)
 *
 * NIST-Compliance:
 * - Mindestlänge: 8 Zeichen
 * - Maximallänge: 128 Zeichen
 * - KEINE Composition Rules (von NIST als ineffektiv eingestuft)
 * - Blocklist-Prüfung mit ~193 häufigen Passwörtern
 * - HIBP-Breach-Check im Handler für zusätzliche Sicherheit
 *
 * HINWEIS: Blocklist importiert aus password-blocklist.const.ts (synchron mit Shared-Package)
 */
const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .max(128, 'Passwort darf maximal 128 Zeichen lang sein')
  .refine((password) => !isPasswordBlocked(password), {
    message: 'Dieses Passwort ist zu häufig und nicht erlaubt',
  });

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
 * **Validierung gemäß NIST SP 800-63B-4:**
 * - usernameSchema: 3-20 Zeichen, alphanumerisch + Bindestriche/Unterstriche
 * - passwordSchema: Min. 8 Zeichen, max. 128 Zeichen, Blocklist-Prüfung
 * - KEINE Composition Rules (von NIST als ineffektiv eingestuft)
 *
 * @example
 * ```typescript
 * const dto = new CompleteSetupDto();
 * dto.username = 'admin';
 * dto.password = 'MeinSicheresPasswort2025';
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
   * Validierung gemäß NIST SP 800-63B-4 (keine Composition Rules, Blocklist-Prüfung).
   */
  @ApiProperty({
    description: 'Passwort fuer den Admin-Account (8-128 Zeichen, NIST SP 800-63B-4 konform)',
    example: 'MeinSicheresPasswort2025',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'Passwort darf nicht leer sein' })
  @ValidateWithZod(passwordSchema)
  password!: string;
}
