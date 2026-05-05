/**
 * Unit-Tests für `PrismaSyncConflictRepository` (Story 3.9 AC3).
 *
 * Mock-basiert — der echte Postgres-Test (race auf einsatzId+entityId+
 * localExpectedVersion+reportedByUserId) ist Teil der Race-Integration-Spec
 * (`change-psa-profil.race.integration.spec.ts`, AC9).
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaSyncConflictRepository } from '../prisma-sync-conflict.repository';

const createMockLogger = (): jest.Mocked<ILogger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const ENTITY_ID = 'clw3h8x9y0000qwertyui00080';
const REPORTER_ID = 'clw3h8x9y0000qwertyui00099';

function buildInput(overrides: Partial<Parameters<PrismaSyncConflictRepository['recordOrFindExisting']>[0]> = {}) {
  return {
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID as string | null,
    entityType: 'PSA_PROFIL_ZUWEISUNG' as const,
    entityId: ENTITY_ID,
    fieldPath: 'profil',
    localPayload: { toggles: [{ profil: 'CBRN_PATIENT', aktivieren: true }], begruendung: 'CBRN' },
    serverVersion: 6,
    localExpectedVersion: 5,
    reportedByUserId: REPORTER_ID,
    ...overrides,
  };
}

describe('PrismaSyncConflictRepository.recordOrFindExisting()', () => {
  it('Happy-Path: leerer Tabelle → frischer Insert mit alreadyExisted=false und allen 9 Feldern', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'new-conflict-id' });
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.recordOrFindExisting(buildInput(), tx as never);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ id: 'new-conflict-id', alreadyExisted: false });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: ENTITY_ID,
        fieldPath: 'profil',
        serverVersion: 6,
        localExpectedVersion: 5,
        reportedByUserId: REPORTER_ID,
      }),
      select: { id: true },
    });
  });

  it('Idempotenz-Pfad: bestehende offene Row → alreadyExisted=true ohne create-Call', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue({ id: 'existing-id' });
    const create = jest.fn();
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.recordOrFindExisting(buildInput(), tx as never);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ id: 'existing-id', alreadyExisted: true });
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        einsatzId: EINSATZ_ID,
        entityId: ENTITY_ID,
        localExpectedVersion: 5,
        reportedByUserId: REPORTER_ID,
        resolvedAt: null,
      },
      select: { id: true },
    });
  });

  it('Idempotenz-Trennung: Idempotenz-Schlüssel umfasst genau einsatzId+entityId+localExpectedVersion+reportedByUserId+resolvedAt-IS-NULL', async () => {
    // Fakten-Test: das `where`-Objekt enthält genau diese 5 Schlüssel — kein
    // serverVersion (variabel), keine fieldPath (forward-compat).
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'x' });
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    await repo.recordOrFindExisting(buildInput(), tx as never);

    const where = (findFirst.mock.calls[0][0] as { where: Record<string, unknown> }).where;
    expect(Object.keys(where).sort()).toEqual(['einsatzId', 'entityId', 'localExpectedVersion', 'reportedByUserId', 'resolvedAt'].sort());
    expect(where.resolvedAt).toBeNull();
  });

  it('localPayload-Cap: JSON.stringify-Länge > 4096 → ValidationFailed:LocalPayloadTooLarge ohne DB-Roundtrip', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn();
    const create = jest.fn();
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const huge = { blob: 'X'.repeat(5000) };
    const result = await repo.recordOrFindExisting(buildInput({ localPayload: huge }), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:LocalPayloadTooLarge');
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('einheitId === null wird als null persistiert (Phase-2-Forward-Compat)', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'id-2' });
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.recordOrFindExisting(buildInput({ einheitId: null }), tx as never);

    expect(result.isSuccess).toBe(true);
    const data = (create.mock.calls[0][0] as { data: { einheitId: string | null } }).data;
    expect(data.einheitId).toBeNull();
  });

  it('DB-Fehler im findFirst → InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockRejectedValue(new Error('connection-lost'));
    const create = jest.fn();
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.recordOrFindExisting(buildInput(), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:SyncConflictRepository:connection-lost');
    expect(logger.error).toHaveBeenCalled();
  });

  it('DB-Fehler im create → InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockRejectedValue(new Error('insert-failed'));
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.recordOrFindExisting(buildInput(), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:SyncConflictRepository:insert-failed');
  });

  it('PII-Logger: redactId(...) wird für IDs verwendet, kein Klartext im log/debug', async () => {
    const logger = createMockLogger();
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'id-3' });
    const tx = { syncConflict: { findFirst, create } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    await repo.recordOrFindExisting(buildInput(), tx as never);

    const logCall = (logger.log as jest.Mock).mock.calls[0][1];
    expect(logCall).not.toHaveProperty('einsatzId');
    expect(logCall).not.toHaveProperty('reportedByUserId');
    // redactId-Format ist `r:<12-hex>` (Pattern aus pii-redact.util.ts).
    expect(logCall.einsatzIdHash).toMatch(/^r:[0-9a-f]+$/);
    expect(logCall.reportedByUserIdHash).toMatch(/^r:[0-9a-f]+$/);
    // entityType + fieldPath sind kein PII und Klartext erlaubt.
    expect(logCall.entityType).toBe('PSA_PROFIL_ZUWEISUNG');
    expect(logCall.fieldPath).toBe('profil');
  });
});

/**
 * Story 3.10 — Tests für die neuen Read- und Resolve-Pfade.
 */
