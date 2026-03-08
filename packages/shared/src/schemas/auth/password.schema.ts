import { z } from 'zod';
import { PASSWORD_CRITERIA, validatePasswordCriteria, isPasswordBlocked, PASSWORD_BLOCKLIST } from '../../validation';

/**
 * Zod-Schema für die Validierung von Passwörtern gemäß NIST SP 800-63B-4.
 *
 * Nutzt die bestehende `validatePasswordCriteria` Funktion aus
 * @bluelight-hub/shared/validation für konsistente Passwort-Regeln:
 *
 * - Mindestens 8 Zeichen (NIST-Minimum)
 * - Maximal 128 Zeichen (über NIST-Minimum von 64)
 * - Blocklist-Prüfung gegen häufige Passwörter
 * - KEINE Composition Rules (NIST verbietet diese)
 *
 * WICHTIG: Dieses Schema wird sowohl im Frontend (Formulare)
 * als auch im Backend (DTOs) verwendet.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_CRITERIA.minLength, `Passwort muss mindestens ${PASSWORD_CRITERIA.minLength} Zeichen lang sein`)
  .max(PASSWORD_CRITERIA.maxLength, `Passwort darf maximal ${PASSWORD_CRITERIA.maxLength} Zeichen lang sein`)
  .superRefine((password, ctx) => {
    const validation = validatePasswordCriteria(password);
    if (!validation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validation.error || 'Passwort erfüllt nicht die Anforderungen',
      });
    }
  });

/**
 * TypeScript-Typ für Passwörter
 */
export type Password = z.infer<typeof passwordSchema>;

/**
 * Re-export PASSWORD_CRITERIA und Blocklist-Funktionen für einfache Nutzung
 */
export { PASSWORD_CRITERIA, isPasswordBlocked, PASSWORD_BLOCKLIST };
