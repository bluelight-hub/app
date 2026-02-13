import { z } from 'zod';

/**
 * Zod Schema fuer das Erstellen einer Notiz.
 */
export const createNotizSchema = z.object({
  titel: z.string().trim().min(1, 'Titel ist erforderlich').max(100, 'Titel darf maximal 100 Zeichen lang sein'),
  inhalt: z
    .string()
    .max(2000, 'Inhalt darf maximal 2000 Zeichen lang sein')
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  kategorieId: z.string().optional().nullable(),
  istTeamsichtbar: z.boolean().default(false),
});

export type CreateNotizFormValues = z.infer<typeof createNotizSchema>;

/**
 * Zod Schema fuer das Bearbeiten einer Notiz.
 * Alle Felder optional (partial update).
 */
export const updateNotizSchema = z.object({
  titel: z.string().trim().min(1, 'Titel ist erforderlich').max(100, 'Titel darf maximal 100 Zeichen lang sein'),
  inhalt: z
    .string()
    .max(2000, 'Inhalt darf maximal 2000 Zeichen lang sein')
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  kategorieId: z.string().optional().nullable(),
  istTeamsichtbar: z.boolean().optional(),
});

export type UpdateNotizFormValues = z.infer<typeof updateNotizSchema>;
