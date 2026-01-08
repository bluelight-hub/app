import { z } from 'zod';

/**
 * Zod-Schema für CreateInvite Form.
 *
 * expiresAt ist required (Backend erwartet ISO-8601 String).
 * label und maxUses sind optional.
 */
export const createInviteSchema = z.object({
  label: z.string().max(100, 'Label darf maximal 100 Zeichen haben').optional().or(z.literal('')),
  expiresAt: z.string().min(1, 'Ablaufdatum ist erforderlich'),
  maxUses: z
    .number({ invalid_type_error: 'Muss eine Zahl sein' })
    .int('Muss eine ganze Zahl sein')
    .min(1, 'Mindestens 1 Nutzung erforderlich')
    .max(100, 'Maximal 100 Nutzungen erlaubt')
    .optional()
    .or(z.literal(undefined)),
});

export type CreateInviteFormData = z.infer<typeof createInviteSchema>;
