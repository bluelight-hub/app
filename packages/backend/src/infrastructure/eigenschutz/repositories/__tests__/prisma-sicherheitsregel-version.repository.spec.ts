/**
 * Unit-Tests für PrismaSicherheitsregelVersionRepository (Story 2.6 Task 4).
 *
 * Mock-basiert: wir prüfen die Write-Shape gegen `sicherheitsregelVersion.
 * create`/`updateMany`, den Outbox-Retry-Idempotenz-Pfad (P2002 auf
 * `event_id`) und den Single-UPDATE-Re-Wire-Pfad (`closeCurrentVersion`).
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaSicherheitsregelVersionRepository } from '../prisma-sicherheitsregel-version.repository';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const BASE_ARGS = {
  regelId: 'regel-1',
  version: 1,
  titel: 'Alkoholverbot',
  inhalt: 'Kein Alkohol während des Einsatzes.',
  gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
  changedByUserId: 'user-1',
  eventId: 'event-1',
};

/**
 * Baut einen Prisma-P2002-Error gegen einen konfigurierbaren Target-Index.
 * Analog zum Guard in der Gefährdungsbeurteilungs-Version-Repo testen wir
 * sowohl das klassische `meta.target`-Shape als auch das Driver-Adapter-
 * Shape; hier genügt die klassische Variante — der Guard selbst ist im
 * Gefährdungsbeurteilungs-Spec bereits im Driver-Adapter-Pfad geprüft.
 */
function p2002(target: string | string[]): Error {
  const err = new Error('Unique constraint failed') as Error & { code: string; meta: { target: string | string[] } };
  err.code = 'P2002';
  err.meta = { target };
  return err;
}

describe('PrismaSicherheitsregelVersionRepository.saveInitialVersion()', () => {
  it('persistiert Zeile mit gueltigBis=null und allen Felder-Mappings', async () => {
    const logger = createMockLogger();
    const create = jest.fn().mockResolvedValue(undefined);
    const tx = { sicherheitsregelVersion: { create } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.saveInitialVersion(BASE_ARGS, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(create).toHaveBeenCalledWith({
      data: {
        regelId: 'regel-1',
        version: 1,
        titel: 'Alkoholverbot',
        inhalt: 'Kein Alkohol während des Einsatzes.',
        gueltigVon: BASE_ARGS.gueltigVon,
        changedByUserId: 'user-1',
        eventId: 'event-1',
      },
    });
  });

  it('mappt P2002 auf event_id-Index auf idempotenten Success', async () => {
    const logger = createMockLogger();
    const tx = { sicherheitsregelVersion: { create: jest.fn().mockRejectedValue(p2002(['event_id'])) } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.saveInitialVersion(BASE_ARGS, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Idempotenter Retry'), expect.objectContaining({ regelId: 'regel-1', version: 1, eventId: 'event-1' }));
  });

  it('P2002 auf (regelId, version) bleibt echter Fehler (kein idempotenter Pfad)', async () => {
    const logger = createMockLogger();
    const tx = { sicherheitsregelVersion: { create: jest.fn().mockRejectedValue(p2002(['regel_id', 'version'])) } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.saveInitialVersion(BASE_ARGS, tx as never);

    expect(result.isFailure).toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });

  it('beliebige DB-Fehler werden als Result.fail weitergereicht', async () => {
    const logger = createMockLogger();
    const tx = { sicherheitsregelVersion: { create: jest.fn().mockRejectedValue(new Error('db-down')) } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.saveInitialVersion(BASE_ARGS, tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('db-down');
  });
});

describe('PrismaSicherheitsregelVersionRepository.saveNewVersion()', () => {
  it('schließt offene Vorversion (updateMany) und legt neue Zeile an', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue(undefined);
    const tx = { sicherheitsregelVersion: { updateMany, create } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const args = { ...BASE_ARGS, version: 2, eventId: 'event-2' };
    const result = await repo.saveNewVersion(args, tx as never);

    expect(result.isSuccess).toBe(true);
    // Chain-Closing: gueltigBis der offenen Vorversion = gueltigVon der neuen.
    expect(updateMany).toHaveBeenCalledWith({
      where: { regelId: 'regel-1', gueltigBis: null },
      data: { gueltigBis: args.gueltigVon },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ regelId: 'regel-1', version: 2, eventId: 'event-2' }),
    });
  });

  it('idempotenter Retry bei P2002 auf event_id', async () => {
    const logger = createMockLogger();
    const tx = {
      sicherheitsregelVersion: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockRejectedValue(p2002('event_id')),
      },
    };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.saveNewVersion({ ...BASE_ARGS, version: 2, eventId: 'event-2' }, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('P2002 auf (regelId, version) bleibt echter Fehler', async () => {
    const logger = createMockLogger();
    const tx = {
      sicherheitsregelVersion: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockRejectedValue(p2002(['regel_id', 'version'])),
      },
    };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.saveNewVersion({ ...BASE_ARGS, version: 2, eventId: 'event-2' }, tx as never);

    expect(result.isFailure).toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('PrismaSicherheitsregelVersionRepository.closeCurrentVersion()', () => {
  it('Single-UPDATE gegen offene Zeile mit gegebenem gueltigBis', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = { sicherheitsregelVersion: { updateMany } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const now = new Date('2026-04-24T12:00:00.000Z');
    const result = await repo.closeCurrentVersion('regel-1', now, tx as never);

    expect(result.isSuccess).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { regelId: 'regel-1', gueltigBis: null },
      data: { gueltigBis: now },
    });
  });

  it('count===0 → warn-Log, aber Result.ok (idempotent bei doppeltem Deprecate)', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const tx = { sicherheitsregelVersion: { updateMany } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.closeCurrentVersion('regel-1', new Date(), tx as never);

    expect(result.isSuccess).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('keine offene Version'), expect.objectContaining({ regelId: 'regel-1' }));
  });

  it('propagiert unerwartete DB-Fehler als Result.fail', async () => {
    const logger = createMockLogger();
    const updateMany = jest.fn().mockRejectedValue(new Error('db-unavailable'));
    const tx = { sicherheitsregelVersion: { updateMany } };
    const repo = new PrismaSicherheitsregelVersionRepository(logger, {} as never);

    const result = await repo.closeCurrentVersion('regel-1', new Date(), tx as never);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('db-unavailable');
    expect(logger.error).toHaveBeenCalled();
  });
});
