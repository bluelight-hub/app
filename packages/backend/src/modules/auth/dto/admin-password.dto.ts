import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { z } from 'zod';
import { ValidateWithZod } from '@/application/common/validation';
import { isPasswordBlocked } from '@/infrastructure/password/password-blocklist.const';

/**
 * Passwort-Schema gemäß NIST SP 800-63B-4 (Juli 2025)
 *
 * NIST-Compliance:
 * - Mindestlänge: 8 Zeichen
 * - Maximallänge: 128 Zeichen
 * - KEINE Composition Rules (von NIST als ineffektiv eingestuft)
 * - Blocklist-Prüfung mit ~193 häufigen Passwörtern (inkl. Unicode-Normalisierung)
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
 * Data Transfer Object für die Admin-Anmeldung nur mit Passwort
 *
 * Wird verwendet wenn ein bereits angemeldeter Benutzer seine Admin-Rechte
 * durch Eingabe seines Passworts aktivieren möchte.
 *
 * **Validierung gemäß NIST SP 800-63B-4:**
 * - 8-128 Zeichen
 * - Blocklist-Prüfung gegen häufige Passwörter
 * - KEINE Composition Rules (Groß/Klein/Zahlen/Sonderzeichen)
 */
export class AdminPasswordDto {
  /**
   * Das Passwort des Admin-Accounts (NIST SP 800-63B-4 konform)
   *
   * @example "MeinSicheresPasswort2025"
   */
  @ApiProperty({
    description: 'Passwort des Admin-Accounts (8-128 Zeichen, NIST SP 800-63B-4 konform)',
    example: 'MeinSicheresPasswort2025',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Das Passwort muss mindestens 8 Zeichen lang sein' })
  @MaxLength(128, { message: 'Das Passwort darf maximal 128 Zeichen lang sein' })
  @ValidateWithZod(passwordSchema)
  password!: string;
}
