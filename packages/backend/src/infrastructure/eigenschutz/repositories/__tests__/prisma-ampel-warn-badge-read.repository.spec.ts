import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaAmpelWarnBadgeReadRepository } from '../prisma-ampel-warn-badge-read.repository';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06501';

const createLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const buildPrisma = (overrides: Record<string, unknown> = {}) =>
  ({
    gefaehrdungsbeurteilung: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as never;

describe('PrismaAmpelWarnBadgeReadRepository', () => {
  it('lädt Gefährdungsbeurteilungen serverseitig nach Einsatz und cappt Kandidaten', async () => {
    const prisma = buildPrisma();
    const repo = new PrismaAmpelWarnBadgeReadRepository(prisma, createLogger());

    await repo.listCandidatesByEinsatz(EINSATZ_ID);

    expect(prisma.gefaehrdungsbeurteilung.findMany).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID },
      select: { id: true, einsatzId: true, einheitId: true, items: true, aktualisiertAm: true },
      orderBy: [{ aktualisiertAm: 'desc' }, { id: 'asc' }],
      take: 100,
    });
  });

  it('mappt JSON-Items auf Gefährdungs-Kandidaten', async () => {
    const prisma = buildPrisma({
      gefaehrdungsbeurteilung: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'gef-1',
            einsatzId: EINSATZ_ID,
            einheitId: 'einheit-1',
            aktualisiertAm: new Date('2026-05-08T10:00:00.000Z'),
            items: [{ id: 'item-1', titel: 'Kraftstoff', risikoklasse: 'ROT' }],
          },
        ]),
      },
    });
    const repo = new PrismaAmpelWarnBadgeReadRepository(prisma, createLogger());

    const result = await repo.listCandidatesByEinsatz(EINSATZ_ID);

    expect(result.value?.gefaehrdungen).toEqual([
      expect.objectContaining({
        gefaehrdungsbeurteilungId: 'gef-1',
        gefaehrdungItemId: 'item-1',
        gefaehrdungItemFallbackKey: 'item-index-0',
        gefaehrdungTitel: 'Kraftstoff',
      }),
    ]);
  });

  it('lädt PSA-Überfälligkeitskandidaten ohne Cross-Einsatz-Scan und ohne quittierte Paare', async () => {
    const prisma = buildPrisma();
    const repo = new PrismaAmpelWarnBadgeReadRepository(prisma, createLogger());

    await repo.listCandidatesByEinsatz(EINSATZ_ID);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = String(prisma.$queryRaw.mock.calls[0][0].strings.join(' '));
    expect(sql).toContain('WITH deduped AS');
    expect(sql).toContain('oe."payload"->>\'einsatzId\' =');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('psa_profil_quittungen');
    expect(sql).toContain('ORDER BY "occurredAt" ASC, "propagationGroupId" ASC, "einheitId" ASC');
    expect(sql).toContain('LIMIT');
  });

  it('mappt DB-Fehler auf InfrastructureError', async () => {
    const prisma = buildPrisma({
      gefaehrdungsbeurteilung: { findMany: jest.fn().mockRejectedValue(new Error('db-down')) },
    });
    const logger = createLogger();
    const repo = new PrismaAmpelWarnBadgeReadRepository(prisma, logger);

    const result = await repo.listCandidatesByEinsatz(EINSATZ_ID);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:AmpelWarnBadgeRead:Error');
    expect(logger.error).toHaveBeenCalled();
  });
});
