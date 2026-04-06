import { z } from 'zod';

export const GEFAHRENTYPEN = [
  'ABSTURZ',
  'ANGSTREAKTION',
  'ATEMGIFTE',
  'ATOMARE_STRAHLUNG',
  'AUSBREITUNG',
  'BRAND',
  'CHEMISCHE_STOFFE',
  'DURCHBRUCH',
  'EINSTURZ',
  'ELEKTRIZITAET',
  'ERKRANKUNG_VERLETZUNG',
  'ERTRINKEN',
  'EXPLOSION',
] as const;

export const SCHUTZOBJEKTE = ['MENSCHEN', 'TIERE', 'UMWELT', 'SACHWERTE', 'EINSATZKRAEFTE'] as const;

export const WARNSTUFEN = ['KEINE', 'NIEDRIG', 'MITTEL', 'HOCH', 'AKUT'] as const;

export type GefahrentypValue = (typeof GEFAHRENTYPEN)[number];
export type SchutzobjektValue = (typeof SCHUTZOBJEKTE)[number];
export type WarnstufeValue = (typeof WARNSTUFEN)[number];

export const GEFAHRENTYP_LABELS: Record<GefahrentypValue, string> = {
  ATEMGIFTE: 'Atemgifte',
  ANGSTREAKTION: 'Angstreaktion',
  AUSBREITUNG: 'Ausbreitung',
  ATOMARE_STRAHLUNG: 'Atomare Strahlung',
  CHEMISCHE_STOFFE: 'Chemische Stoffe',
  ERKRANKUNG_VERLETZUNG: 'Erkrankung/Verletzung',
  EXPLOSION: 'Explosion',
  ELEKTRIZITAET: 'Elektrizität',
  EINSTURZ: 'Einsturz',
  ABSTURZ: 'Absturz',
  BRAND: 'Brand',
  DURCHBRUCH: 'Durchbruch',
  ERTRINKEN: 'Ertrinken',
};

export const GEFAHRENTYP_KUERZEL: Record<GefahrentypValue, string> = {
  ATEMGIFTE: 'A',
  ANGSTREAKTION: 'A',
  AUSBREITUNG: 'A',
  ATOMARE_STRAHLUNG: 'A',
  CHEMISCHE_STOFFE: 'C',
  ERKRANKUNG_VERLETZUNG: 'E',
  EXPLOSION: 'E',
  ELEKTRIZITAET: 'E',
  EINSTURZ: 'E',
  ABSTURZ: 'A',
  BRAND: 'B',
  DURCHBRUCH: 'D',
  ERTRINKEN: 'E',
};

export const SCHUTZOBJEKT_LABELS: Record<SchutzobjektValue, string> = {
  MENSCHEN: 'Menschen',
  TIERE: 'Tiere',
  UMWELT: 'Umwelt',
  SACHWERTE: 'Sachwerte',
  EINSATZKRAEFTE: 'Einsatzkräfte',
};

export const WARNSTUFE_LABELS: Record<WarnstufeValue, string> = {
  KEINE: 'Keine',
  NIEDRIG: 'Niedrig',
  MITTEL: 'Mittel',
  HOCH: 'Hoch',
  AKUT: 'Akut',
};

/** Schutzobjekte Sektion 1: "Welche Gefahren sind erkannt?" */
export const SCHUTZOBJEKTE_ERKANNT: SchutzobjektValue[] = ['MENSCHEN', 'TIERE', 'UMWELT', 'SACHWERTE'];

/** Schutzobjekte Sektion 2: "Vor welchen Gefahren müssen sich Einsatzkräfte schützen?" */
export const SCHUTZOBJEKTE_EINSATZKRAEFTE: SchutzobjektValue[] = ['EINSATZKRAEFTE'];

/**
 * Ungültige Kombinationen: Gefahrentypen, die für ein Schutzobjekt keinen Sinn ergeben.
 *
 * Sachwerte: können nicht in Panik geraten, nicht atmen, nicht erkranken, nicht ertrinken
 * Umwelt: kann nicht in Panik geraten, nicht erkranken, nicht ertrinken
 */
const DISABLED_COMBINATIONS: Partial<Record<SchutzobjektValue, Set<GefahrentypValue>>> = {
  SACHWERTE: new Set(['ANGSTREAKTION', 'ATEMGIFTE', 'ERKRANKUNG_VERLETZUNG', 'ERTRINKEN']),
  UMWELT: new Set(['ANGSTREAKTION', 'ERKRANKUNG_VERLETZUNG', 'ERTRINKEN']),
};

/** Prüft ob eine Kombination aus Gefahrentyp und Schutzobjekt sinnvoll ist */
export function isKombinationGueltig(typ: GefahrentypValue, objekt: SchutzobjektValue): boolean {
  return !DISABLED_COMBINATIONS[objekt]?.has(typ);
}

export const updateBewertungSchema = z.object({
  gefahrentyp: z.enum(GEFAHRENTYPEN),
  schutzobjekt: z.enum(SCHUTZOBJEKTE),
  warnstufe: z.enum(WARNSTUFEN),
  beschreibung: z.string().max(2000).optional(),
  gemeldetVon: z.string().max(255).optional(),
});
