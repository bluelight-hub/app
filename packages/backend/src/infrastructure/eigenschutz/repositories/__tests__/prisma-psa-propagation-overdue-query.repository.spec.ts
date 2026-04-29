/**
 * Unit-Tests für `PrismaPsaPropagationOverdueQueryRepository` (Story 3.7 AC2).
 *
 * Mock-basiert — verifiziert das Result-Mapping, Sentinel-Vertrag und
 * Fehler-Wrapping ggü. der Single-`$queryRaw`-Pattern. Den echten
 * SQL-Pfad (DISTINCT ON, NOT EXISTS, JSONB-Path-Filter) decken
 * `*.integration.spec.ts` ab.
 */
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaPsaPropagationOverdueQueryRepository } from '../prisma-psa-propagation-overdue-query.repository';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

function makeRow(overrides: Partial<{ originalEventId: string; einsatzId: string; einheitId: string; propagationGroupId: string; zuweisungId: string | null; occurredAt: Date }> = {}) {
  return {
    originalEventId: 'orig-evt-1',
    einsatzId: 'einsatz-1',
    einheitId: 'einheit-1',
    propagationGroupId: 'group-1',
    zuweisungId: 'zuw-1',
    occurredAt: new Date('2026-04-24T10:00:00.000Z'),
    ...overrides,
  };
}

describe('PrismaPsaPropagationOverdueQueryRepository (Story 3.7 AC2)', () => {
  const THRESHOLD = new Date('2026-04-24T10:05:00.000Z');

  it('liefert Result.ok([]) bei leerer Treffer-Liste', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    const result = await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('mappt Treffer-Rows in PsaPropagationOverdueRow inkl. Date-Konvertierung', async () => {
    const logger = createMockLogger();
    const row = makeRow();
    const queryRaw = jest.fn().mockResolvedValue([row]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    const result = await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value![0]).toEqual({
      originalEventId: 'orig-evt-1',
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
      propagationGroupId: 'group-1',
      zuweisungId: 'zuw-1',
      occurredAt: row.occurredAt,
    });
  });

  it('konvertiert occurredAt aus String zu Date (Postgres-Treiber-Resilienz)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([
      {
        ...makeRow(),
        occurredAt: '2026-04-24T10:00:00.000Z' as unknown as Date,
      },
    ]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    const result = await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100);

    expect(result.isSuccess).toBe(true);
    expect(result.value![0].occurredAt).toBeInstanceOf(Date);
  });

  it('liefert zuweisungId === null durch (für Events ohne Zuweisungs-ID)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([makeRow({ zuweisungId: null })]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    const result = await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100);
    expect(result.value![0].zuweisungId).toBeNull();
  });

  it('verwendet die übergebene tx-Instanz, wenn vorhanden (Caller bestimmt den Client)', async () => {
    const logger = createMockLogger();
    const txQueryRaw = jest.fn().mockResolvedValue([]);
    const prismaQueryRaw = jest.fn().mockResolvedValue([makeRow()]);
    const prisma = { $queryRaw: prismaQueryRaw } as never;
    const tx = { $queryRaw: txQueryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100, tx);

    expect(txQueryRaw).toHaveBeenCalledTimes(1);
    expect(prismaQueryRaw).not.toHaveBeenCalled();
  });

  it('wraps DB-Fehler als InfrastructureError:PsaPropagationOverdueQuery:<msg>', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockRejectedValue(new Error('connection lost'));
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    const result = await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:PsaPropagationOverdueQuery:connection lost');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('loggt debug, wenn Treffer-Count > 0', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([makeRow(), makeRow({ einheitId: 'einheit-2' })]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPsaPropagationOverdueQueryRepository(prisma, logger);

    await repo.findUnacknowledgedPsaPropagations(THRESHOLD, 100);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('PsaPropagationOverdueQuery: 2 überfällige'), expect.objectContaining({ limit: 100 }));
  });
});
