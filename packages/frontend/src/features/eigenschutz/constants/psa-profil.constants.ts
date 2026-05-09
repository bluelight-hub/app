import type { IconType } from 'react-icons';
import { PiBandaids, PiBiohazard, PiHardHat, PiShield, PiVirus } from 'react-icons/pi';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';

/**
 * UI-Metadaten pro PSA-Profil (Story 3.1).
 *
 * **Farben:** Tailwind-Klassen für Chip-Hintergrund + Border bei aktivem
 * Zustand (UX-Spec PSA-Profil — fachliche Ring-1-Tokens aus Story 7.1).
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
    chipColorClass: 'border-psa-profile-basis-border bg-psa-profile-basis-surface text-psa-profile-basis-text',
    chipColorActiveClass: 'border-psa-profile-basis-active-border bg-psa-profile-basis-active-surface text-psa-profile-basis-active-text',
  },
  INFEKTION: {
    label: 'Infektion',
    kurzbeschreibung: 'Schutz vor Aerosol/Tröpfchen-Übertragung — FFP2/3, Schutzbrille, Einmalkittel.',
    icon: PiVirus,
    chipColorClass: 'border-psa-profile-infektion-border bg-psa-profile-infektion-surface text-psa-profile-infektion-text',
    chipColorActiveClass: 'border-psa-profile-infektion-active-border bg-psa-profile-infektion-active-surface text-psa-profile-infektion-active-text',
  },
  VU: {
    label: 'Verkehrsunfall',
    kurzbeschreibung: 'Verkehrsunfall-Einsatz — Helm, Warnweste, schnittfeste Handschuhe.',
    icon: PiHardHat,
    chipColorClass: 'border-psa-profile-vu-border bg-psa-profile-vu-surface text-psa-profile-vu-text',
    chipColorActiveClass: 'border-psa-profile-vu-active-border bg-psa-profile-vu-active-surface text-psa-profile-vu-active-text',
  },
  CBRN_PATIENT: {
    label: 'CBRN-Patient',
    kurzbeschreibung: 'Verdacht auf CBRN-Kontamination — Schutzanzug, FFP3, Spritzschutz.',
    icon: PiBiohazard,
    chipColorClass: 'border-psa-profile-cbrn-patient-border bg-psa-profile-cbrn-patient-surface text-psa-profile-cbrn-patient-text',
    chipColorActiveClass: 'border-psa-profile-cbrn-patient-active-border bg-psa-profile-cbrn-patient-active-surface text-psa-profile-cbrn-patient-active-text',
  },
  VOLLSCHUTZ: {
    label: 'Vollschutz',
    kurzbeschreibung: 'Vollschutzanzug für nicht-Patientenkontakt-Tätigkeiten in CBRN-Lage.',
    icon: PiShield,
    chipColorClass: 'border-psa-profile-vollschutz-border bg-psa-profile-vollschutz-surface text-psa-profile-vollschutz-text',
    chipColorActiveClass: 'border-psa-profile-vollschutz-active-border bg-psa-profile-vollschutz-active-surface text-psa-profile-vollschutz-active-text',
  },
};
