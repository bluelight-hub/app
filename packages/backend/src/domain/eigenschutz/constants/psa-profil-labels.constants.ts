import type { PsaProfil } from '@/generated/prisma/enums';

/**
 * Lesbare deutsche Labels für die `PsaProfil`-Enum-Werte.
 *
 * Verwendung in user-facing Texten (ETB-Einträge, Audit-Exporte, Server-
 * generierte Push-Texte). Analog zu `FMS_STATUS_LABELS` im Kräfte-Kontext.
 *
 * Das UI besitzt eine eigene Frontend-Metadaten-Map mit zusätzlichen Feldern
 * (Icon, Kurzbeschreibung, Tailwind-Klassen) — siehe
 * `frontend/src/features/eigenschutz/constants/psa-profil.constants.ts`.
 * Die Labels MÜSSEN zwischen Backend- und Frontend-Quelle synchron bleiben.
 *
 * @see FMS_STATUS_LABELS für das Vorbild im Kräfte-Kontext.
 */
export const PSA_PROFIL_LABELS: Readonly<Record<PsaProfil, string>> = {
  BASIS: 'Basis',
  INFEKTION: 'Infektion',
  VU: 'Verkehrsunfall',
  CBRN_PATIENT: 'CBRN-Patient',
  VOLLSCHUTZ: 'Vollschutz',
};

/**
 * Defensiver Fallback, falls ein Wert auftaucht, der nicht im Enum steht
 * (Defense in Depth — sollte nicht passieren, da Prisma-Enum typisiert ist).
 */
export const PSA_PROFIL_FALLBACK_LABEL = 'Unbekanntes PSA-Profil' as const;

/**
 * Liefert das deutsche Label zu einem `PsaProfil` oder den Fallback.
 */
export function psaProfilLabel(profil: PsaProfil | string | undefined | null): string {
  if (profil && profil in PSA_PROFIL_LABELS) {
    return PSA_PROFIL_LABELS[profil as PsaProfil];
  }
  return PSA_PROFIL_FALLBACK_LABEL;
}
