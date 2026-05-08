import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import { VorfallExportiertEvent } from '@domain/eigenschutz/events/vorfall-exportiert.event';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AuditVorfallExportCommand } from '../audit-vorfall-export.command';
import { AuditVorfallExportHandler } from '../audit-vorfall-export.handler';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
const OTHER_EINSATZ_ID = 'clw3h8x9y0000qwertyui05999';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui05002';
const USER_ID = 'clw3h8x9y0000qwertyui05003';
const NOW = new Date('2026-05-07T10:00:00.000Z');

const VALID_SNAPSHOT = {
  schemaVersion: 1 as const,
  snapshotAt: NOW.toISOString(),
  einsatzId: EINSATZ_ID,
  einheitId: EINHEIT_ID,
  gefaehrdungsbeurteilung: null,
  aktivePsaProfile: [],
  sicherheitsregeln: [],
};

function buildAggregate(overrides: { einsatzId?: string } = {}) {
  return EigenschutzVorfall.create({
    einsatzId: overrides.einsatzId ?? EINSATZ_ID,
    einheitId: EINHEIT_ID,
    vorfallZeit: NOW,
    wann: NOW,
    was: 'Sturz beim Aufbau',
    wo: null,
    beteiligte: [],
    massnahmen: 'Erstversorgung',
    unfallkasseRelevant: true,
    erfasstVonUserId: USER_ID,
    kontextSnapshot: VALID_SNAPSHOT,
    now: NOW,
  }).value!;
}

function buildHandler(repoOverrides: Partial<IEigenschutzVorfallRepository> = {}) {
  const aggregate = buildAggregate();
  const repo: IEigenschutzVorfallRepository = {
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn().mockResolvedValue(Result.ok(aggregate)),
    existsInEinsatz: jest.fn().mockResolvedValue(Result.ok(true)),
    findByEinsatzWithFilters: jest.fn().mockResolvedValue(Result.ok([])),
    ...repoOverrides,
  };
  const outboxSaveMock = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({ __tx: true })),
  } as unknown as PrismaService;
  const handler = new AuditVorfallExportHandler(prisma, { save: outboxSaveMock } as never, repo);
  return { handler, aggregate, repo, outboxSaveMock };
}

describe('AuditVorfallExportHandler (Story 5.6)', () => {
  it('(1) PDF-Erfolg persistiert genau ein VorfallExportiertEvent', async () => {
    const { handler, aggregate, outboxSaveMock, repo } = buildHandler();
    const result = await handler.execute(new AuditVorfallExportCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'pdf', NOW));

    expect(result.isSuccess).toBe(true);
    expect(typeof result.value).toBe('string');
    expect(repo.findById).toHaveBeenCalledWith(aggregate.id.value, expect.objectContaining({ __tx: true }));
    expect(outboxSaveMock).toHaveBeenCalledTimes(1);
    const events = outboxSaveMock.mock.calls[0][0] as VorfallExportiertEvent[];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(VorfallExportiertEvent);
    expect(events[0].aggregateId).toBe(aggregate.id.value);
    expect(events[0].format).toBe('pdf');
  });

  it('(2) JSON-Erfolg wird unterstützt', async () => {
    const { handler, aggregate, outboxSaveMock } = buildHandler();
    const result = await handler.execute(new AuditVorfallExportCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'json', NOW));

    expect(result.isSuccess).toBe(true);
    const events = outboxSaveMock.mock.calls[0][0] as VorfallExportiertEvent[];
    expect(events[0].format).toBe('json');
  });

  it('(3) NotFound:Vorfall bei fehlendem Vorfall und kein Event', async () => {
    const { handler, outboxSaveMock } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(null)) });
    const result = await handler.execute(new AuditVorfallExportCommand(EINSATZ_ID, 'missing', USER_ID, 'pdf', NOW));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Vorfall');
    expect(outboxSaveMock).not.toHaveBeenCalled();
  });

  it('(4) Cross-Einsatz wird als NotFound:Vorfall gemappt', async () => {
    const otherAggregate = buildAggregate({ einsatzId: OTHER_EINSATZ_ID });
    const { handler, outboxSaveMock } = buildHandler({ findById: jest.fn().mockResolvedValue(Result.ok(otherAggregate)) });
    const result = await handler.execute(new AuditVorfallExportCommand(EINSATZ_ID, otherAggregate.id.value, USER_ID, 'pdf', NOW));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Vorfall');
    expect(outboxSaveMock).not.toHaveBeenCalled();
  });

  it('(5) ungültiges Format schreibt kein Event', async () => {
    const { handler, aggregate, outboxSaveMock } = buildHandler();
    const result = await handler.execute(new AuditVorfallExportCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'xml' as never, NOW));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:VorfallExport:format=xml:notSupported');
    expect(outboxSaveMock).not.toHaveBeenCalled();
  });

  it('(6) ungültiger downloadedAt schreibt kein Event', async () => {
    const { handler, aggregate, outboxSaveMock } = buildHandler();
    const result = await handler.execute(new AuditVorfallExportCommand(EINSATZ_ID, aggregate.id.value, USER_ID, 'pdf', new Date('invalid')));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:VorfallExport:downloadedAtInvalid');
    expect(outboxSaveMock).not.toHaveBeenCalled();
  });
});
