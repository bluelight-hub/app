/**
 * Unit-Tests für PrismaSicherheitsregelRepository (Story 2.6 Task 4).
 *
 * Rein Mock-basiert — der Integration-Pfad (echte Postgres-DB) wird in Task 7
 * als dedizierter E2E/Repo-Integration-Test nachgezogen. Hier prüfen wir die
 * Error-Mapping-Branches und die Filter-Semantik deterministisch.
 */

import { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaSicherheitsregelRepository } from '../prisma-sicherheitsregel.repository';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

function buildAggregate(overrides: { einheitId?: string | null } = {}): Sicherheitsregel {
  const result = Sicherheitsregel.create({
    einsatzId: EINSATZ_ID,
    einheitId: overrides.einheitId === undefined ? EINHEIT_ID : overrides.einheitId,
    titel: 'Alkoholverbot',
    inhalt: 'Kein Alkohol während des Einsatzes.',
    erstelltVonUserId: USER_ID,
    propagationGroupId: 'propgroup-1',
  });
  if (result.isFailure || !result.value) throw new Error(`Test-Aggregate-Erzeugung schlug fehl: ${result.error}`);
  return result.value;
}

interface SicherheitsregelTestRow {
  id: string;
  einsatzId: string;
  einheitId: string | null;
  titel: string;
  inhalt: string;
  version: number;
  erstelltAm: Date;
  erstelltVonUserId: string;
  aktualisiertAm: Date;
  aktualisiertVonUserId: string;
}

function buildRow(overrides: Partial<SicherheitsregelTestRow> = {}): SicherheitsregelTestRow {
  return {
    id: 'clw3h8x9y0000qwertyuiregel1',
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    titel: 'Alkoholverbot',
    inhalt: 'Kein Alkohol während des Einsatzes.',
    version: 1,
    erstelltAm: new Date('2026-04-24T10:00:00.000Z'),
    erstelltVonUserId: USER_ID,
    aktualisiertAm: new Date('2026-04-24T10:00:00.000Z'),
    aktualisiertVonUserId: USER_ID,
    ...overrides,
  };
}

