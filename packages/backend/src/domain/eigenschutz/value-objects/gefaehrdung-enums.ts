/**
 * Enum-Konstanten + Types für Gefährdungs-Items — Single Source of Truth im
 * Backend-Domain-Layer. Separat vom VO, damit die Risikoklasse-Utility
 * (`risikoklasse-berechnung.ts`) importieren kann, ohne einen Circular-
 * Dependency-Zyklus mit dem VO aufzubauen (`gefaehrdung-item.vo.ts`
 * importiert die Utility; die Utility importiert die Types — ohne diesen
 * Split würden beide kreis-abhängig).
 *
 * Die SCREAMING_CASE-Werte spiegeln die Prisma-Enums; Änderungen gehören in
 * eine Prisma-Migration und parallel in dieses Modul.
 */

export const EINTRITTSWAHRSCHEINLICHKEIT_WERTE = ['SELTEN', 'GELEGENTLICH', 'HAEUFIG', 'OFT', 'STAENDIG'] as const;
export type Eintrittswahrscheinlichkeit = (typeof EINTRITTSWAHRSCHEINLICHKEIT_WERTE)[number];

export const SCHADENSAUSMASS_WERTE = ['VERNACHLAESSIGBAR', 'GERING', 'MITTEL', 'HOCH', 'KATASTROPHAL'] as const;
export type Schadensausmass = (typeof SCHADENSAUSMASS_WERTE)[number];

export const RISIKOKLASSE_WERTE = ['GRUEN', 'GELB', 'ORANGE', 'ROT'] as const;
export type Risikoklasse = (typeof RISIKOKLASSE_WERTE)[number];

/**
 * Zeichenlimits für ein Gefährdungs-Item. Zentral definiert, damit Aggregate
 * und Shared-Zod-Schema identisch validieren.
 */
export const GEFAEHRDUNG_ITEM_LIMITS = {
  titleMin: 1,
  titleMax: 120,
  descriptionMax: 2000,
  schutzmassnahmenMax: 2000,
} as const;
