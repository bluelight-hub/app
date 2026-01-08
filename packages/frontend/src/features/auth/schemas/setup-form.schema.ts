import { z } from 'zod';
import { usernameSchema, passwordSchema } from '@bluelight-hub/shared/schemas';

/**
 * Zod Schema fuer das Admin-Setup-Formular
 *
 * Nutzt Shared Schemas aus @bluelight-hub/shared/schemas
 * für konsistente Validierung mit dem Backend:
 * - usernameSchema: 3-20 Zeichen, alphanumerisch + Bindestriche/Unterstriche
 * - passwordSchema: Min. 8 Zeichen, Komplexitätsregeln (Gross/Klein/Zahlen/Sonderzeichen)
 * - passwordConfirm: Muss mit password uebereinstimmen
 */
export const setupFormSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
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
