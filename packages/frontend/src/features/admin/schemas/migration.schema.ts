import { z } from 'zod';

/**
 * Zod-Schema fuer Migration zu SECURE_MODE
 *
 * Validiert den optionalen Token-Namen fuer das
 * primaere Access-Token das bei der Migration erstellt wird.
 *
 * - Name: optional, 3-50 Zeichen
 */
export const migrationSchema = z.object({
  tokenName: z.string().min(3, 'Name muss mindestens 3 Zeichen haben').max(50, 'Name darf maximal 50 Zeichen haben').optional().or(z.literal('')),
});

/**
 * TypeScript-Type abgeleitet aus dem Schema
 */
export type MigrationFormData = z.infer<typeof migrationSchema>;