describe('PrismaSicherheitsregelRepository.save()', () => {
  it('persistiert Haupt-Row mit Mapper-Shape und aktualisiertVonUserId-Parameter', async () => {
    const logger = createMockLogger();
    const create = jest.fn().mockResolvedValue(undefined);
    const tx = { sicherheitsregel: { create } };
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);

    const aggregate = buildAggregate();
    const result = await repo.save(aggregate, USER_ID, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: aggregate.id.value,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        titel: 'Alkoholverbot',
        inhalt: 'Kein Alkohol während des Einsatzes.',
        version: 1,
        erstelltVonUserId: USER_ID,
        aktualisiertVonUserId: USER_ID,
      }),
    });
  });

  it('loggt und liefert Result.fail bei DB-Fehler (mit InfrastructureError-Wrap)', async () => {
    const logger = createMockLogger();
    const tx = { sicherheitsregel: { create: jest.fn().mockRejectedValue(new Error('db-down')) } };
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);

    const result = await repo.save(buildAggregate(), USER_ID, tx as never);

    expect(result.isFailure).toBe(true);
    // Story 2.6 Code-Review-Patch: rohe DB-Fehlermeldungen werden in einen
    // `InfrastructureError:`-Sentinel verpackt, damit sie beim Controller-
    // Mapping nicht zufällig als 404/422 durchgehen.
    expect(result.error).toBe('InfrastructureError:Sicherheitsregel:db-down');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('PrismaSicherheitsregelRepository.findById()', () => {
  it('liefert Aggregate bei Hit im richtigen Einsatz', async () => {
    const logger = createMockLogger();
    const row = buildRow();
    const prisma = { sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(row) } };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findById(row.id, EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value?.id.value).toBe(row.id);
    expect(result.value?.einsatzId).toBe(EINSATZ_ID);
  });

  it('liefert null, wenn keine Row existiert', async () => {
    const logger = createMockLogger();
    const prisma = { sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(null) } };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findById('unknown', EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('liefert null bei Cross-Einsatz-Hit (Isolationsgrenze)', async () => {
    const logger = createMockLogger();
    const row = buildRow({ einsatzId: 'anderer-einsatz' });
    const prisma = { sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(row) } };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findById(row.id, EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('liefert Infrastructure-Sentinel bei korrupter Row (version=0)', async () => {
    const logger = createMockLogger();
    const row = buildRow({ version: 0 });
    const prisma = { sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(row) } };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findById(row.id, EINSATZ_ID);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:ReconstituteSicherheitsregel');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Reconstitution der Sicherheitsregel fehlgeschlagen'),
      expect.objectContaining({ sicherheitsregelId: row.id, reason: expect.stringMatching(/version/) }),
    );
  });
});

describe('PrismaSicherheitsregelRepository.findReadModelById()', () => {
  it('liefert ReadModel mit propagationGroupId aus Outbox-Event', async () => {
    const logger = createMockLogger();
    const row = buildRow();
    const prisma = {
      sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(row) },
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([{ aggregateId: row.id, payload: { propagationGroupId: 'propgroup-from-event' } }]),
      },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findReadModelById(row.id, EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value?.propagationGroupId).toBe('propgroup-from-event');
    expect(result.value?.aggregate.id.value).toBe(row.id);
    expect(result.value?.erstelltAm).toEqual(row.erstelltAm);
    expect(result.value?.aktualisiertVonUserId).toBe(USER_ID);
  });

  it('fällt auf regel.id zurück, wenn kein Outbox-Event gefunden wurde', async () => {
    const logger = createMockLogger();
    const row = buildRow();
    const prisma = {
      sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(row) },
      outboxEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findReadModelById(row.id, EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value?.propagationGroupId).toBe(row.id);
  });

  it('liefert null bei Cross-Einsatz', async () => {
    const logger = createMockLogger();
    const row = buildRow({ einsatzId: 'anderer-einsatz' });
    const prisma = {
      sicherheitsregel: { findUnique: jest.fn().mockResolvedValue(row) },
      outboxEvent: { findMany: jest.fn() },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findReadModelById(row.id, EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
    expect(prisma.outboxEvent.findMany).not.toHaveBeenCalled();
  });
});

describe('PrismaSicherheitsregelRepository.findActiveByEinsatz()', () => {
  it('baut Where-Clause mit versionen.some.gueltigBis=null und Sortierung', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      sicherheitsregel: { findMany },
      outboxEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findActiveByEinsatz(EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        einsatzId: EINSATZ_ID,
        versionen: { some: { gueltigBis: null } },
      },
      orderBy: [{ aktualisiertAm: 'desc' }, { erstelltAm: 'desc' }, { id: 'asc' }],
    });
  });

  it('einheitId=null: filtert auf einsatzweite Regeln (einheitId IS NULL)', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      sicherheitsregel: { findMany },
      outboxEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    await repo.findActiveByEinsatz(EINSATZ_ID, null);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ einheitId: null }) }));
  });

  it('einheitId=<id>: Union einsatzweit OR konkrete Einheit', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      sicherheitsregel: { findMany },
      outboxEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    await repo.findActiveByEinsatz(EINSATZ_ID, 'meine-einheit');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ einheitId: null }, { einheitId: 'meine-einheit' }],
        }),
      }),
    );
  });

  it('baut ReadModels mit propagationGroupId aus Batch-Outbox-Lookup', async () => {
    const logger = createMockLogger();
    const ID_A = 'clw3h8x9y0000qwertyuiregela1';
    const ID_B = 'clw3h8x9y0000qwertyuiregelb2';
    const rowA = buildRow({ id: ID_A });
    const rowB = buildRow({ id: ID_B, titel: 'Andere Regel' });
    const findMany = jest.fn().mockResolvedValue([rowA, rowB]);
    const outboxFindMany = jest.fn().mockResolvedValue([
      { aggregateId: ID_A, payload: { propagationGroupId: 'gruppe-A' } },
      { aggregateId: ID_B, payload: { propagationGroupId: 'gruppe-B' } },
    ]);
    const prisma = {
      sicherheitsregel: { findMany },
      outboxEvent: { findMany: outboxFindMany },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findActiveByEinsatz(EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(2);
    expect(result.value?.[0]?.propagationGroupId).toBe('gruppe-A');
    expect(result.value?.[1]?.propagationGroupId).toBe('gruppe-B');
    expect(outboxFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Story 2.6 Code-Review-Patch: deterministische Sekundärsortierung
        // (occurredAt + id) statt nur occurredAt — verhindert Drift bei
        // identischer ms-Zeitstempel zwischen zwei Events.
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        where: expect.objectContaining({
          aggregateId: { in: [ID_A, ID_B] },
          eventName: 'eigenschutz.sicherheitsregel_ausgerufen',
        }),
      }),
    );
  });

  it('ältestes Event gewinnt bei mehreren Events pro Regel', async () => {
    const logger = createMockLogger();
    const ID_X = 'clw3h8x9y0000qwertyuiregelxxx';
    const row = buildRow({ id: ID_X });
    const prisma = {
      sicherheitsregel: { findMany: jest.fn().mockResolvedValue([row]) },
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([
          // Sortierung ist im Query bereits `occurredAt asc`; Repo nimmt das erste pro aggregateId.
          { aggregateId: ID_X, payload: { propagationGroupId: 'original' } },
          { aggregateId: ID_X, payload: { propagationGroupId: 'spaeter-update' } },
        ]),
      },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findActiveByEinsatz(EINSATZ_ID);

    expect(result.value?.[0]?.propagationGroupId).toBe('original');
  });

  it('Outbox-Fehler führt zu Fallback auf regel.id (warn-Log, kein Fail)', async () => {
    const logger = createMockLogger();
    const ID_Y = 'clw3h8x9y0000qwertyuiregelyyy';
    const row = buildRow({ id: ID_Y });
    const prisma = {
      sicherheitsregel: { findMany: jest.fn().mockResolvedValue([row]) },
      outboxEvent: { findMany: jest.fn().mockRejectedValue(new Error('outbox-down')) },
    };
    const repo = new PrismaSicherheitsregelRepository(prisma as never, logger);

    const result = await repo.findActiveByEinsatz(EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value?.[0]?.propagationGroupId).toBe(ID_Y);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Outbox-Lookup fehlgeschlagen'), expect.any(Object));
  });
});

