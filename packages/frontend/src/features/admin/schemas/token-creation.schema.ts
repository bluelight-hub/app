import { z } from 'zod';

/**
 * Zod-Schema fuer Access-Token-Erstellung
 *
 * Validiert den Token-Namen mit deutschen Fehlermeldungen.
 * - Name: required, 3-50 Zeichen
 */
export const tokenCreationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').min(3, 'Name muss mindestens 3 Zeichen haben').max(50, 'Name darf maximal 50 Zeichen haben'),
});

/**
 * TypeScript-Type abgeleitet aus dem Schema
 */
export type TokenCreationFormData = z.infer<typeof tokenCreationSchema>;
