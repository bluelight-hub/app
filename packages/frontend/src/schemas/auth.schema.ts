import { z } from 'zod';

/**
 * Zod-Schema für die Validierung von Benutzernamen
 *
 * Regeln:
 * - Mindestens 3 Zeichen
 * - Maximal 30 Zeichen
 * - Nur alphanumerische Zeichen und Unterstriche
 * - Muss mit einem Buchstaben beginnen
 */
export const usernameSchema = z
  .string()
  .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
  .max(30, 'Benutzername darf maximal 30 Zeichen lang sein')
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    'Benutzername darf nur Buchstaben, Zahlen und Unterstriche enthalten und muss mit einem Buchstaben beginnen',
  );

/**
 * Schema für das Registrierungsformular
 */
export const registerFormSchema = z.object({
  username: usernameSchema,
});

/**
 * Schema für das Login-Formular
 */
export const loginFormSchema = z.object({
  username: z.string().min(1, 'Bitte wählen Sie einen Benutzer aus'),
});

// TypeScript-Typen aus den Schemas
export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
