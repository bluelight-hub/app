import { z } from 'zod';

/**
 * Zod-Schema fuer Preset-Name Validierung
 *
 * **Story 8.9 AC1:** Name-Feld im SavePresetDialog
 */
export const filterPresetNameSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50, 'Name darf max. 50 Zeichen lang sein').trim(),
});

export type FilterPresetNameFormData = z.infer<typeof filterPresetNameSchema>;