function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'conflict-id',
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    entityType: 'PSA_PROFIL_ZUWEISUNG',
    entityId: ENTITY_ID,
    fieldPath: 'profil',
    localPayload: { toggles: [{ profil: 'BASIS', aktivieren: true }], begruendung: 'Race' },
    serverVersion: 6,
    localExpectedVersion: 5,
    reportedAt: new Date('2026-05-04T10:00:00.000Z'),
    reportedByUserId: REPORTER_ID,
    resolvedAt: null,
    resolvedByUserId: null,
    resolution: null,
    ...overrides,
  };
}

describe('PrismaSyncConflictRepository.findOpenByEinsatzId() (Story 3.10)', () => {
  it('Happy-Path: liefert alle offenen Konflikte sortiert reportedAt DESC, gecapped @ 200', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([makeRow({ id: 'c-1', reportedAt: new Date('2026-05-04T11:00:00.000Z') }), makeRow({ id: 'c-2', reportedAt: new Date('2026-05-04T10:00:00.000Z') })]);
    const prisma = { syncConflict: { findMany } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    const result = await repo.findOpenByEinsatzId(EINSATZ_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(2);
    expect(result.value?.[0].id).toBe('c-1');
    expect(findMany).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID, resolvedAt: null },
      orderBy: { reportedAt: 'desc' },
      take: 200,
    });
  });

  it('Filter entityType wird in WHERE durchgereicht', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { syncConflict: { findMany } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    await repo.findOpenByEinsatzId(EINSATZ_ID, { entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' });

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ einsatzId: EINSATZ_ID, resolvedAt: null, entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' });
  });

  it('Filter einheitId wird in WHERE durchgereicht', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { syncConflict: { findMany } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    await repo.findOpenByEinsatzId(EINSATZ_ID, { einheitId: EINHEIT_ID });

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ einsatzId: EINSATZ_ID, resolvedAt: null, einheitId: EINHEIT_ID });
  });

  it('mappt Row 1:1 in ReadModel inkl. localPayload als Object', async () => {
    const logger = createMockLogger();
    const row = makeRow({ id: 'c-9', resolvedAt: null });
    const findMany = jest.fn().mockResolvedValue([row]);
    const prisma = { syncConflict: { findMany } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    const result = await repo.findOpenByEinsatzId(EINSATZ_ID);

    expect(result.value?.[0]).toEqual({
      id: 'c-9',
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      entityType: 'PSA_PROFIL_ZUWEISUNG',
      entityId: ENTITY_ID,
      fieldPath: 'profil',
      localPayload: { toggles: [{ profil: 'BASIS', aktivieren: true }], begruendung: 'Race' },
      serverVersion: 6,
      localExpectedVersion: 5,
      reportedAt: row.reportedAt,
      reportedByUserId: REPORTER_ID,
      resolvedAt: null,
      resolvedByUserId: null,
      resolution: null,
    });
  });

  it('DB-Fehler → InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockRejectedValue(new Error('connection-lost'));
    const prisma = { syncConflict: { findMany } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    const result = await repo.findOpenByEinsatzId(EINSATZ_ID);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:SyncConflictRepository:connection-lost');
  });
});

