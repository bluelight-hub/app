/**
 * Die 13 Gefahrentypen der Gefahrenmatrix (4A-C-5E + Absturz/Brand/Durchbruch/Ertrinken).
 */
export enum Gefahrentyp {
  ATEMGIFTE = 'ATEMGIFTE',
  ANGSTREAKTION = 'ANGSTREAKTION',
  AUSBREITUNG = 'AUSBREITUNG',
  ATOMARE_STRAHLUNG = 'ATOMARE_STRAHLUNG',
  CHEMISCHE_STOFFE = 'CHEMISCHE_STOFFE',
  ERKRANKUNG_VERLETZUNG = 'ERKRANKUNG_VERLETZUNG',
  EXPLOSION = 'EXPLOSION',
  ELEKTRIZITAET = 'ELEKTRIZITAET',
  EINSTURZ = 'EINSTURZ',
  ABSTURZ = 'ABSTURZ',
  BRAND = 'BRAND',
  DURCHBRUCH = 'DURCHBRUCH',
  ERTRINKEN = 'ERTRINKEN',
}

/** Kurzbezeichnung für UI-Anzeige (A/A/A/A/C/E/E/E/E/-/-/-/-) */
export const GEFAHRENTYP_KUERZEL: Record<Gefahrentyp, string> = {
  [Gefahrentyp.ATEMGIFTE]: 'A',
  [Gefahrentyp.ANGSTREAKTION]: 'A',
  [Gefahrentyp.AUSBREITUNG]: 'A',
  [Gefahrentyp.ATOMARE_STRAHLUNG]: 'A',
  [Gefahrentyp.CHEMISCHE_STOFFE]: 'C',
  [Gefahrentyp.ERKRANKUNG_VERLETZUNG]: 'E',
  [Gefahrentyp.EXPLOSION]: 'E',
  [Gefahrentyp.ELEKTRIZITAET]: 'E',
  [Gefahrentyp.EINSTURZ]: 'E',
  [Gefahrentyp.ABSTURZ]: '',
  [Gefahrentyp.BRAND]: '',
  [Gefahrentyp.DURCHBRUCH]: '',
  [Gefahrentyp.ERTRINKEN]: '',
};

/** Anzeigename für UI */
export const GEFAHRENTYP_LABEL: Record<Gefahrentyp, string> = {
  [Gefahrentyp.ATEMGIFTE]: 'Atemgifte',
  [Gefahrentyp.ANGSTREAKTION]: 'Angstreaktion',
  [Gefahrentyp.AUSBREITUNG]: 'Ausbreitung',
  [Gefahrentyp.ATOMARE_STRAHLUNG]: 'Atomare Strahlung',
  [Gefahrentyp.CHEMISCHE_STOFFE]: 'Chemische Stoffe',
  [Gefahrentyp.ERKRANKUNG_VERLETZUNG]: 'Erkrankung/Verletzung',
  [Gefahrentyp.EXPLOSION]: 'Explosion',
  [Gefahrentyp.ELEKTRIZITAET]: 'Elektrizität',
  [Gefahrentyp.EINSTURZ]: 'Einsturz',
  [Gefahrentyp.ABSTURZ]: 'Absturz',
  [Gefahrentyp.BRAND]: 'Brand',
  [Gefahrentyp.DURCHBRUCH]: 'Durchbruch',
  [Gefahrentyp.ERTRINKEN]: 'Ertrinken',
};

/** Sortierreihenfolge (4A, C, 5E, dann Zusätzliche) */
export const GEFAHRENTYP_ORDER: Gefahrentyp[] = [
  Gefahrentyp.ATEMGIFTE,
  Gefahrentyp.ANGSTREAKTION,
  Gefahrentyp.AUSBREITUNG,
  Gefahrentyp.ATOMARE_STRAHLUNG,
  Gefahrentyp.CHEMISCHE_STOFFE,
  Gefahrentyp.ERKRANKUNG_VERLETZUNG,
  Gefahrentyp.EXPLOSION,
  Gefahrentyp.ELEKTRIZITAET,
  Gefahrentyp.EINSTURZ,
  Gefahrentyp.ABSTURZ,
  Gefahrentyp.BRAND,
  Gefahrentyp.DURCHBRUCH,
  Gefahrentyp.ERTRINKEN,
];
