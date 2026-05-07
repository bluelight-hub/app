import { KontextSnapshot } from '../kontext-snapshot.vo';

const validRaw = {
  schemaVersion: 1 as const,
  snapshotAt: '2026-05-06T10:30:00.000+02:00',
  einsatzId: 'cl9einsatz12345678901234',
  einheitId: 'cl9einheit12345678901234a',
  gefaehrdungsbeurteilung: {
    versionId: 'cl9gbversion123456789012',
    version: 1,
    gueltigVon: '2026-05-01T08:00:00.000+02:00',
    items: [{ title: 'Glatteis' }],
  },
  aktivePsaProfile: [
    {
      id: 'cl9psa1234567890123456789',
      profil: 'BASIS' as const,
      gueltigVon: '2026-05-01T08:00:00.000+02:00',
      gueltigBis: null,
      begruendung: 'Routine',
      propagationGroupId: 'cl9pg12345678901234567890',
    },
  ],
  sicherheitsregeln: [],
};

describe('KontextSnapshot VO (Story 5.2 AC2)', () => {
  it('(1) create() akzeptiert valide V1-Shape', () => {
    const result = KontextSnapshot.create(validRaw);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.schemaVersion).toBe(1);
    expect(result.value!.gefBeurteilungVersionId).toBe('cl9gbversion123456789012');
  });

  it('(2) create() lehnt nicht-V1-konformen Input mit `ValidationFailed:KontextSnapshot:SchemaParseError`-Sentinel ab', () => {
    const result = KontextSnapshot.create({ ...validRaw, schemaVersion: 2 });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^ValidationFailed:KontextSnapshot:SchemaParseError:/);
  });

  it('(3) reconstitute() akzeptiert valide V1-Shape', () => {
    const result = KontextSnapshot.reconstitute(validRaw);
    expect(result.isSuccess).toBe(true);
  });

  it('(4) reconstitute() liefert `InfrastructureError:KontextSnapshotCorrupt`-Sentinel bei korruptem Input', () => {
    const result = KontextSnapshot.reconstitute({ broken: true });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:KontextSnapshotCorrupt:/);
  });

  it('(5) toJSON() liefert eine Deep-Copy — externe Mutation ändert VO-Zustand nicht', () => {
    const vo = KontextSnapshot.create(validRaw).value!;
    const copy = vo.toJSON();
    copy.aktivePsaProfile[0]!.begruendung = 'mutiert';
    const fresh = vo.toJSON();
    expect(fresh.aktivePsaProfile[0]!.begruendung).toBe('Routine');
  });

  it('(6) gefBeurteilungVersionId ist `null` bei Snapshot ohne Beurteilung', () => {
    const result = KontextSnapshot.create({ ...validRaw, gefaehrdungsbeurteilung: null });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.gefBeurteilungVersionId).toBeNull();
  });
});
