/**
 * Unit-Tests für `PrismaPushRecipientLookupRepository` (Story 3.8 AC2).
 *
 * Mock-basiert — verifiziert Result-Mapping, Sentinel-Vertrag, Fehler-Wrapping
 * und PII-Hygiene gegen den Single-`$queryRaw`-Pattern (Vorbild Story 3.7).
 */
import type { ILogger } from '@domain/ports/i-logger.port';
import { redactId } from '@/shared/utils/pii-redact.util';
import { PrismaPushRecipientLookupRepository } from '../prisma-push-recipient-lookup.repository';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

describe('PrismaPushRecipientLookupRepository (Story 3.8 AC2)', () => {
  const EINSATZ_ID = 'einsatz-cuid-1';
  const EINHEIT_ID = 'einheit-cuid-1';

  it('liefert Empfänger-User-IDs in stabiler ASC-Reihenfolge bei Treffern (Happy-Path)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([{ userId: 'user-A' }, { userId: 'user-B' }]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    const result = await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(['user-A', 'user-B']);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('liefert Result.ok([]) für Einheit ohne zugewiesene Personen (kein Throw)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    const result = await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    // Bei leeren Treffern wird KEIN debug-Log emittiert (vermeidet Log-Rauschen
    // im Hot-Path, falls Lookup für inaktive Einheiten häufig läuft).
    expect((logger.debug as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('dedupt User-IDs im Result (Defense-in-depth gegen DISTINCT-Lücken im Treiber)', async () => {
    // Auch wenn `SELECT DISTINCT` in der SQL Doppelungen ausschließt, dedupt
    // das Repository zusätzlich via `Set` — das schützt gegen einen Treiber-
    // Bug, der DISTINCT verschluckt, ohne dass Empfänger doppelte Push-Frames
    // bekommen. Insertion-Order bleibt stabil (ASC aus der Query).
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([{ userId: 'user-A' }, { userId: 'user-A' }, { userId: 'user-B' }, { userId: 'user-A' }]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    const result = await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(['user-A', 'user-B']);
  });

  it('filtert Rows ohne valides string-userId aus (Schema-Drift-Defense)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([{ userId: 'user-A' }, { userId: undefined }, { userId: '' }, { userId: 42 }, { userId: 'user-B' }]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    const result = await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(['user-A', 'user-B']);
  });

  it('liefert Result.ok([]) sofort bei leerem einsatzId/einheitId — kein SQL-Roundtrip', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn();
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    const a = await repo.listRecipientsForEinheit('', EINHEIT_ID);
    const b = await repo.listRecipientsForEinheit(EINSATZ_ID, '');

    expect(a.isSuccess).toBe(true);
    expect(a.value).toEqual([]);
    expect(b.isSuccess).toBe(true);
    expect(b.value).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('liefert Result.fail mit sanitisiertem InfrastructureError-Sentinel (kein PII-Leak aus error.message)', async () => {
    const logger = createMockLogger();
    // Treiber-Fehlertext könnte Connection-String/PII enthalten — darf nicht im Sentinel landen.
    const queryRaw = jest.fn().mockRejectedValue(new Error('connection to postgres://user:secret@host failed'));
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    const result = await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:PushRecipientLookup:Error');
    expect(result.error).not.toContain('postgres://');
    expect(result.error).not.toContain('secret');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [, ctx] = (logger.warn as jest.Mock).mock.calls[0];
    expect(ctx.errorClass).toBe('Error');
    expect(JSON.stringify(ctx)).not.toContain('postgres://');
  });

  it('redact einsatzId/einheitId in Logs — kein Klartext (PII-Hygiene)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockRejectedValue(new Error('pg server gone'));
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    const allCalls = [...(logger.warn as jest.Mock).mock.calls, ...(logger.debug as jest.Mock).mock.calls, ...(logger.error as jest.Mock).mock.calls, ...(logger.log as jest.Mock).mock.calls];
    const serialized = JSON.stringify(allCalls);

    expect(serialized).not.toContain(EINSATZ_ID);
    expect(serialized).not.toContain(EINHEIT_ID);
    expect(serialized).toContain(redactId(EINSATZ_ID)!);
    expect(serialized).toContain(redactId(EINHEIT_ID)!);
  });

  it('emittiert debug-Log mit recipientCount + redacted IDs bei Treffer (kein User-PII)', async () => {
    const logger = createMockLogger();
    const queryRaw = jest.fn().mockResolvedValue([{ userId: 'user-A' }, { userId: 'user-B' }]);
    const prisma = { $queryRaw: queryRaw } as never;
    const repo = new PrismaPushRecipientLookupRepository(prisma, logger);

    await repo.listRecipientsForEinheit(EINSATZ_ID, EINHEIT_ID);

    expect(logger.debug).toHaveBeenCalledTimes(1);
    const [, ctx] = (logger.debug as jest.Mock).mock.calls[0];
    expect(ctx).toEqual({
      einsatzIdHash: redactId(EINSATZ_ID),
      einheitIdHash: redactId(EINHEIT_ID),
      recipientCount: 2,
    });
    // Kein User-ID-Klartext im Log
    expect(JSON.stringify(ctx)).not.toContain('user-A');
    expect(JSON.stringify(ctx)).not.toContain('user-B');
  });
});
