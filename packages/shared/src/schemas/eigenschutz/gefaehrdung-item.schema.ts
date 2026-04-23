import { z } from 'zod';

/**
 * Enum-Werte für Eintrittswahrscheinlichkeit (synchron mit Prisma-Enum).
 *
 * Siehe `packages/backend/prisma/schema.prisma:2568` — die SCREAMING_CASE-Werte
 * müssen 1:1 mit der Datenbank-Enum übereinstimmen.
 */
export const EINTRITTSWAHRSCHEINLICHKEIT_WERTE = ['SELTEN', 'GELEGENTLICH', 'HAEUFIG', 'OFT', 'STAENDIG'] as const;
export type Eintrittswahrscheinlichkeit = (typeof EINTRITTSWAHRSCHEINLICHKEIT_WERTE)[number];
export const eintrittswahrscheinlichkeitSchema = z.enum(EINTRITTSWAHRSCHEINLICHKEIT_WERTE);

/**
 * Enum-Werte für Schadensausmaß (synchron mit Prisma-Enum `Schadensausmass`).
 */
export const SCHADENSAUSMASS_WERTE = ['VERNACHLAESSIGBAR', 'GERING', 'MITTEL', 'HOCH', 'KATASTROPHAL'] as const;
export type Schadensausmass = (typeof SCHADENSAUSMASS_WERTE)[number];
export const schadensausmassSchema = z.enum(SCHADENSAUSMASS_WERTE);

/**
 * Enum-Werte für Risikoklasse (4-stufige Ampel + Orange; synchron mit Prisma).
 */
export const RISIKOKLASSE_WERTE = ['GRUEN', 'GELB', 'ORANGE', 'ROT'] as const;
export type Risikoklasse = (typeof RISIKOKLASSE_WERTE)[number];
export const risikoklasseSchema = z.enum(RISIKOKLASSE_WERTE);

/**
 * Zeichen-Limits für Gefährdungs-Items.
 *
 * Story 2.1 legt die Obergrenzen fest, Story 2.2 nutzt die Defaults für die
 * Eingabe-Validierung im Editor. Zentral hier, damit Frontend-Form und
 * Backend-DTO identisch validieren.
 */
export const GEFAEHRDUNG_ITEM_LIMITS = {
  titleMax: 120,
  descriptionMax: 2000,
  schutzmassnahmenMax: 2000,
} as const;

/**
 * Schema für ein einzelnes Gefährdungs-Item im JSONB-Array einer Gefährdungs-
 * beurteilung. Alle Risiko-Felder sind optional, weil Vorlagen auch Items ohne
 * vollständige Bewertung enthalten dürfen (Dev-Use-Case: vorbereitete Leer-
 * zeilen mit Titel + Leer-Bewertung).
 *
 * Das Feld `id` ist optional, weil neu erfasste Items vom Frontend noch keine
 * ID tragen; das Backend vergibt im Aggregat eine CUID2.
 */
export const gefaehrdungItemSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]{20,32}$/, 'Ungültige Item-ID')
    .optional(),
  title: z.string().trim().min(1, 'Titel ist erforderlich').max(GEFAEHRDUNG_ITEM_LIMITS.titleMax, `Titel darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.titleMax} Zeichen haben`),
  description: z.string().trim().max(GEFAEHRDUNG_ITEM_LIMITS.descriptionMax, `Beschreibung darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.descriptionMax} Zeichen haben`).optional(),
  eintritt: eintrittswahrscheinlichkeitSchema.optional(),
  schaden: schadensausmassSchema.optional(),
  risikoklasse: risikoklasseSchema.optional(),
  schutzmassnahmen: z.string().trim().max(GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax, `Schutzmaßnahmen dürfen maximal ${GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax} Zeichen haben`).optional(),
});

export type GefaehrdungItem = z.infer<typeof gefaehrdungItemSchema>;
