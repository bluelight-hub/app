import { Result } from '@domain/common/result';
import { Sicherungsposten } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository } from '@domain/eigenschutz/repositories';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Standort } from '@domain/eigenschutz/value-objects/standort.vo';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { UpdateSicherungspostenCommand } from '../update-sicherungsposten.command';
import { UpdateSicherungspostenHandler } from '../update-sicherungsposten.handler';

const noopLogger: ILogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

function buildAggregate(): Sicherungsposten {
  return Sicherungsposten.create({
    einsatzId: 'clw3h8x9y0000qwertyui04001',
    bezeichnung: 'Posten Nord',
    standort: Standort.create({ kind: 'address', text: 'Hauptbahnhof' }).value!,
    personal: [],
    createdBy: 'clw3h8x9y0000qwertyui04003',
  }).value!;
}

function buildHandler(repoOverrides: Partial<ISicherungspostenRepository> = {}) {
  const repo: ISicherungspostenRepository = {
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn(),
    findReadModelById: jest.fn(),
    findActiveByEinsatzId: jest.fn(),
    findResolvedByEinsatzId: jest.fn(),
    existsInEinsatz: jest.fn(),
    ...repoOverrides,
  };
  const prisma = {
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({ __tx: true })),
  } as unknown as PrismaService;
  const outbox = { save: jest.fn().mockResolvedValue(undefined) } as never;
  return { handler: new UpdateSicherungspostenHandler(prisma, outbox, repo, noopLogger), repo };
}

describe('UpdateSicherungspostenHandler (Story 4.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui04001';
  const USER_ID = 'clw3h8x9y0000qwertyui04003';

  it('(1) NotFound: aggregate nicht im Einsatz → NotFound:Sicherungsposten', async () => {
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(null)) });
    const result = await handler.execute(new UpdateSicherungspostenCommand(EINSATZ_ID, 'fakeid', USER_ID, 1, { bezeichnung: 'X' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Sicherungsposten');
  });

  it('(2) Cross-Einsatz-Aggregate → NotFound:Sicherungsposten', async () => {
    const aggregate = buildAggregate();
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new UpdateSicherungspostenCommand('clw3h8x9y0000qwertyui04999', aggregate.id.value, USER_ID, 1, { bezeichnung: 'X' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Sicherungsposten');
  });

  it('(3) Versions-Mismatch: liefert ConflictDetected mit :current=<n>', async () => {
    const aggregate = buildAggregate();
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new UpdateSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 99, { bezeichnung: 'X' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:Sicherungsposten:current=1');
  });

  it('(4) Erfolgreicher Update: speichert + emittiert Aktualisiert-Event', async () => {
    const aggregate = buildAggregate();
    const save = jest.fn().mockResolvedValue(Result.ok(undefined));
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)), save });
    const result = await handler.execute(new UpdateSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 1, { bezeichnung: 'Posten Nord neu' }));
    expect(result.isSuccess).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(aggregate.version).toBe(2);
    expect(aggregate.bezeichnung).toBe('Posten Nord neu');
  });

  it('(5) DB-Level Conflict bei save: reload, liefert ConflictDetected mit aktueller Version', async () => {
    const aggregate = buildAggregate();
    const reloaded = buildAggregate();
    // Simuliere Reload-Aggregate auf Version 5
    while (reloaded.version < 5) reloaded.update({ bezeichnung: `${reloaded.bezeichnung}_x${reloaded.version}` }, reloaded.version, USER_ID);
    const findById = jest.fn().mockResolvedValueOnce(Result.ok(aggregate)).mockResolvedValueOnce(Result.ok(reloaded));
    const save = jest.fn().mockResolvedValue(Result.fail<void>('ConflictDetected:Sicherungsposten'));
    const { handler } = buildHandler({ findById, save });
    const result = await handler.execute(new UpdateSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 1, { bezeichnung: 'X' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:Sicherungsposten:current=5');
  });

  it('(6) Bereits aufgelöst → BusinessRule:BereitsAufgeloest', async () => {
    const aggregate = buildAggregate();
    aggregate.aufloesen(USER_ID, 'Auflösen', 1);
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new UpdateSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 2, { bezeichnung: 'X' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:BereitsAufgeloest');
  });
});
