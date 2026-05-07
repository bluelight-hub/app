// Relativer Pfad in Shared-Source — Backend ist (noch) nicht ESM-migriert,
// SWC transpiliert die TS-Quelle direkt (Pattern Story 3.11 + 2.6).
import { EigenschutzKontextSnapshotV1 } from '../../../../../shared/src/schemas/eigenschutz/eigenschutz-snapshot.schema';

/**
 * Story 5.2 AC1 — Vertrags-Schema `EigenschutzKontextSnapshotV1`.
 *
 * Verifiziert: happy-path, schemaVersion-Mismatch, additional-property-Reject,
 * `gefaehrdungsbeurteilung: null`-Case sowie strict-mode-Verletzungen in
 * verschachtelten Sub-Schemas.
 */
describe('EigenschutzKontextSnapshotV1 (Story 5.2 AC1)', () => {
  const validSnapshot = {
    schemaVersion: 1 as const,
    snapshotAt: '2026-05-06T10:30:00.000+02:00',
    einsatzId: 'cl9einsatz12345678901234',
    einheitId: 'cl9einheit12345678901234a',
    gefaehrdungsbeurteilung: {
      versionId: 'cl9gbversion123456789012',
      version: 1,
      gueltigVon: '2026-05-01T08:00:00.000+02:00',
      items: [
        {
          title: 'Glatteis im Eingangsbereich',
          eintritt: 'GELEGENTLICH' as const,
          schaden: 'GERING' as const,
          risikoklasse: 'GELB' as const,
        },
      ],
    },
    aktivePsaProfile: [
      {
        id: 'cl9psa1234567890123456789',
        profil: 'BASIS' as const,
        gueltigVon: '2026-05-01T08:00:00.000+02:00',
        gueltigBis: null,
        begruendung: 'Routine-Aktivierung',
        propagationGroupId: 'cl9pg12345678901234567890',
      },
    ],
    sicherheitsregeln: [
      {
        regelId: 'cl9regel1234567890123456a',
        versionId: 'cl9regelv12345678901234ab',
        version: 1,
        titel: 'Reflexweste tragen',
        inhalt: 'Bei Außeneinsätzen Pflicht.',
        einsatzweit: true,
        einheitIds: [],
        gueltigVon: '2026-05-01T08:00:00.000+02:00',
      },
    ],
  };

  it('akzeptiert einen vollständigen, valide-konformen Snapshot', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse(validSnapshot);
    expect(result.success).toBe(true);
  });

  it('akzeptiert `gefaehrdungsbeurteilung: null` (Einheit ohne Beurteilung)', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse({
      ...validSnapshot,
      gefaehrdungsbeurteilung: null,
    });
    expect(result.success).toBe(true);
  });

  it('lehnt einen Snapshot mit schemaVersion !== 1 ab', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse({
      ...validSnapshot,
      schemaVersion: 2,
    });
    expect(result.success).toBe(false);
  });

  it('lehnt unbekannte Top-Level-Properties ab (.strict)', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse({
      ...validSnapshot,
      unbekanntesFeld: 'darf nicht durchrutschen',
    });
    expect(result.success).toBe(false);
  });

  it('lehnt einen leeren `{}`-Snapshot ab (kein 5.1-Stub)', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse({});
    expect(result.success).toBe(false);
  });

  it('lehnt unbekannte Properties in einem PSA-Profil ab (strict-mode tief)', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse({
      ...validSnapshot,
      aktivePsaProfile: [
        {
          ...validSnapshot.aktivePsaProfile[0],
          unbekannt: 'X',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('lehnt einen Snapshot mit ungültigem ISO-8601-`snapshotAt` ab', () => {
    const result = EigenschutzKontextSnapshotV1.safeParse({
      ...validSnapshot,
      snapshotAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});
