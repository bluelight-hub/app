import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Result } from '@domain/common/result';
import type { IPsaPropagationOverdueQueryPort, PsaPropagationOverdueRow } from '@domain/eigenschutz/repositories/i-psa-propagation-overdue-query.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER, PSA_PROPAGATION_OVERDUE_QUERY } from '@infrastructure/di-tokens';
import { EmitPsaQuittungUeberfaelligCommand } from '@application/eigenschutz/commands/emit-psa-quittung-ueberfaellig/emit-psa-quittung-ueberfaellig.command';
import { RepromptPsaQuittungScheduler } from '../reprompt-psa-quittung.scheduler';

describe('RepromptPsaQuittungScheduler (Story 3.7 AC3)', () => {
  let scheduler: RepromptPsaQuittungScheduler;
  let overdueQuery: jest.Mocked<IPsaPropagationOverdueQueryPort>;
  let commandBus: { execute: jest.Mock };
  let logger: jest.Mocked<ILogger>;
  let now: Date;

  function makeRow(overrides: Partial<PsaPropagationOverdueRow> = {}): PsaPropagationOverdueRow {
    return {
      originalEventId: 'orig-1',
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
      propagationGroupId: 'group-1',
      zuweisungId: 'zuw-1',
      occurredAt: new Date(now.getTime() - 6 * 60 * 1000),
      ...overrides,
    };
  }

  beforeEach(async () => {
    now = new Date('2026-04-29T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    overdueQuery = {
      findUnacknowledgedPsaPropagations: jest.fn(),
    } as unknown as jest.Mocked<IPsaPropagationOverdueQueryPort>;
    commandBus = { execute: jest.fn().mockResolvedValue({ isSuccess: true, value: { emitted: true } }) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepromptPsaQuittungScheduler,
        { provide: PSA_PROPAGATION_OVERDUE_QUERY, useValue: overdueQuery },
        { provide: LOGGER, useValue: logger },
        { provide: CommandBus, useValue: commandBus },
        { provide: SchedulerRegistry, useValue: { getCronJobs: jest.fn().mockReturnValue(new Map()) } },
      ],
    }).compile();

    scheduler = module.get(RepromptPsaQuittungScheduler);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('(Happy-Path) liefert 2 Treffer → CommandBus 2× aufgerufen', async () => {
    const rows = [makeRow(), makeRow({ einheitId: 'einheit-2' })];
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok(rows));

    await scheduler.handleCron();

    expect(commandBus.execute).toHaveBeenCalledTimes(2);
    const firstArg = commandBus.execute.mock.calls[0][0];
    expect(firstArg).toBeInstanceOf(EmitPsaQuittungUeberfaelligCommand);
    expect(firstArg.einheitId).toBe('einheit-1');
    expect(commandBus.execute.mock.calls[1][0].einheitId).toBe('einheit-2');
  });

  it('(Idempotenz a) Quittung innerhalb 5 min → Query liefert 0 → CommandBus NIEMALS aufgerufen', async () => {
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok([]));

    await scheduler.handleCron();

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('(Idempotenz b) Tick-2 nach Erfolg → Query filtert bereits-emittierte Pärchen, CommandBus 0×', async () => {
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValueOnce(Result.ok([makeRow()]));
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValueOnce(Result.ok([]));

    await scheduler.handleCron();
    expect(commandBus.execute).toHaveBeenCalledTimes(1);

    await scheduler.handleCron();
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('(Bulk Story 3.2) 5 Einheiten unquittiert → CommandBus 5×', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeRow({ einheitId: `einheit-${i + 1}`, originalEventId: `orig-${i + 1}` }));
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok(rows));

    await scheduler.handleCron();

    expect(commandBus.execute).toHaveBeenCalledTimes(5);
  });

  it('berechnet ueberfaelligSeitMin aus now - occurredAt (in Minuten, gefloort)', async () => {
    const sevenMinAgo = new Date(now.getTime() - 7 * 60 * 1000 - 30_000); // 7m 30s ago
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok([makeRow({ occurredAt: sevenMinAgo })]));

    await scheduler.handleCron();

    expect(commandBus.execute.mock.calls[0][0].ueberfaelligSeitMin).toBe(7);
  });

  it('DB-Fehler → kein Throw, Loglevel error, kein Command-Dispatch', async () => {
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.fail<PsaPropagationOverdueRow[]>('InfrastructureError:PsaPropagationOverdueQuery:db-down'));

    await expect(scheduler.handleCron()).resolves.toBeUndefined();
    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('PSA-Reprompt-Query fehlgeschlagen'), RepromptPsaQuittungScheduler.name);
  });

  it('einzelner Command-Dispatch wirft → failure++, andere Commands werden weiter ausgeführt', async () => {
    const rows = [makeRow(), makeRow({ einheitId: 'einheit-2' }), makeRow({ einheitId: 'einheit-3' })];
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok(rows));
    commandBus.execute.mockResolvedValueOnce({ isSuccess: true }).mockRejectedValueOnce(new Error('handler-crash')).mockResolvedValueOnce({ isSuccess: true });

    await scheduler.handleCron();

    expect(commandBus.execute).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('handler-crash'), RepromptPsaQuittungScheduler.name);
  });

  it('Backlog-Warnung ab 80 Treffern (Sichtbarkeit für SRE)', async () => {
    const rows = Array.from({ length: 80 }, (_, i) => makeRow({ einheitId: `einheit-${i}`, originalEventId: `orig-${i}` }));
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok(rows));

    await scheduler.handleCron();

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('hoher Backlog (80/100)'), RepromptPsaQuittungScheduler.name);
  });

  it('verwendet 5-min-Threshold (now - 5 * 60_000) als Query-Argument', async () => {
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok([]));

    await scheduler.handleCron();

    const [threshold, limit] = overdueQuery.findUnacknowledgedPsaPropagations.mock.calls[0];
    expect(threshold.getTime()).toBe(now.getTime() - 5 * 60 * 1000);
    expect(limit).toBe(100);
  });

  it('onApplicationBootstrap loggt registrierte Cron-Jobs', () => {
    scheduler.onApplicationBootstrap();
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('PSA-Reprompt-Cron registered'), RepromptPsaQuittungScheduler.name);
  });

  it('reicht zuweisungId === null durch', async () => {
    overdueQuery.findUnacknowledgedPsaPropagations.mockResolvedValue(Result.ok([makeRow({ zuweisungId: null })]));

    await scheduler.handleCron();

    expect(commandBus.execute.mock.calls[0][0].zuweisungId).toBeNull();
  });
});
