import type { IconType } from 'react-icons';
import { PiBandaids, PiBiohazard, PiHardHat, PiShield, PiVirus } from 'react-icons/pi';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';

/**
 * UI-Metadaten pro PSA-Profil (Story 3.1).
 *
 * **Farben:** Tailwind-Klassen für Chip-Hintergrund + Border bei aktivem
 * Zustand (UX-Spec PSA-Profil — high-contrast Severity-Tokens, Story 7.1
 * Dark-Mode-Verifikation pending).
 *
 * **Icons:** Phosphor-Duotone (über `react-icons/pi`).
 */
export interface PsaProfilMeta {
  readonly label: string;
  readonly kurzbeschreibung: string;
  readonly icon: IconType;
  readonly chipColorClass: string;
  readonly chipColorActiveClass: string;
}

export const PSA_PROFIL_REIHENFOLGE: readonly PsaProfilValue[] = ['BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ'];

export const PSA_PROFIL_META: Readonly<Record<PsaProfilValue, PsaProfilMeta>> = {
  BASIS: {
    label: 'Basis',
    kurzbeschreibung: 'Standard-Schutz für aktive Einheiten — Warnweste, Helm, festes Schuhwerk.',
    icon: PiBandaids,
    chipColorClass: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    chipColorActiveClass: 'border-slate-500 bg-slate-200 text-slate-900 dark:border-slate-400 dark:bg-slate-700 dark:text-white',
  },
  INFEKTION: {
    label: 'Infektion',
    kurzbeschreibung: 'Schutz vor Aerosol/Tröpfchen-Übertragung — FFP2/3, Schutzbrille, Einmalkittel.',
    icon: PiVirus,
    chipColorClass: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100',
    chipColorActiveClass: 'border-amber-500 bg-amber-100 text-amber-900 dark:border-amber-400 dark:bg-amber-900 dark:text-amber-50',
  },
  VU: {
    label: 'Verkehrsunfall',
    kurzbeschreibung: 'Verkehrsunfall-Einsatz — Helm, Warnweste, schnittfeste Handschuhe.',
    icon: PiHardHat,
    chipColorClass: 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-600 dark:bg-orange-950 dark:text-orange-100',
    chipColorActiveClass: 'border-orange-500 bg-orange-100 text-orange-900 dark:border-orange-400 dark:bg-orange-900 dark:text-orange-50',
  },
  CBRN_PATIENT: {
    label: 'CBRN-Patient',
    kurzbeschreibung: 'Verdacht auf CBRN-Kontamination — Schutzanzug, FFP3, Spritzschutz.',
    icon: PiBiohazard,
    chipColorClass: 'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-100',
    chipColorActiveClass: 'border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900 dark:text-red-50',
  },
  VOLLSCHUTZ: {
    label: 'Vollschutz',
    kurzbeschreibung: 'Vollschutzanzug für nicht-Patientenkontakt-Tätigkeiten in CBRN-Lage.',
    icon: PiShield,
    chipColorClass: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-600 dark:bg-rose-950 dark:text-rose-100',
    chipColorActiveClass: 'border-rose-500 bg-rose-100 text-rose-900 dark:border-rose-400 dark:bg-rose-900 dark:text-rose-50',
  },
};
