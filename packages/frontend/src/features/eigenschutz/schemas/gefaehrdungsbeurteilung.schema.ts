import { z } from 'zod';
import {
  createGefaehrdungsbeurteilungSchema,
  gefaehrdungsbeurteilungHistorieEintragSchema,
  gefaehrdungsbeurteilungHistorieSchema,
  gefaehrdungsbeurteilungSchema,
  gefaehrdungsbeurteilungVorlageSchema,
  gefaehrdungItemSchema,
  type CreateGefaehrdungsbeurteilungInput,
  type Gefaehrdungsbeurteilung,
  type GefaehrdungsbeurteilungHistorie,
  type GefaehrdungsbeurteilungHistorieEintrag,
  type GefaehrdungsbeurteilungVorlage,
  type GefaehrdungItem,
} from '@bluelight-hub/shared/schemas';

/**
 * Re-Export der Shared-Zod-Schemas für den Eigenschutz-Feature-Slice
 * (Story 2.1, AC6 + AC9). Das Formular-Schema erweitert das Create-Input
 * um den Drawer-spezifischen Auswahl-Modus (`seed` vs. `leer`), damit
 * `@tanstack/react-form` eine konsistente UI-Validierung liefert.
 *
 * Im Submit-Handler wird `modus` verworfen; an die API geht ausschließlich
 * `createGefaehrdungsbeurteilungSchema`.
 */
export {
  createGefaehrdungsbeurteilungSchema,
  gefaehrdungsbeurteilungHistorieEintragSchema,
  gefaehrdungsbeurteilungHistorieSchema,
  gefaehrdungsbeurteilungSchema,
  gefaehrdungsbeurteilungVorlageSchema,
  gefaehrdungItemSchema,
};
export type { CreateGefaehrdungsbeurteilungInput, Gefaehrdungsbeurteilung, GefaehrdungsbeurteilungHistorie, GefaehrdungsbeurteilungHistorieEintrag, GefaehrdungsbeurteilungVorlage, GefaehrdungItem };

export const CREATE_GEFAEHRDUNGSBEURTEILUNG_MODUS = ['seed', 'leer'] as const;
export type CreateGefaehrdungsbeurteilungModus = (typeof CREATE_GEFAEHRDUNGSBEURTEILUNG_MODUS)[number];

export const createGefaehrdungsbeurteilungFormSchema = createGefaehrdungsbeurteilungSchema
  .extend({
    modus: z.enum(CREATE_GEFAEHRDUNGSBEURTEILUNG_MODUS),
  })
  .superRefine((values, ctx) => {
    if (values.modus === 'seed' && !values.vorlageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bitte eine Seed-Vorlage auswählen.',
        path: ['vorlageId'],
      });
    }
    if (values.modus === 'leer' && values.vorlageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Für „Leeres Formular" darf keine Vorlage gesetzt sein.',
        path: ['vorlageId'],
      });
    }
  });

export type CreateGefaehrdungsbeurteilungFormValues = z.infer<typeof createGefaehrdungsbeurteilungFormSchema>;

/**
 * Items-Update-Schema (Story 2.2, AC10).
 *
 * Validiert den Request-Body für `POST …/items`: das neue Items-Array plus
 * das Optimistic-Concurrency-Token. Lokale Komposition aus dem geteilten
 * `gefaehrdungItemSchema` — keine Shared-Ebene nötig, weil nur das Frontend
 * das Formular-Schema kennt.
 */
export const updateGefaehrdungsbeurteilungItemsSchema = z.object({
  items: z.array(gefaehrdungItemSchema),
  expectedVersion: z.number().int().positive(),
});

export type UpdateGefaehrdungsbeurteilungItemsInput = z.infer<typeof updateGefaehrdungsbeurteilungItemsSchema>;

/**
 * Formular-Schema für den Editor-Organism. Fordert mindestens ein Item mit
 * Titel, wenn die Liste nicht leer ist — ganz leere Listen sind ein
 * zulässiger „Alle entfernen"-Submit (AC4).
 */
export const updateGefaehrdungsbeurteilungItemsFormSchema = updateGefaehrdungsbeurteilungItemsSchema.superRefine((values, ctx) => {
  if (values.items.length === 0) return;
  const hasAtLeastOneWithTitle = values.items.some((item) => (item.title ?? '').trim().length > 0);
  if (!hasAtLeastOneWithTitle) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Mindestens ein Item mit Titel ist erforderlich.',
      path: ['items'],
    });
  }
});

export type UpdateGefaehrdungsbeurteilungItemsFormValues = z.infer<typeof updateGefaehrdungsbeurteilungItemsFormSchema>;
