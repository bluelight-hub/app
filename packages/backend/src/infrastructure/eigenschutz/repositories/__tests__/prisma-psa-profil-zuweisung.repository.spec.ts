/**
 * Unit-Tests für `PrismaPsaProfilZuweisungRepository` (Story 3.1).
 *
 * Mock-basiert — der echte Postgres-Concurrency-Test (Lost-Update auf
 * `updateMany WHERE version = expectedVersion` und Partial-Unique-Index
 * `psa_profil_zuweisungen_active_unique`) läuft erst mit dem Test-Harness
 * (Action-Item B3 vor Story 3.9). Hier prüfen wir das Branch-Verhalten
 * deterministisch.
 */

import { PsaProfilZuweisung } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaPsaProfilZuweisungRepository } from '../prisma-psa-profil-zuweisung.repository';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyui00777';
const ZUWEISUNG_ID = 'clw3h8x9y0000qwertyuipsa001';

function createActiveAggregate(): PsaProfilZuweisung {
  const result = PsaProfilZuweisung.create({
    id: ZUWEISUNG_ID,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    profil: 'BASIS',
    begruendung: 'Aktivierung Routine BASIS',
    aktiviertVonUserId: USER_ID,
    propagationGroupId: PROPAGATION_GROUP_ID,
    gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
  });
  if (result.isFailure || !result.value) throw new Error(`Setup defekt: ${result.error}`);
  return result.value;
}

function buildRow(overrides: Partial<{ id: string; einsatzId: string; einheitId: string; profil: string; gueltigVon: Date; gueltigBis: Date | null; version: number }> = {}) {
  return {
    id: ZUWEISUNG_ID,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    profil: 'BASIS' as const,
    gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
    gueltigBis: null as Date | null,
    aktiviertVonUserId: USER_ID,
    begruendung: 'DB-Bestand',
    propagationGroupId: PROPAGATION_GROUP_ID,
    version: 1,
    ...overrides,
  };
}

