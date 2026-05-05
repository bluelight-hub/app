/**
 * Unit-Tests für `PrismaEigenschutzTelemetryRepository` (Story 3.11 AC5).
 *
 * Mock-basiert — der echte Postgres-Test (Race auf parallel `createMany`
 * von zwei Tabs) ist Teil der Test-Infrastructure-Story; hier wird
 * ausschließlich das Mapping- und Fehler-Verhalten verifiziert.
 *
 * Pattern-Mirror: `prisma-sync-conflict.repository.spec.ts`.
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { redactId } from '@/shared/utils/pii-redact.util';
import { PrismaEigenschutzTelemetryRepository } from '../prisma-eigenschutz-telemetry.repository';
import type { PersistTelemetryEventInput } from '@domain/eigenschutz/repositories/i-eigenschutz-telemetry.repository';

const createMockLogger = (): jest.Mocked<ILogger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const SESSION_ID = 'sess-clw3h8x9y0000qwertyui00500';

function buildEvent(overrides: Partial<PersistTelemetryEventInput> = {}): PersistTelemetryEventInput {
  return {
    einsatzId: EINSATZ_ID,
    userId: USER_ID,
    sessionId: SESSION_ID,
    eventName: 'cbrn_acknowledged',
    payload: { grund: 'kein-Verdacht' },
    clientTime: new Date('2026-05-04T10:00:00.000Z'),
    ...overrides,
  };
}

function buildRepo(createManyImpl: jest.Mock): {
  repo: PrismaEigenschutzTelemetryRepository;
  logger: jest.Mocked<ILogger>;
  createMany: jest.Mock;
} {
  const logger = createMockLogger();
  const prisma = { eigenschutzTelemetryEvent: { createMany: createManyImpl } } as never;
  const repo = new PrismaEigenschutzTelemetryRepository(prisma, logger);
  return { repo, logger, createMany: createManyImpl };
}

describe('PrismaEigenschutzTelemetryRepository.persistBatch()', () => {
  it('Happy-Path: 3 Events → createMany 1× mit allen 6 Feldern + Result.ok({insertedCount:3})', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 3 });
    const { repo } = buildRepo(createMany);

    const events = [buildEvent({ eventName: 'cbrn_announced' }), buildEvent({ eventName: 'all_banners_delivered' }), buildEvent({ eventName: 'cbrn_acknowledged' })];
    const result = await repo.persistBatch(events);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ insertedCount: 3 });
    expect(createMany).toHaveBeenCalledTimes(1);
    const args = createMany.mock.calls[0][0] as { data: Record<string, unknown>[] };
    expect(args.data).toHaveLength(3);
    args.data.forEach((row) => {
      expect(row).toEqual(
        expect.objectContaining({
          einsatzId: EINSATZ_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          payload: expect.any(Object),
          clientTime: expect.any(Date),
          eventName: expect.any(String),
        }),
      );
      // serverTime wird NICHT mitgegeben (DB-DEFAULT now()).
      expect(row).not.toHaveProperty('serverTime');
    });
  });

  it('Empty-Batch: leeres Array → Result.ok({insertedCount:0}) ohne createMany-Call', async () => {
    const createMany = jest.fn();
    const { repo } = buildRepo(createMany);

    const result = await repo.persistBatch([]);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ insertedCount: 0 });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('Prisma-Throw (generic Error): → Result.fail("PersistTelemetryFailed:error-error") + logger.warn 1× mit redactId(einsatzId)', async () => {
    const createMany = jest.fn().mockRejectedValue(new Error('database connection lost'));
    const { repo, logger } = buildRepo(createMany);

    const result = await repo.persistBatch([buildEvent()]);

    expect(result.isFailure).toBe(true);
    // Code-Review-Patch: Roh-Message LEAKT NICHT mehr in den Result-String —
    // der Caller bekommt nur noch eine klassifizierte Marker-Klasse. Details
    // bleiben im internen Log.
    expect(result.error).toBe('PersistTelemetryFailed:error-error');
    expect(result.error).not.toContain('database connection lost');
    expect(logger.warn).toHaveBeenCalledTimes(1);

    // Logger-Payload ist JSON-string (1. Arg). Parsen und prüfen, dass
    // einsatzId als redactId-Hash gespeichert ist, NICHT Klartext-CUID.
    const loggedJson = logger.warn.mock.calls[0][0] as string;
    const parsed = JSON.parse(loggedJson) as Record<string, unknown>;
    expect(parsed.context).toBe('PrismaEigenschutzTelemetryRepository');
    expect(parsed.batchSize).toBe(1);
    // Roh-Message bleibt im internen Log erhalten — sie ist für Operator-
    // Debugging unverzichtbar, leakt aber nicht zum HTTP-Caller.
    expect(parsed.error).toBe('database connection lost');
    expect(parsed.einsatzId).toBe(redactId(EINSATZ_ID));
    expect(parsed.einsatzId).toMatch(/^r:[0-9a-f]+$/);
    // Klartext-CUID darf NICHT im Log auftauchen.
    expect(loggedJson).not.toContain(EINSATZ_ID);
  });

  it('Prisma-Throw mit Code (P2003 FK-Violation): → Result.fail("PersistTelemetryFailed:prisma-p2003"), Roh-Message bleibt im Log', async () => {
    // Defense-in-Depth: ein Prisma-Code-Throw darf NICHT als Plaintext zum
    // HTTP-Caller wandern. Der Code wird auf den `prisma-<code>`-Marker
    // gemappt; Field-Detail (`Foreign key constraint failed on the field:
    // "einsatzId"`) bleibt im Log.
    const prismaError = Object.assign(new Error('Foreign key constraint failed on the field: `einsatzId`'), {
      code: 'P2003',
      name: 'PrismaClientKnownRequestError',
    });
    const createMany = jest.fn().mockRejectedValue(prismaError);
    const { repo, logger } = buildRepo(createMany);

    const result = await repo.persistBatch([buildEvent()]);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('PersistTelemetryFailed:prisma-p2003');
    expect(result.error).not.toContain('einsatzId');
    expect(result.error).not.toContain('Foreign key');

    const parsed = JSON.parse(logger.warn.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.error).toContain('Foreign key');
  });

  it('UTF-8-Multibyte: Payload mit "äöüß"-Strings wird unverändert an createMany durchgereicht (Repo trimmt nicht)', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const { repo } = buildRepo(createMany);

    const payload = { grund: 'Gefährdung mit Umlauten: ÄÖÜß', notiz: 'straße' };
    const result = await repo.persistBatch([buildEvent({ payload })]);

    expect(result.isSuccess).toBe(true);
    const args = createMany.mock.calls[0][0] as { data: { payload: unknown }[] };
    expect(args.data[0].payload).toEqual(payload);
    // Identitäts-Check: derselbe Object-Ref (kein Deep-Clone, kein Trim).
    expect(args.data[0].payload).toBe(payload);
  });

  it('Non-Error-Throw (string): → Result.fail("PersistTelemetryFailed:unknown") + Logger-Field error="unknown"', async () => {
    const createMany = jest.fn().mockRejectedValue('string-error');
    const { repo, logger } = buildRepo(createMany);

    const result = await repo.persistBatch([buildEvent()]);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('PersistTelemetryFailed:unknown');
    expect(logger.warn).toHaveBeenCalledTimes(1);

    const parsed = JSON.parse(logger.warn.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.error).toBe('unknown');
  });

  it('skipDuplicates: false wird im createMany-Argument explizit gesetzt (kein DB-Default-Verhalten)', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const { repo } = buildRepo(createMany);

    await repo.persistBatch([buildEvent()]);

    const args = createMany.mock.calls[0][0] as { skipDuplicates: boolean; data: Record<string, unknown>[] };
    expect(args.skipDuplicates).toBe(false);
    // Sanity-Check: serverTime fehlt im data-Objekt (DB-DEFAULT now()).
    expect(args.data[0]).not.toHaveProperty('serverTime');
  });
});
