import { validatePasswordCriteria } from '@bluelight-hub/shared';
import { z } from 'zod';

/**
 * Zod Schema fuer das Admin-Setup-Formular
 *
 * Validiert:
 * - username: 3-50 Zeichen, alphanumerisch + Underscore
 * - password: Passwort-Komplexitaet (Laenge, Gross-/Kleinbuchstaben, Zahlen, Sonderzeichen)
 * - passwordConfirm: Muss mit password uebereinstimmen
 */
export const setupFormSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Mindestens 3 Zeichen erforderlich')
      .max(50, 'Maximal 50 Zeichen erlaubt')
      .regex(/^[a-zA-Z0-9_]+$/, 'Nur Buchstaben, Zahlen und Unterstriche erlaubt'),
    password: z
      .string()
      .min(8, 'Mindestens 8 Zeichen erforderlich')
      .superRefine((password, ctx) => {
        const validation = validatePasswordCriteria(password);
        if (!validation.isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.error || 'Passwort erfuellt nicht die Anforderungen',
          });
        }
      }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwörter stimmen nicht überein',
    path: ['passwordConfirm'],
  });

/**
 * TypeScript-Typ fuer die Setup-Formular-Werte
 */
export type SetupFormValues = z.infer<typeof setupFormSchema>;
