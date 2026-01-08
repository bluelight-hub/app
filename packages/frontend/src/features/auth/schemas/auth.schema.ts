import { z } from 'zod';
import { usernameSchema } from '@bluelight-hub/shared/schemas';

/**
 * Schema für das Registrierungsformular
 *
 * Nutzt das Shared usernameSchema aus @bluelight-hub/shared/schemas
 * für konsistente Validierung mit dem Backend.
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
