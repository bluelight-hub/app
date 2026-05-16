import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { makeValidKontextSnapshot } from '@domain/eigenschutz/aggregates/__tests__/__fixtures__/make-valid-kontext-snapshot';
import { CloseVorfallCommand } from '../close-vorfall.command';
import { CloseVorfallHandler } from '../close-vorfall.handler';

const noopLogger: ILogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui05002';
const USER_ID = 'clw3h8x9y0000qwertyui05003';
const NOW = new Date('2026-05-06T10:00:00.000Z');

function buildAggregate(): EigenschutzVorfall {
  return EigenschutzVorfall.create({
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    vorfallZeit: NOW,
    wann: NOW,
    was: 'Sturz beim Aufstieg',
    wo: null,
    beteiligte: [],
    massnahmen: '',
    unfallkasseRelevant: false,
    erfasstVonUserId: USER_ID,
    kontextSnapshot: makeValidKontextSnapshot({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID }),
    now: NOW,
  }).value!;
}

function buildHandler(repoOverrides: Partial<IEigenschutzVorfallRepository> = {}) {
  const repo: IEigenschutzVorfallRepository = {
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn(),
    existsInEinsatz: jest.fn(),
    findByEinsatzWithFilters: jest.fn(),
    updateClosure: jest.fn().mockResolvedValue(Result.ok(undefined)),
    ...repoOverrides,
  };
  const prisma = {
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({ __tx: true })),
  } as unknown as PrismaService;
  const outbox = { save: jest.fn().mockResolvedValue(undefined) } as never;
  return { handler: new CloseVorfallHandler(prisma, outbox, repo, noopLogger), repo };
}

describe('CloseVorfallHandler (Issue #415)', () => {
  it('Begründung > 500 Zeichen → ValidationFailed:Begruendung', async () => {
    const { handler, repo } = buildHandler();
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, 'fake', USER_ID, 'a'.repeat(501)));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:Begruendung');
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('NotFound bei nicht existierendem Vorfall', async () => {
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(null)) });
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, 'fake', USER_ID, 'Begründung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Vorfall');
  });

  it('Cross-Einsatz → NotFound:Vorfall', async () => {
    const aggregate = buildAggregate();
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new CloseVorfallCommand('different-einsatz', aggregate.id.value, USER_ID, 'Begründung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Vorfall');
  });

  it('Erfolgreiches Schließen mit Begründung — Aggregate transitiert, updateClosure aufgerufen, Event emittiert', async () => {
    const aggregate = buildAggregate();
    const updateClosure = jest.fn().mockResolvedValue(Result.ok(undefined));
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)), updateClosure });
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'Vorfall abgearbeitet'));
    expect(result.isSuccess).toBe(true);
    expect(aggregate.isGeschlossen).toBe(true);
    expect(aggregate.schliessungsBegruendung).toBe('Vorfall abgearbeitet');
    expect(updateClosure).toHaveBeenCalledTimes(1);
    // VorfallGeschlossenEvent muss im Aggregate emittiert sein (zusammen mit
    // dem ursprünglichen VorfallGemeldetEvent aus create()).
    const events = aggregate.getDomainEvents();
    expect(events.some((e) => e.constructor.name === 'VorfallGeschlossenEvent')).toBe(true);
  });

  it('Schließen ohne Begründung — Empty-String → null', async () => {
    const aggregate = buildAggregate();
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, aggregate.id.value, USER_ID, ''));
    expect(result.isSuccess).toBe(true);
    expect(aggregate.schliessungsBegruendung).toBeNull();
  });

  it('Schließen ohne Begründung (null) — `schliessungsBegruendung` bleibt null', async () => {
    const aggregate = buildAggregate();
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, aggregate.id.value, USER_ID, null));
    expect(result.isSuccess).toBe(true);
    expect(aggregate.isGeschlossen).toBe(true);
    expect(aggregate.schliessungsBegruendung).toBeNull();
  });

  it('Bereits geschlossener Vorfall → BusinessRule:VorfallBereitsGeschlossen', async () => {
    const aggregate = buildAggregate();
    aggregate.close(USER_ID, 'Erste Schließung', NOW);
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'Zweite Schließung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:VorfallBereitsGeschlossen');
  });

  it('Repo-Failure bei updateClosure → InfrastructureError', async () => {
    const aggregate = buildAggregate();
    const updateClosure = jest.fn().mockResolvedValue(Result.fail('InfrastructureError:UpdateVorfallClosure'));
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)), updateClosure });
    const result = await handler.execute(new CloseVorfallCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'Begründung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:/);
  });
});
