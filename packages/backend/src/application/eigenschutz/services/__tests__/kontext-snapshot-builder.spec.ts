import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IGefaehrdungsbeurteilungVersionRepository, IPsaProfilZuweisungReadRepository, ISicherheitsregelVersionRepository } from '@domain/eigenschutz/repositories';
import { KontextSnapshotBuilder } from '../kontext-snapshot-builder';

const EINSATZ_ID = 'cl9einsatz12345678901234';
const EINHEIT_ID = 'cl9einheit12345678901234a';
const VERSION_ID = 'cl9gbversion123456789012';
const SNAPSHOT_AT = new Date('2026-05-06T10:00:00.000Z');

function createMockLogger(): ILogger {
  return { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
}

function buildBuilder(
  overrides: Partial<{
    gefVersionRepo: IGefaehrdungsbeurteilungVersionRepository;
    psaReadRepo: IPsaProfilZuweisungReadRepository;
    sicherheitsregelVersionRepo: ISicherheitsregelVersionRepository;
  }> = {},
) {
  const gefVersionRepo: IGefaehrdungsbeurteilungVersionRepository = {
    saveInitialVersion: jest.fn(),
    saveNewVersion: jest.fn(),
    findVersionsByBeurteilung: jest.fn(),
    findVersionAtTimeForEinheit: jest.fn().mockResolvedValue(Result.ok(null)),
    ...overrides.gefVersionRepo,
  } as IGefaehrdungsbeurteilungVersionRepository;
  const psaReadRepo: IPsaProfilZuweisungReadRepository = {
    findActiveProfileByEinheit: jest.fn(),
    findActiveProfileByEinheitAtTime: jest.fn().mockResolvedValue(Result.ok([])),
    ...overrides.psaReadRepo,
  } as IPsaProfilZuweisungReadRepository;
  const sicherheitsregelVersionRepo: ISicherheitsregelVersionRepository = {
    saveInitialVersion: jest.fn(),
    saveNewVersion: jest.fn(),
    closeCurrentVersion: jest.fn(),
    findVersionsForEinheitAtTime: jest.fn().mockResolvedValue(Result.ok([])),
    ...overrides.sicherheitsregelVersionRepo,
  } as ISicherheitsregelVersionRepository;
  const logger = createMockLogger();
  return new KontextSnapshotBuilder(gefVersionRepo, psaReadRepo, sicherheitsregelVersionRepo, logger);
}

describe('KontextSnapshotBuilder (Story 5.2 AC7)', () => {
  it('(1) liefert valide V1-Shape mit Beurteilung+PSA+Regeln', async () => {
    // Bewusst unterschiedliche Werte für `gefBeurteilungId` (Parent-PK) und
    // `versionId` (Versions-Row-PK) — der Snapshot MUSS die Versions-PK als
    // `versionId` führen, weil `EigenschutzVorfall.gefBeurteilungVersionId`
    // FK auf `GefaehrdungsbeurteilungVersion.id` ist.
    const gefRow = {
      gefBeurteilungId: 'cl9beurteilungid12345678',
      versionId: VERSION_ID,
      version: 1,
      items: [{ toJSON: () => ({ title: 'Glatteis' }) }],
      gueltigVon: new Date('2026-05-01T08:00:00.000Z'),
      gueltigBis: null,
      changedFields: { created: true },
      changedByUserId: 'user-1',
      eventId: 'evt-1',
    };
    const builder = buildBuilder({
      gefVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        findVersionsByBeurteilung: jest.fn(),
        findVersionAtTimeForEinheit: jest.fn().mockResolvedValue(Result.ok(gefRow)),
      },
      psaReadRepo: {
        findActiveProfileByEinheit: jest.fn(),
        findActiveProfileByEinheitAtTime: jest.fn().mockResolvedValue(
          Result.ok([
            {
              id: 'cl9psa1234567890123456789',
              einsatzId: EINSATZ_ID,
              einheitId: EINHEIT_ID,
              profil: 'BASIS' as const,
              gueltigVon: new Date('2026-05-01T08:00:00.000Z'),
              gueltigBis: null,
              aktiviertVonUserId: 'user-1',
              begruendung: 'Routine',
              propagationGroupId: 'cl9pg12345678901234567890',
              version: 1,
            },
          ]),
        ),
      },
      sicherheitsregelVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        closeCurrentVersion: jest.fn(),
        findVersionsForEinheitAtTime: jest.fn().mockResolvedValue(
          Result.ok([
            {
              regelId: 'cl9regel1234567890123456a',
              versionId: 'cl9regelv12345678901234ab',
              version: 1,
              titel: 'Reflexweste',
              inhalt: 'Pflicht.',
              einheitId: null,
              einsatzweit: true,
              gueltigVon: new Date('2026-05-01T08:00:00.000Z'),
            },
          ]),
        ),
      },
    });

    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });

    expect(result.isSuccess).toBe(true);
    const snap = result.value!;
    expect(snap.schemaVersion).toBe(1);
    expect(snap.gefaehrdungsbeurteilung?.versionId).toBe(VERSION_ID);
    expect(snap.aktivePsaProfile).toHaveLength(1);
    expect(snap.sicherheitsregeln).toHaveLength(1);
    expect(snap.sicherheitsregeln[0]!.einsatzweit).toBe(true);
    expect(snap.sicherheitsregeln[0]!.einheitIds).toContain(EINHEIT_ID);
  });

  it('(2) liefert null-Beurteilung, wenn Repo-Treffer null', async () => {
    const builder = buildBuilder();
    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.gefaehrdungsbeurteilung).toBeNull();
    expect(result.value!.aktivePsaProfile).toEqual([]);
    expect(result.value!.sicherheitsregeln).toEqual([]);
  });

  it('(3) reicht Repo-Failure des GB-Repos als Sentinel weiter', async () => {
    const builder = buildBuilder({
      gefVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        findVersionsByBeurteilung: jest.fn(),
        findVersionAtTimeForEinheit: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:LoadVersionAtTime')),
      },
    });
    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:KontextSnapshotBuilder:GefaehrdungsbeurteilungReadFailed/);
  });

  it('(4) reicht Repo-Failure des PSA-Repos als Sentinel weiter', async () => {
    const builder = buildBuilder({
      psaReadRepo: {
        findActiveProfileByEinheit: jest.fn(),
        findActiveProfileByEinheitAtTime: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:Psa')),
      },
    });
    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:KontextSnapshotBuilder:PsaProfileReadFailed/);
  });

  it('(5) reicht Repo-Failure des Sicherheitsregel-Repos als Sentinel weiter', async () => {
    const builder = buildBuilder({
      sicherheitsregelVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        closeCurrentVersion: jest.fn(),
        findVersionsForEinheitAtTime: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:LoadSicherheitsregelVersionsAtTime')),
      },
    });
    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:KontextSnapshotBuilder:SicherheitsregelnReadFailed/);
  });

  it('(6) liefert Output-Schema-Drift-Sentinel, wenn das Builder-Output das Schema nicht passt', async () => {
    // Wir injizieren ein PSA-Row mit einer fehlenden Pflicht-Property (begruendung).
    const builder = buildBuilder({
      psaReadRepo: {
        findActiveProfileByEinheit: jest.fn(),
        findActiveProfileByEinheitAtTime: jest.fn().mockResolvedValue(
          Result.ok([
            {
              id: 'cl9psa1234567890123456789',
              einsatzId: EINSATZ_ID,
              einheitId: EINHEIT_ID,
              profil: 'BASIS' as const,
              gueltigVon: new Date('2026-05-01T08:00:00.000Z'),
              gueltigBis: null,
              aktiviertVonUserId: 'user-1',
              // Defekt: leerer Begründungstext ist zwar zulässig, aber wir
              // injizieren `null` als Forced-Drift via `as any` — Zod-Schema
              // lehnt das via `.string()` ab.
              begruendung: null as unknown as string,
              propagationGroupId: 'cl9pg12345678901234567890',
              version: 1,
            },
          ]),
        ),
      },
    });
    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^Invariant:KontextSnapshotBuilder:OutputSchemaDrift/);
  });

  it('(7) führt alle drei Repo-Reads parallel aus (Promise.all)', async () => {
    const order: string[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const builder = buildBuilder({
      gefVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        findVersionsByBeurteilung: jest.fn(),
        findVersionAtTimeForEinheit: jest.fn().mockImplementation(async () => {
          order.push('gef-start');
          await delay(20);
          order.push('gef-end');
          return Result.ok(null);
        }),
      },
      psaReadRepo: {
        findActiveProfileByEinheit: jest.fn(),
        findActiveProfileByEinheitAtTime: jest.fn().mockImplementation(async () => {
          order.push('psa-start');
          await delay(20);
          order.push('psa-end');
          return Result.ok([]);
        }),
      },
      sicherheitsregelVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        closeCurrentVersion: jest.fn(),
        findVersionsForEinheitAtTime: jest.fn().mockImplementation(async () => {
          order.push('regeln-start');
          await delay(20);
          order.push('regeln-end');
          return Result.ok([]);
        }),
      },
    });

    await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });

    // Alle drei Reads müssen vor dem ersten "end" gestartet sein —
    // sequenzielle Ausführung würde "gef-end" vor "psa-start" erzwingen.
    const firstEnd = order.findIndex((entry) => entry.endsWith('-end'));
    expect(order.slice(0, firstEnd)).toEqual(expect.arrayContaining(['gef-start', 'psa-start', 'regeln-start']));
  });

  it('(8) Code-Review-Patch (P5): fail-loud bei mehreren aktiven Versionen pro regelId', async () => {
    // Korrupte Sicherheitsregel-Version-Chain: zwei Zeilen mit gleichem
    // `regelId`, aber unterschiedlichen `versionId`s — überlappende Intervalle.
    const builder = buildBuilder({
      sicherheitsregelVersionRepo: {
        saveInitialVersion: jest.fn(),
        saveNewVersion: jest.fn(),
        closeCurrentVersion: jest.fn(),
        findVersionsForEinheitAtTime: jest.fn().mockResolvedValue(
          Result.ok([
            {
              regelId: 'cl9regel1234567890123456a',
              versionId: 'cl9regelv12345678901234ab',
              version: 1,
              titel: 'Reflexweste',
              inhalt: 'Pflicht.',
              einheitId: null,
              einsatzweit: true,
              gueltigVon: new Date('2026-05-01T08:00:00.000Z'),
            },
            {
              regelId: 'cl9regel1234567890123456a',
              versionId: 'cl9regelv12345678901234cd',
              version: 2,
              titel: 'Reflexweste neu',
              inhalt: 'Pflicht plus Helm.',
              einheitId: null,
              einsatzweit: true,
              gueltigVon: new Date('2026-05-01T08:30:00.000Z'),
            },
          ]),
        ),
      },
    });
    const result = await builder.build({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, snapshotAt: SNAPSHOT_AT, tx: {} as never });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^Invariant:KontextSnapshotBuilder:OverlappingRegelVersions:cl9regel1234567890123456a/);
  });
});
