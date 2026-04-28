/**
 * MVP-Spiegel der Backend-Value-Object `AusruestungsCheckliste`
 * (`packages/backend/src/domain/eigenschutz/value-objects/ausruestungs-checkliste.vo.ts`).
 *
 * Phase 2 (FR16): durch generierten API-Hook ablösen — Item-Pflege
 * erfolgt admin-seitig im Backend. Bis dahin: jede Änderung am Backend-VO
 * MUSS hier gespiegelt werden (Sync-Test in `packages/backend/src/domain/
 * eigenschutz/value-objects/__tests__/ausruestungs-checkliste-sync.spec.ts`).
 */

import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';

export interface AusruestungsItem {
  readonly id: string;
  readonly label: string;
  readonly hinweis?: string;
}

export interface AusruestungsCheckliste {
  readonly profil: PsaProfilValue;
  readonly items: readonly AusruestungsItem[];
}

export const AUSRUESTUNGS_CHECKLISTEN: Readonly<Record<PsaProfilValue, AusruestungsCheckliste>> = {
  BASIS: {
    profil: 'BASIS',
    items: [
      { id: 'basis-warnweste', label: 'Warnweste' },
      { id: 'basis-helm', label: 'Schutzhelm' },
      { id: 'basis-sicherheitsschuhe', label: 'Sicherheitsschuhe S3' },
    ],
  },
  INFEKTION: {
    profil: 'INFEKTION',
    items: [
      { id: 'infektion-ffp2-maske', label: 'FFP2/3-Maske' },
      { id: 'infektion-schutzbrille', label: 'Schutzbrille' },
      { id: 'infektion-einmalkittel', label: 'Einmal-Schutzkittel' },
      { id: 'infektion-einmalhandschuhe', label: 'Einmalhandschuhe Nitril' },
    ],
  },
  VU: {
    profil: 'VU',
    items: [
      { id: 'vu-helm', label: 'Schutzhelm mit Visier' },
      { id: 'vu-warnweste', label: 'Warnweste EN 471' },
      { id: 'vu-schnittfeste-handschuhe', label: 'Schnittfeste Handschuhe' },
    ],
  },
  CBRN_PATIENT: {
    profil: 'CBRN_PATIENT',
    items: [
      { id: 'cbrn-fluessigkeitsdichter-schutzanzug', label: 'Flüssigkeitsdichter Schutzanzug' },
      { id: 'cbrn-chemikalien-handschuhe', label: 'Chemikalien-Handschuhe' },
      { id: 'cbrn-schutzbrille', label: 'Schutzbrille / Visier' },
      { id: 'cbrn-ffp3-maske', label: 'FFP3-Maske' },
    ],
  },
  VOLLSCHUTZ: {
    profil: 'VOLLSCHUTZ',
    items: [
      { id: 'vollschutz-anzug', label: 'Vollschutzanzug Typ 3' },
      { id: 'vollschutz-atemschutz', label: 'Pressluftatmer / SCBA' },
      { id: 'vollschutz-chemikalien-handschuhe', label: 'Chemikalien-Handschuhe' },
      { id: 'vollschutz-stiefel', label: 'Chemikalien-Stiefel' },
    ],
  },
};

/**
 * Liefert die Checkliste eines Profils. Wirft mit klarer Message bei
 * unbekanntem Profil — defensives Verhalten, falls ein Tag-Drift im
 * Profil-Enum dafür sorgt, dass die UI einen ungültigen Wert erhält.
 */
export function getAusruestungsCheckliste(profil: PsaProfilValue): AusruestungsCheckliste {
  const checkliste = AUSRUESTUNGS_CHECKLISTEN[profil];
  if (!checkliste) {
    throw new Error(`Unbekanntes PSA-Profil: ${String(profil)} — keine Ausrüstungs-Checkliste hinterlegt.`);
  }
  return checkliste;
}
