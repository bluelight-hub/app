import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaGefaehrdungsbeurteilungRepository } from '../prisma-gefaehrdungsbeurteilung.repository';

/**
 * Reiner Unit-Test für den P2002-TOCTOU-Fix (Review-Patch 2026-04-22).
 *
 * Hintergrund: `save()` wird vom Handler NACH einem Pre-Check auf
 * `existsForEinheit` gerufen. Zwei konkurrente POSTs können beide den
 * Pre-Check passen und im Insert kollidieren → Prisma wirft P2002. Das
 * Repository übersetzt den Error in denselben BusinessRule-Sentinel, den
 * der Pre-Check liefert, damit der Controller konsistent HTTP 422 mappt
 * (Spec: „Backend muss 409/422 zurückgeben, nicht silent Error").
 *
 * Der DB-getriebene Integration-Test in `prisma-gefaehrdungsbeurteilung.
 * repository.spec.ts` deckt den End-to-End-Pfad ab, wird aber via
 * `skipIfNoDatabase` in CI ohne Postgres übersprungen. Dieser Unit-Test
 * mockt den `PrismaTransactionClient` und prüft die Error-Mapping-Branches
 * deterministisch, ohne DB-Dependency.
 */
describe('PrismaGefaehrdungsbeurteilungRepository.save — P2002-Mapping', () => {
  const createMockLogger = (): ILogger => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  const buildAggregate = (): Gefaehrdungsbeurteilung => {
    const item = GefaehrdungItem.create({ title: 'Test' }).value!;
    return Gefaehrdungsbeurteilung.create({
      einsatzId: 'clw3h8x9y0000qwertyui00002',
      einheitId: 'clw3h8x9y0000qwertyui00050',
      createdBy: 'clw3h8x9y0000qwertyui00099',
      items: [item],
    }).value!;
  };

  /**
   * Erzeugt einen Mock-TransactionClient, dessen `gefaehrdungsbeurteilung.
   * create(...)` einen konfigurierbaren Error wirft. Wir nutzen nicht die
   * echte `PrismaService`-Klasse, damit der Test keine DB-Verbindung braucht.
   */
  const mockTx = (createError: unknown) =>
    ({
      gefaehrdungsbeurteilung: {
        create: jest.fn().mockRejectedValue(createError),
      },
    }) as never;

  it('liefert BusinessRule-Sentinel bei Prisma P2002 (TOCTOU-Race)', async () => {
    const logger = createMockLogger();
    const repo = new PrismaGefaehrdungsbeurteilungRepository({} as never, logger);
    const p2002 = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['einsatz_id', 'einheit_id'] },
    });

    const result = await repo.save(buildAggregate(), mockTx(p2002));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:EinheitHatBereitsBeurteilung');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Concurrent insert'), expect.objectContaining({ einsatzId: expect.any(String), einheitId: expect.any(String) }));
  });

  it('propagiert andere Prisma-Fehler als generische Failure (z.B. P2003 FK-Violation)', async () => {
    const logger = createMockLogger();
    const repo = new PrismaGefaehrdungsbeurteilungRepository({} as never, logger);
    const p2003 = Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' });

    const result = await repo.save(buildAggregate(), mockTx(p2003));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Foreign key constraint failed');
    expect(logger.error).toHaveBeenCalled();
  });

  it('propagiert Nicht-Prisma-Exceptions als generische Failure', async () => {
    const logger = createMockLogger();
    const repo = new PrismaGefaehrdungsbeurteilungRepository({} as never, logger);

    const result = await repo.save(buildAggregate(), mockTx(new Error('Connection reset')));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Connection reset');
    expect(logger.error).toHaveBeenCalled();
  });
});
