import { z } from 'zod';
import { PASSWORD_CRITERIA, validatePasswordCriteria } from '../../validation/password.schema.js';

/**
 * Zod-Schema für die Validierung von Passwörtern.
 *
 * Nutzt die bestehende `validatePasswordCriteria` Funktion aus
 * @bluelight-hub/shared/validation für konsistente Passwort-Regeln:
 *
 * - Mindestens 8 Zeichen
 * - Maximal 128 Zeichen
 * - Mindestens ein Kleinbuchstabe
 * - Mindestens ein Großbuchstabe
 * - Mindestens eine Zahl
 * - Mindestens ein Sonderzeichen
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
 * Re-export PASSWORD_CRITERIA für einfache Nutzung
 */
export { PASSWORD_CRITERIA };
