import { Result } from '@domain/common/result';
import { Sicherungsposten } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository } from '@domain/eigenschutz/repositories';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Standort } from '@domain/eigenschutz/value-objects/standort.vo';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AufloeseSicherungspostenCommand } from '../aufloese-sicherungsposten.command';
import { AufloeseSicherungspostenHandler } from '../aufloese-sicherungsposten.handler';

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
  return { handler: new AufloeseSicherungspostenHandler(prisma, outbox, repo, noopLogger), repo };
}

describe('AufloeseSicherungspostenHandler (Story 4.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui04001';
  const USER_ID = 'clw3h8x9y0000qwertyui04003';

  it('(1) Begründung leer → ValidationFailed:Begruendung (vor Repo-Aufruf)', async () => {
    const findById = jest.fn();
    const { handler } = buildHandler({ findById });
    const result = await handler.execute(new AufloeseSicherungspostenCommand(EINSATZ_ID, 'fake', USER_ID, 1, '   '));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:Begruendung');
    expect(findById).not.toHaveBeenCalled();
  });

  it('(2) Begründung > 2000 Zeichen → ValidationFailed', async () => {
    const { handler } = buildHandler({ findById: jest.fn() });
    const result = await handler.execute(new AufloeseSicherungspostenCommand(EINSATZ_ID, 'fake', USER_ID, 1, 'a'.repeat(2001)));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:Begruendung');
  });

  it('(3) NotFound bei nicht existierendem Posten', async () => {
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(null)) });
    const result = await handler.execute(new AufloeseSicherungspostenCommand(EINSATZ_ID, 'fake', USER_ID, 1, 'Begründung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Sicherungsposten');
  });

  it('(4) Erfolgreiches Auflösen', async () => {
    const aggregate = buildAggregate();
    const save = jest.fn().mockResolvedValue(Result.ok(undefined));
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)), save });
    const result = await handler.execute(new AufloeseSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 1, 'Posten nicht mehr benötigt'));
    expect(result.isSuccess).toBe(true);
    expect(aggregate.isAufgeloest).toBe(true);
    expect(aggregate.aufloeseBegruendung).toBe('Posten nicht mehr benötigt');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('(5) Bereits aufgelöster Posten → BusinessRule:BereitsAufgeloest', async () => {
    const aggregate = buildAggregate();
    aggregate.aufloesen(USER_ID, 'Erste Auflösung', 1);
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new AufloeseSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 2, 'Zweite Auflösung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:BereitsAufgeloest');
  });

  it('(6) Versions-Mismatch → ConflictDetected:Sicherungsposten:current=<n>', async () => {
    const aggregate = buildAggregate();
    const { handler } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(aggregate)) });
    const result = await handler.execute(new AufloeseSicherungspostenCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 99, 'Begründung'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:Sicherungsposten:current=1');
  });
});
