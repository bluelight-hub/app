import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ListOffeneRueckmeldungenHandler } from '../list-offene-rueckmeldungen.handler';
import { ListOffeneRueckmeldungenQuery } from '../list-offene-rueckmeldungen.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const FREMDER_EINSATZ_ID = 'clw3h8x9y0000qwertyui99999';
const GROUP_A = 'clw3h8x9y0000qwertyuipgrpAA';
const GROUP_B = 'clw3h8x9y0000qwertyuipgrpBB';
const EINHEIT_1 = 'clw3h8x9y0000qwertyui00050';
const EINHEIT_2 = 'clw3h8x9y0000qwertyui00051';

function makeRueckmeldung(overrides: Partial<{ id: string; group: string; einsatzId: string; einheitId: string; notiz: string | null; quittiertAm: string }> = {}) {
  return {
    id: overrides.id ?? 'q-1',
    propagationGroupId: overrides.group ?? GROUP_A,
    einsatzId: overrides.einsatzId ?? EINSATZ_ID,
    einheitId: overrides.einheitId ?? EINHEIT_1,
    lueckeNotiz: Object.hasOwn(overrides, 'notiz') ? (overrides.notiz ?? null) : 'Schutzanzug Größe L fehlt',
    quittiertAm: new Date(overrides.quittiertAm ?? '2026-05-08T09:42:13.000Z'),
  };
}

function makeOutboxRow(payload: Record<string, unknown>, occurredAt = '2026-05-08T09:00:00.000Z') {
  return { payload, occurredAt: new Date(occurredAt) };
}

describe('ListOffeneRueckmeldungenHandler (Story 6.4)', () => {
  let handler: ListOffeneRueckmeldungenHandler;
  let prisma: {
    psaProfilQuittung: { findMany: jest.Mock };
    outboxEvent: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      psaProfilQuittung: { findMany: jest.fn() },
      outboxEvent: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ListOffeneRueckmeldungenHandler, { provide: PrismaService, useValue: prisma }],
    }).compile();

    handler = module.get(ListOffeneRueckmeldungenHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('liefert eine leere Liste ohne Outbox-Read, wenn keine Lücken gemeldet sind', async () => {
    prisma.psaProfilQuittung.findMany.mockResolvedValue([]);

    const result = await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(prisma.outboxEvent.findMany).not.toHaveBeenCalled();
  });

  it('liest nur lueckeGemeldet=true im aktuellen Einsatz, sortiert neueste zuerst und capped bei 200', async () => {
    prisma.psaProfilQuittung.findMany.mockResolvedValue([makeRueckmeldung()]);
    prisma.outboxEvent.findMany.mockResolvedValue([]);

    const result = await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(prisma.psaProfilQuittung.findMany).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID, lueckeGemeldet: true },
      orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        propagationGroupId: true,
        einsatzId: true,
        einheitId: true,
        lueckeNotiz: true,
        quittiertAm: true,
      },
      take: 200,
    });
  });

  it('mapped Rückmeldungen auf DTOs und nutzt quittiertAm als gemeldetAm', async () => {
    prisma.psaProfilQuittung.findMany.mockResolvedValue([
      makeRueckmeldung({ id: 'q-1', group: GROUP_B, einheitId: EINHEIT_2, notiz: null, quittiertAm: '2026-05-08T10:00:00.000Z' }),
      makeRueckmeldung({ id: 'q-2', group: GROUP_A, einheitId: EINHEIT_1, notiz: 'Filterpatrone fehlt', quittiertAm: '2026-05-08T09:42:13.000Z' }),
    ]);
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, propagationGroupId: GROUP_A, begruendung: 'CBRN-Lage gemeldet, FFP3 für Eingreif-Trupps anziehen.' }),
      makeOutboxRow({ einsatzId: EINSATZ_ID, propagationGroupId: GROUP_B, begruendung: 'Scharfer Geruch im Treppenraum.' }),
    ]);

    const result = await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([
      {
        propagationGroupId: GROUP_B,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_2,
        lueckeNotiz: null,
        gemeldetAm: '2026-05-08T10:00:00.000Z',
        begruendungAnriss: 'Scharfer Geruch im Treppenraum.',
      },
      {
        propagationGroupId: GROUP_A,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_1,
        lueckeNotiz: 'Filterpatrone fehlt',
        gemeldetAm: '2026-05-08T09:42:13.000Z',
        begruendungAnriss: 'CBRN-Lage gemeldet, FFP3 für Eingreif-Trupps anziehen.',
      },
    ]);
  });

  it('filtert Outbox-Begründungen per einsatzId und übernimmt keine fremden Gruppen', async () => {
    prisma.psaProfilQuittung.findMany.mockResolvedValue([makeRueckmeldung({ group: GROUP_A })]);
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: FREMDER_EINSATZ_ID, propagationGroupId: GROUP_A, begruendung: 'fremd' }),
      makeOutboxRow({ einsatzId: EINSATZ_ID, propagationGroupId: GROUP_B, begruendung: 'falsche Gruppe' }),
    ]);

    const result = await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value?.[0].begruendungAnriss).toBeNull();
    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventName: 'eigenschutz.psa_profil_geaendert',
          AND: [{ payload: { path: ['einsatzId'], equals: EINSATZ_ID } }, { OR: [{ payload: { path: ['propagationGroupId'], equals: GROUP_A } }] }],
        },
        take: 1000,
      }),
    );
  });

  it('begrenzt den Outbox-Read auf die konkreten offenen propagationGroupIds', async () => {
    prisma.psaProfilQuittung.findMany.mockResolvedValue([makeRueckmeldung({ group: GROUP_A }), makeRueckmeldung({ group: GROUP_B })]);
    prisma.outboxEvent.findMany.mockResolvedValue([]);

    await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventName: 'eigenschutz.psa_profil_geaendert',
          AND: [
            { payload: { path: ['einsatzId'], equals: EINSATZ_ID } },
            {
              OR: [{ payload: { path: ['propagationGroupId'], equals: GROUP_A } }, { payload: { path: ['propagationGroupId'], equals: GROUP_B } }],
            },
          ],
        },
      }),
    );
  });

  it('stabilisiert gleiche Timestamps über id ASC', async () => {
    prisma.psaProfilQuittung.findMany.mockResolvedValue([]);

    await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    const args = prisma.psaProfilQuittung.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ quittiertAm: 'desc' }, { id: 'asc' }]);
  });

  it('kürzt begruendungAnriss deterministisch auf 80 Zeichen', async () => {
    const long = 'A'.repeat(120);
    prisma.psaProfilQuittung.findMany.mockResolvedValue([makeRueckmeldung({ group: GROUP_A })]);
    prisma.outboxEvent.findMany.mockResolvedValue([makeOutboxRow({ einsatzId: EINSATZ_ID, propagationGroupId: GROUP_A, begruendung: long })]);

    const result = await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value?.[0].begruendungAnriss).toHaveLength(80);
    expect(result.value?.[0].begruendungAnriss?.endsWith('…')).toBe(true);
  });

  it('reicht Prisma-Fehler als InfrastructureError-Result durch', async () => {
    prisma.psaProfilQuittung.findMany.mockRejectedValue(new Error('db down'));

    const result = await handler.execute(new ListOffeneRueckmeldungenQuery(EINSATZ_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:OffeneRueckmeldungen:db down');
  });
});
