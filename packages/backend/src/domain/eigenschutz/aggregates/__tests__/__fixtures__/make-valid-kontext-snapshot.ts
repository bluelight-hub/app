/**
 * Story 5.2 — Test-Fixture-Helper für einen V1-konformen `kontextSnapshot`.
 *
 * Wird sowohl von `EigenschutzVorfall`-Aggregate-Tests als auch vom
 * Handler-/Builder-Test-Setup genutzt, damit der Snapshot-Vertrag aus AC1 in
 * allen Test-Fixtures deckungsgleich ist. Override-Pfad pro Feld via
 * Partial-Spread, damit Edge-Cases (z. B. `gefaehrdungsbeurteilung: null`)
 * gezielt abgebildet werden können.
 */
export interface MakeValidKontextSnapshotOverrides {
  schemaVersion?: 1;
  snapshotAt?: string;
  einsatzId?: string;
  einheitId?: string;
  gefaehrdungsbeurteilung?: {
    versionId: string;
    version: number;
    gueltigVon: string;
    items: Array<{ title: string; [k: string]: unknown }>;
  } | null;
  aktivePsaProfile?: Array<{
    id: string;
    profil: 'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ';
    gueltigVon: string;
    gueltigBis: string | null;
    begruendung: string;
    propagationGroupId: string;
  }>;
  sicherheitsregeln?: Array<{
    regelId: string;
    versionId: string;
    version: number;
    titel: string;
    inhalt: string;
    einsatzweit: boolean;
    einheitIds: string[];
    gueltigVon: string;
  }>;
}

export function makeValidKontextSnapshot(overrides: MakeValidKontextSnapshotOverrides = {}) {
  return {
    schemaVersion: 1 as const,
    snapshotAt: '2026-05-06T10:00:00.000+00:00',
    einsatzId: 'clw3h8x9y0000qwertyui05001',
    einheitId: 'clw3h8x9y0000qwertyui05002',
    gefaehrdungsbeurteilung: null,
    aktivePsaProfile: [],
    sicherheitsregeln: [],
    ...overrides,
  };
}