describe('PrismaSyncConflictRepository.findById() (Story 3.10)', () => {
  it('Happy-Path: existierende ID liefert vollständiges ReadModel', async () => {
    const logger = createMockLogger();
    const findUnique = jest.fn().mockResolvedValue(makeRow({ id: 'c-1' }));
    const prisma = { syncConflict: { findUnique } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    const result = await repo.findById('c-1');

    expect(result.isSuccess).toBe(true);
    expect(result.value?.id).toBe('c-1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'c-1' } });
  });

  it('Not-Found liefert Result.ok(null), kein Fehler', async () => {
    const logger = createMockLogger();
    const findUnique = jest.fn().mockResolvedValue(null);
    const prisma = { syncConflict: { findUnique } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    const result = await repo.findById('does-not-exist');

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('TX-Kontext: übergebener tx-Client wird verwendet (Story 3.10 Code-Review F2)', async () => {
    const logger = createMockLogger();
    const prismaFindUnique = jest.fn();
    const prisma = { syncConflict: { findUnique: prismaFindUnique } } as never;
    const repo = new PrismaSyncConflictRepository(prisma, logger);

    const txFindUnique = jest.fn().mockResolvedValue(makeRow({ id: 'c-tx' }));
    const tx = { syncConflict: { findUnique: txFindUnique } };

    const result = await repo.findById('c-tx', tx as never);

    expect(result.isSuccess).toBe(true);
    expect(result.value?.id).toBe('c-tx');
    // tx-Client wurde verwendet, NICHT der prisma-Client.
    expect(txFindUnique).toHaveBeenCalledTimes(1);
    expect(prismaFindUnique).not.toHaveBeenCalled();
  });
});

describe('PrismaSyncConflictRepository.markResolved() (Story 3.10)', () => {
  it('Happy-Path: setzt resolvedAt/resolvedByUserId/resolution, alreadyResolved=false', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = { syncConflict: { updateMany } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);
    const resolvedAt = new Date('2026-05-04T15:00:00.000Z');

    const result = await repo.markResolved('c-1', 'SERVER_WINS', REPORTER_ID, resolvedAt, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ alreadyResolved: false });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'c-1', resolvedAt: null },
      data: { resolvedAt, resolvedByUserId: REPORTER_ID, resolution: 'SERVER_WINS' },
    });
  });

  it('Idempotenz: bereits resolved-Row liefert alreadyResolved=true, keine Daten überschrieben', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const tx = { syncConflict: { updateMany } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.markResolved('c-1', 'LOCAL_WINS', REPORTER_ID, new Date(), tx as never);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ alreadyResolved: true });
  });

  it('Not-Found-ID liefert ebenfalls alreadyResolved=true (defensiv)', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const tx = { syncConflict: { updateMany } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.markResolved('does-not-exist', 'MERGED', REPORTER_ID, new Date(), tx as never);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ alreadyResolved: true });
  });

  it('DB-Fehler → InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockRejectedValue(new Error('write-conflict'));
    const tx = { syncConflict: { updateMany } };
    const repo = new PrismaSyncConflictRepository({} as never, logger);

    const result = await repo.markResolved('c-1', 'SERVER_WINS', REPORTER_ID, new Date(), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:SyncConflictRepository:write-conflict');
  });
});
