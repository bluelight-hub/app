import { z } from 'zod';

/**
 * Zod-Schema fuer Migration zu SECURE_MODE
 *
 * Validiert den optionalen Token-Namen fuer das
 * primaere Access-Token das bei der Migration erstellt wird.
 *
 * - Name: optional, 3-50 Zeichen
 * - Leerer String wird zu undefined transformiert (Backend-Default)
 */
export const migrationSchema = z.object({
  tokenName: z.union([z.literal(''), z.string().min(3, 'Name muss mindestens 3 Zeichen haben').max(50, 'Name darf maximal 50 Zeichen haben')]).transform((val) => (val === '' ? undefined : val)),
});

/**
 * TypeScript-Type abgeleitet aus dem Schema
 */
export type MigrationFormData = z.infer<typeof migrationSchema>;