describe('PrismaPsaProfilZuweisungRepository.saveActivation()', () => {
  it('legt aktive Row an, wenn keine bestehende aktive Zuweisung existiert', async () => {
    const logger = createMockLogger();
    const create = jest.fn().mockResolvedValue(undefined);
    const findFirst = jest.fn().mockResolvedValue(null);
    const tx = { psaProfilZuweisung: { create, findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const aggregate = createActiveAggregate();
    const result = await repo.saveActivation(aggregate, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, profil: 'BASIS', gueltigBis: null },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: aggregate.id.value,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        profil: 'BASIS',
        gueltigBis: null,
        aktiviertVonUserId: USER_ID,
        propagationGroupId: PROPAGATION_GROUP_ID,
        version: 1,
      }),
    });
  });

  it('liefert DUPLICATE-Sentinel, wenn Application-Guard eine bestehende aktive Row findet', async () => {
    const logger = createMockLogger();
    const create = jest.fn();
    const findFirst = jest.fn().mockResolvedValue({ id: 'other-row' });
    const tx = { psaProfilZuweisung: { create, findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const result = await repo.saveActivation(createActiveAggregate(), tx as never);

    expect(result.isFailure).toBe(true);
    // Story 3.9 (AC1): Sentinel trägt zuweisungId der bereits aktiven Row
    // mit, damit der Frontend-Folgecall sie referenzieren kann.
    expect(result.error).toBe('ConflictDetected:DuplicateActivePsaProfilZuweisung:zuweisungId=other-row');
    expect(create).not.toHaveBeenCalled();
  });

  it('mappt P2002 (Postgres-Partial-Unique-Race) auf den DUPLICATE-Sentinel', async () => {
    const logger = createMockLogger();
    const create = jest.fn().mockRejectedValue({ code: 'P2002' });
    const findFirst = jest.fn().mockResolvedValue(null);
    const tx = { psaProfilZuweisung: { create, findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const result = await repo.saveActivation(createActiveAggregate(), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:DuplicateActivePsaProfilZuweisung');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('verpackt unbekannte DB-Fehler in InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockRejectedValue(new Error('connection-lost'));
    const tx = { psaProfilZuweisung: { create, findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const result = await repo.saveActivation(createActiveAggregate(), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:PsaProfilZuweisung:connection-lost');
  });
});

describe('PrismaPsaProfilZuweisungRepository.closeActiveZuweisung()', () => {
  it('schließt Row erfolgreich (count===1)', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = { psaProfilZuweisung: { updateMany, findUnique: jest.fn() } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const aggregate = createActiveAggregate();
    const deactivateResult = aggregate.deactivate({
      expectedVersion: 1,
      userId: USER_ID,
      begruendung: 'Deaktivierung Routine',
      propagationGroupId: 'clw3h8x9y0000qwertyui00888',
      gueltigBis: new Date('2026-04-24T11:00:00.000Z'),
    });
    expect(deactivateResult.isSuccess).toBe(true);

    const result = await repo.closeActiveZuweisung(aggregate, 1, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: aggregate.id.value, einsatzId: EINSATZ_ID, version: 1, gueltigBis: null },
      data: expect.objectContaining({
        gueltigBis: aggregate.gueltigBis,
        version: 2,
      }),
    });
  });

  it('liefert ConflictDetected mit current-Version bei Lost-Update (count===0, Row vorhanden)', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findUnique = jest.fn().mockResolvedValue(buildRow({ version: 5 }));
    const tx = { psaProfilZuweisung: { updateMany, findUnique } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const aggregate = createActiveAggregate();
    const deactivateResult = aggregate.deactivate({
      expectedVersion: 1,
      userId: USER_ID,
      begruendung: 'Versuch unter Race',
      propagationGroupId: PROPAGATION_GROUP_ID,
    });
    expect(deactivateResult.isSuccess).toBe(true); // P-25: Setup-Sicherheit
    const result = await repo.closeActiveZuweisung(aggregate, 1, tx as never);

    expect(result.isFailure).toBe(true);
    // Story 3.9 (AC1): Repository-Sentinel trägt `:zuweisungId=<id>` mit; die
    // ID stammt aus `current.id` (über findUnique geladene Row → buildRow()
    // setzt id = aggregate.id.value, da unsere Mock-Row dieselbe ID nutzt).
    expect(result.error).toBe(`ConflictDetected:PsaProfilZuweisung:current=5:zuweisungId=${aggregate.id.value}`);
  });

  it('liefert NotFound, wenn die Row in der Zwischenzeit verschwunden / fremd ist', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findUnique = jest.fn().mockResolvedValue(null);
    const tx = { psaProfilZuweisung: { updateMany, findUnique } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const aggregate = createActiveAggregate();
    const deactivateResult = aggregate.deactivate({ expectedVersion: 1, userId: USER_ID, begruendung: 'gone', propagationGroupId: PROPAGATION_GROUP_ID });
    expect(deactivateResult.isSuccess).toBe(true); // P-25
    const result = await repo.closeActiveZuweisung(aggregate, 1, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:PsaProfilZuweisung');
  });

  it('liefert NotFound bei Cross-Einsatz-Hit', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findUnique = jest.fn().mockResolvedValue(buildRow({ einsatzId: 'anderer-einsatz' }));
    const tx = { psaProfilZuweisung: { updateMany, findUnique } };
    const repo = new PrismaPsaProfilZuweisungRepository({} as never, logger);

    const aggregate = createActiveAggregate();
    const deactivateResult = aggregate.deactivate({ expectedVersion: 1, userId: USER_ID, begruendung: 'fremder Einsatz', propagationGroupId: PROPAGATION_GROUP_ID });
    expect(deactivateResult.isSuccess).toBe(true); // P-25
    const result = await repo.closeActiveZuweisung(aggregate, 1, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:PsaProfilZuweisung');
  });

  // P-2: Echter Postgres-Concurrency-Test wartet auf Story-3.9-Harness (Action
  // Item B3 aus Epic-2-Retro). Bis dahin als `.skip` markiert, damit das
  // Skelett im Test-File sichtbar bleibt und beim Aufräumen sofort
  // aktivierbar ist.
  it.skip('(Story 3.1 AC4) Lost-Update unter echter Postgres-Last — harness blocked, siehe deferred-work.md', async () => {
    // Erwartet: zwei parallele `closeActiveZuweisung` mit derselben
    // `expectedVersion`. Eine Update-Transaktion landet, die zweite trifft
    // `count === 0` und liefert `ConflictDetected:PsaProfilZuweisung:current=<n>`.
    // Story 3.9 baut den Postgres-Test-Harness — dann hier verkabeln.
  });

  it.skip('(Story 3.1 AC8) Doppelaktivierung unter echter Postgres-Last — harness blocked, siehe deferred-work.md', async () => {
    // Erwartet: zwei parallele `saveActivation` für gleiche
    // `(einsatzId, einheitId, profil)`-Kombination. Einer landet, der zweite
    // erhält `ConflictDetected:DuplicateActivePsaProfilZuweisung` über P2002
    // (Partial-Unique-Index) ODER über den Application-Guard.
  });
});

describe('PrismaPsaProfilZuweisungRepository.findActiveByEinheit()', () => {
  it('liefert Aggregate bei Hit (gueltigBis IS NULL)', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(buildRow());
    const prisma = { psaProfilZuweisung: { findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository(prisma as never, logger);

    const result = await repo.findActiveByEinheit(EINSATZ_ID, EINHEIT_ID, 'BASIS');

    expect(result.isSuccess).toBe(true);
    expect(result.value).not.toBeNull();
    expect(result.value!.profil).toBe('BASIS');
    expect(result.value!.istAktiv).toBe(true);
  });

  it('liefert null wenn keine aktive Row existiert', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { psaProfilZuweisung: { findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository(prisma as never, logger);

    const result = await repo.findActiveByEinheit(EINSATZ_ID, EINHEIT_ID, 'BASIS');

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('liefert InfrastructureError-Sentinel bei korrupter Row (version=0)', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(buildRow({ version: 0 }));
    const prisma = { psaProfilZuweisung: { findFirst } };
    const repo = new PrismaPsaProfilZuweisungRepository(prisma as never, logger);

    const result = await repo.findActiveByEinheit(EINSATZ_ID, EINHEIT_ID, 'BASIS');

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:ReconstitutePsaProfilZuweisung');
  });
});

describe('PrismaPsaProfilZuweisungRepository.findByZuweisungId()', () => {
  it('isoliert Cross-Einsatz-Hits (gibt null zurück)', async () => {
    const logger = createMockLogger();
    const findUnique = jest.fn().mockResolvedValue(buildRow({ einsatzId: 'anderer-einsatz' }));
    const prisma = { psaProfilZuweisung: { findUnique } };
    const repo = new PrismaPsaProfilZuweisungRepository(prisma as never, logger);

    const result = await repo.findByZuweisungId(ZUWEISUNG_ID, EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });
});

describe('PrismaPsaProfilZuweisungRepository.findActiveProfileByEinheit() [Read]', () => {
  it('liefert nur aktive Rows als ReadRow-Liste', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([buildRow({ profil: 'BASIS' }), buildRow({ profil: 'INFEKTION', id: 'b' })]);
    const prisma = { psaProfilZuweisung: { findMany } };
    const repo = new PrismaPsaProfilZuweisungRepository(prisma as never, logger);

    const result = await repo.findActiveProfileByEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.map((r) => r.profil)).toEqual(['BASIS', 'INFEKTION']);
    expect(findMany).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, gueltigBis: null },
      orderBy: [{ profil: 'asc' }, { gueltigVon: 'asc' }],
    });
  });
});
