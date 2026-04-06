import { z } from 'zod';

export const GEFAHRENTYPEN = [
  'ATEMGIFTE',
  'ANGSTREAKTION',
  'AUSBREITUNG',
  'ATOMARE_STRAHLUNG',
  'CHEMISCHE_STOFFE',
  'ERKRANKUNG_VERLETZUNG',
  'EXPLOSION',
  'ELEKTRIZITAET',
  'EINSTURZ',
  'ABSTURZ',
  'BRAND',
  'DURCHBRUCH',
  'ERTRINKEN',
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
  ABSTURZ: '',
  BRAND: '',
  DURCHBRUCH: '',
  ERTRINKEN: '',
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

export const updateBewertungSchema = z.object({
  gefahrentyp: z.enum(GEFAHRENTYPEN),
  schutzobjekt: z.enum(SCHUTZOBJEKTE),
  warnstufe: z.enum(WARNSTUFEN),
  beschreibung: z.string().max(2000).optional(),
  gemeldetVon: z.string().max(255).optional(),
});