describe('PrismaSicherheitsregelRepository.updateWithNewVersion()', () => {
  function buildUpdatedAggregate(): Sicherheitsregel {
    const aggregate = buildAggregate();
    const res = aggregate.update({ titel: 'Neuer Titel', inhalt: 'Neuer Inhalt', einheitId: EINHEIT_ID }, 1, USER_ID, 'propgroup-upd');
    if (res.isFailure) throw new Error(`Update schlug fehl: ${res.error}`);
    return aggregate;
  }

  const mockTxWithCount = (count: number) => ({
    sicherheitsregel: {
      updateMany: jest.fn().mockResolvedValue({ count }),
    },
  });

  it('count === 1 (Happy-Path) → Result.ok + korrekte WHERE/data-Shape', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const aggregate = buildUpdatedAggregate();
    const tx = mockTxWithCount(1);

    const result = await repo.updateWithNewVersion(aggregate, USER_ID, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(tx.sicherheitsregel.updateMany).toHaveBeenCalledWith({
      where: { id: aggregate.id.value, version: 1 },
      data: expect.objectContaining({
        titel: 'Neuer Titel',
        inhalt: 'Neuer Inhalt',
        einheitId: EINHEIT_ID,
        version: 2,
        aktualisiertVonUserId: USER_ID,
      }),
    });
  });

  it('count === 0 (Lost-Update) → Result.fail(ConflictDetected:Sicherheitsregel) + warn', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const aggregate = buildUpdatedAggregate();
    const tx = mockTxWithCount(0);

    const result = await repo.updateWithNewVersion(aggregate, USER_ID, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:Sicherheitsregel');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Concurrent updateWithNewVersion'),
      expect.objectContaining({ sicherheitsregelId: aggregate.id.value, expectedPreviousVersion: 1 }),
    );
  });

  it('count > 1 (Invariant-Anomaly) → Result.fail + error-Log', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const aggregate = buildUpdatedAggregate();
    const tx = mockTxWithCount(2);

    const result = await repo.updateWithNewVersion(aggregate, USER_ID, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Invariant:UpdateCountAnomaly');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('count > 1'), expect.objectContaining({ sicherheitsregelId: aggregate.id.value, count: 2 }));
  });

  it('propagiert unerwartete DB-Fehler als InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const aggregate = buildUpdatedAggregate();
    const tx = { sicherheitsregel: { updateMany: jest.fn().mockRejectedValue(new Error('db-unavailable')) } };

    const result = await repo.updateWithNewVersion(aggregate, USER_ID, tx as never);

    expect(result.isFailure).toBe(true);
    // Story 2.6 Code-Review-Patch: rohe DB-Fehler werden in einen
    // `InfrastructureError:`-Sentinel verpackt.
    expect(result.error).toBe('InfrastructureError:Sicherheitsregel:db-unavailable');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('PrismaSicherheitsregelRepository.deprecate()', () => {
  /**
   * Story 2.6 Code-Review-Patch: `deprecate` setzt jetzt
   * `aktualisiertVonUserId` und prüft `version === expectedVersion` als
   * DB-Level-OCC. Schließen der offenen Version übernimmt der Handler über
   * `versionRepo.closeCurrentVersion(...)` (vermeidet Doppel-Schließen mit
   * inkonsistenten Timestamps).
   */
  const buildDeprecateTx = (mainUpdateCount: number, existsCount?: number) => ({
    sicherheitsregel: {
      updateMany: jest.fn().mockResolvedValue({ count: mainUpdateCount }),
      count: jest.fn().mockResolvedValue(existsCount ?? 0),
    },
  });

  it('OCC-Hit: stampt aktualisiertAm + aktualisiertVonUserId via WHERE version=N', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const tx = buildDeprecateTx(1);

    const result = await repo.deprecate('regel-1', EINSATZ_ID, 'user-X', 3, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(tx.sicherheitsregel.updateMany).toHaveBeenCalledWith({
      where: { id: 'regel-1', einsatzId: EINSATZ_ID, version: 3 },
      data: expect.objectContaining({ aktualisiertAm: expect.any(Date), aktualisiertVonUserId: 'user-X' }),
    });
  });

  it('Cross-Einsatz: keine Row getroffen + Existenz-Check leer → NotFound:Sicherheitsregel', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const tx = buildDeprecateTx(0, 0);

    const result = await repo.deprecate('regel-1', 'falscher-einsatz', 'user-X', 3, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Sicherheitsregel');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('Version-Mismatch: keine Row getroffen + Regel existiert → ConflictDetected:Sicherheitsregel', async () => {
    const logger = createMockLogger();
    const repo = new PrismaSicherheitsregelRepository({} as never, logger);
    const tx = buildDeprecateTx(0, 1);

    const result = await repo.deprecate('regel-1', EINSATZ_ID, 'user-X', 99, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:Sicherheitsregel');
    expect(logger.warn).toHaveBeenCalled();
  });
});
