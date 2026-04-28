import { PsaProfil } from '@/generated/prisma/enums';

/**
 * Ein einzelnes Ausrüstungs-Item innerhalb einer Profil-Checkliste.
 *
 * - `id` ist global eindeutig über alle Profile (kebab-case, profil-präfixiert).
 * - `label` wird im UI gerendert und in die Lücken-Meldung-Audit-Trail
 *   übernommen (Story 3.6).
 */
export interface AusruestungsItem {
  readonly id: string;
  readonly label: string;
  readonly hinweis?: string;
}

/**
 * Ausrüstungs-Checkliste eines PSA-Profils. MVP-Statisch hinterlegt
 * (FR13); ein Admin-Editor folgt in Phase 2 (FR16).
 */
export interface AusruestungsCheckliste {
  readonly profil: PsaProfil;
  readonly items: readonly AusruestungsItem[];
}

/**
 * Statisches Mapping `PsaProfil → AusruestungsCheckliste` (FR13 MVP).
 *
 * **Begründung Backend-Source-of-Truth:** Das Mapping lebt im Backend, weil
 * (a) FR16 (Phase 2) den Admin-Editor verlangt → spätere REST-Pflege erwartet
 * die Daten serverseitig; (b) der `KontextSnapshotBuilder` (Epic 5) braucht
 * die Checkliste zum Vorfall-Zeitpunkt einfrieren zu können.
 *
 * **Sync-Pflicht:** Eine Frontend-Spiegel-Konstante in
 * `packages/frontend/src/features/eigenschutz/constants/ausruestungs-checkliste.constants.ts`
 * MUSS strukturell und inhaltlich identisch sein (Item-IDs + Labels). Ein
 * Sync-Test in `__tests__/ausruestungs-checkliste-sync.spec.ts` schützt vor Drift.
 */
export const AUSRUESTUNGS_CHECKLISTEN: Readonly<Record<PsaProfil, AusruestungsCheckliste>> = {
  [PsaProfil.BASIS]: {
    profil: PsaProfil.BASIS,
    items: [
      { id: 'basis-warnweste', label: 'Warnweste' },
      { id: 'basis-helm', label: 'Schutzhelm' },
      { id: 'basis-sicherheitsschuhe', label: 'Sicherheitsschuhe S3' },
    ],
  },
  [PsaProfil.INFEKTION]: {
    profil: PsaProfil.INFEKTION,
    items: [
      { id: 'infektion-ffp2-maske', label: 'FFP2/3-Maske' },
      { id: 'infektion-schutzbrille', label: 'Schutzbrille' },
      { id: 'infektion-einmalkittel', label: 'Einmal-Schutzkittel' },
      { id: 'infektion-einmalhandschuhe', label: 'Einmalhandschuhe Nitril' },
    ],
  },
  [PsaProfil.VU]: {
    profil: PsaProfil.VU,
    items: [
      { id: 'vu-helm', label: 'Schutzhelm mit Visier' },
      { id: 'vu-warnweste', label: 'Warnweste EN 471' },
      { id: 'vu-schnittfeste-handschuhe', label: 'Schnittfeste Handschuhe' },
    ],
  },
  [PsaProfil.CBRN_PATIENT]: {
    profil: PsaProfil.CBRN_PATIENT,
    items: [
      { id: 'cbrn-fluessigkeitsdichter-schutzanzug', label: 'Flüssigkeitsdichter Schutzanzug' },
      { id: 'cbrn-chemikalien-handschuhe', label: 'Chemikalien-Handschuhe' },
      { id: 'cbrn-schutzbrille', label: 'Schutzbrille / Visier' },
      { id: 'cbrn-ffp3-maske', label: 'FFP3-Maske' },
    ],
  },
  [PsaProfil.VOLLSCHUTZ]: {
    profil: PsaProfil.VOLLSCHUTZ,
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
 * unbekanntem Profil — defensives Verhalten für den `KontextSnapshotBuilder`
 * (Story 5.2), der einen unentdeckten Profil-Wert nicht stillschweigend
 * mit einer leeren Liste persistieren darf.
 */
export function getAusruestungsCheckliste(profil: PsaProfil): AusruestungsCheckliste {
  const checkliste = AUSRUESTUNGS_CHECKLISTEN[profil];
  if (!checkliste) {
    throw new Error(`Unbekanntes PSA-Profil: ${String(profil)} — keine Ausrüstungs-Checkliste hinterlegt.`);
  }
  return checkliste;
}

/**
 * Aggregiert die Item-Listen mehrerer aktiver Profile zu einer einzigen
 * Liste. De-Dupliziert nach `id`; Reihenfolge ist die Eingabe-Reihenfolge
 * (Profil → erste Item-Reihenfolge → nachgelagerte Profile fügen nur
 * neue IDs an).
 *
 * Aktuell überschneiden sich die Item-IDs zwischen den Profilen nicht;
 * die De-Duplikation ist defensiv für künftige Erweiterungen.
 */
export function buildAggregierteCheckliste(profile: readonly PsaProfil[]): readonly AusruestungsItem[] {
  const seen = new Set<string>();
  const result: AusruestungsItem[] = [];
  for (const profil of profile) {
    const items = getAusruestungsCheckliste(profil).items;
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}
