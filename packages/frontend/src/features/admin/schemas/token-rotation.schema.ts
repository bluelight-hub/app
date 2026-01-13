import { z } from 'zod';

/**
 * Zod-Schema fuer Access-Token-Rotation
 *
 * Validiert den optionalen neuen Token-Namen mit deutschen Fehlermeldungen.
 * - newName: optional, aber wenn angegeben 3-50 Zeichen
 */
export const tokenRotationSchema = z.object({
  newName: z
    .string()
    .trim()
    .refine((val) => val === '' || (val.length >= 3 && val.length <= 50), {
      message: 'Der Name muss zwischen 3 und 50 Zeichen lang sein.',
    }),
});

/**
 * TypeScript-Type abgeleitet aus dem Schema
 */
export type TokenRotationFormValues = z.infer<typeof tokenRotationSchema>;
