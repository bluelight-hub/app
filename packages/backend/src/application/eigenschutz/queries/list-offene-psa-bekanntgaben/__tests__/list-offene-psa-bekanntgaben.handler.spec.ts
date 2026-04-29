// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ListOffenePsaBekanntgabenHandler } from '../list-offene-psa-bekanntgaben.handler';
import { ListOffenePsaBekanntgabenQuery } from '../list-offene-psa-bekanntgaben.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const GROUP_A = 'clw3h8x9y0000qwertyuipgrpAA';
const GROUP_B = 'clw3h8x9y0000qwertyuipgrpBB';
const GROUP_C_COMPLETE = 'clw3h8x9y0000qwertyuipgrpCC';
const EINHEIT_1 = 'clw3h8x9y0000qwertyui00050';
const EINHEIT_2 = 'clw3h8x9y0000qwertyui00051';
const EINHEIT_3 = 'clw3h8x9y0000qwertyui00052';

function makeOutboxRow(payload: Record<string, unknown>, occurredAt: string) {
  return { payload, occurredAt: new Date(occurredAt) };
}

function makeQuittungRow(group: string, einheitId: string) {
  return {
    id: `q-${einheitId}`,
    propagationGroupId: group,
    einsatzId: EINSATZ_ID,
    einheitId,
    quittiertAm: new Date('2026-04-27T08:42:13.000Z'),
    quittiertVonUserId: 'user-x',
    lueckeGemeldet: false,
    lueckeNotiz: null,
  };
}

describe('ListOffenePsaBekanntgabenHandler (Story 3.4 AC15)', () => {
  let handler: ListOffenePsaBekanntgabenHandler;
  let prisma: { outboxEvent: { findMany: jest.Mock } };
  let quittungRepo: { findByEinsatzAndGroup: jest.Mock };

  beforeEach(async () => {
    prisma = { outboxEvent: { findMany: jest.fn() } };
    quittungRepo = { findByEinsatzAndGroup: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ListOffenePsaBekanntgabenHandler, { provide: PrismaService, useValue: prisma }, { provide: PSA_PROFIL_QUITTUNG_REPOSITORY, useValue: quittungRepo }],
    }).compile();

    handler = module.get(ListOffenePsaBekanntgabenHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('gruppiert Outbox-Events nach propagationGroupId und liefert pending/partial Einträge', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_1, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN-Lage gemeldet' }, '2026-04-27T08:39:11.000Z'),
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_2, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN-Lage gemeldet' }, '2026-04-27T08:39:11.000Z'),
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_3, propagationGroupId: GROUP_B, profil: 'ERWEITERT', aktion: 'AKTIVIERT', begruendung: 'Treppenhaus' }, '2026-04-27T09:01:00.000Z'),
    ]);
    quittungRepo.findByEinsatzAndGroup.mockImplementation(async (_einsatzId: string, group: string) => {
      if (group === GROUP_A) return Result.ok([makeQuittungRow(GROUP_A, EINHEIT_1)]); // partial
      if (group === GROUP_B) return Result.ok([]); // pending
      return Result.ok([]);
    });

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    const entries = result.value!;
    expect(entries).toHaveLength(2);

    // Sortierung DESC: GROUP_B (09:01) vor GROUP_A (08:39).
    expect(entries[0].propagationGroupId).toBe(GROUP_B);
    expect(entries[0].status).toBe('pending');
    expect(entries[0].ackCount).toBe(0);
    expect(entries[0].totalCount).toBe(1);

    expect(entries[1].propagationGroupId).toBe(GROUP_A);
    expect(entries[1].status).toBe('partial');
    expect(entries[1].ackCount).toBe(1);
    expect(entries[1].totalCount).toBe(2);
    expect(entries[1].betroffeneEinheitIds).toEqual(expect.arrayContaining([EINHEIT_1, EINHEIT_2]));
    expect(entries[1].profilToggles).toEqual([{ profil: 'BASIS', aktion: 'AKTIVIERT' }]);
    expect(entries[1].begruendungAnriss).toBe('CBRN-Lage gemeldet');
  });

  it('filtert vollständig quittierte (complete) Gruppen aus der Liste', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_1, propagationGroupId: GROUP_C_COMPLETE, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'Test' }, '2026-04-27T07:00:00.000Z'),
    ]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([makeQuittungRow(GROUP_C_COMPLETE, EINHEIT_1)]));

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('Story 3.6 AC8 — zählt lueckenCount korrekt', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_1, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN' }, '2026-04-27T08:00:00.000Z'),
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_2, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN' }, '2026-04-27T08:00:00.000Z'),
    ]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([{ ...makeQuittungRow(GROUP_A, EINHEIT_1), lueckeGemeldet: true, lueckeNotiz: 'Stiefel 44 fehlt' }]));

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    const entry = result.value![0];
    expect(entry.propagationGroupId).toBe(GROUP_A);
    expect(entry.lueckenCount).toBe(1);
    expect(entry.ackCount).toBe(1);
    expect(entry.totalCount).toBe(2);
    expect(entry.status).toBe('partial');
  });

  it('Story 3.6 AC8 (Filter-Patch) — behält Bekanntgaben mit lueckenCount > 0 sichtbar, auch wenn ackCount === totalCount', async () => {
    // Beide Empfänger haben "geantwortet" (lueckeGemeldet = Quittung implizit),
    // aber lueckenCount > 0 ⇒ Eintrag bleibt in der Liste sichtbar (sonst tot
    // für AC13: Sicherheitsbeauftragter sieht die Lücken nirgends).
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_1, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN' }, '2026-04-27T08:00:00.000Z'),
    ]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([{ ...makeQuittungRow(GROUP_A, EINHEIT_1), lueckeGemeldet: true, lueckeNotiz: 'fehlt' }]));

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    const entries = result.value!;
    expect(entries).toHaveLength(1);
    expect(entries[0].lueckenCount).toBe(1);
    // Status mappt auf `partial`, weil die Lücke noch organisatorisch zu klären ist.
    expect(entries[0].status).toBe('partial');
  });

  it('Story 3.6 AC8 — lueckenCount = 0, wenn keine Lücke gemeldet wurde', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_1, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN' }, '2026-04-27T08:00:00.000Z'),
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_2, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'CBRN' }, '2026-04-27T08:00:00.000Z'),
    ]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([makeQuittungRow(GROUP_A, EINHEIT_1)]));

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value![0].lueckenCount).toBe(0);
  });

  it('seit-Filter wirkt — übergebenes ISO wird gegen `occurredAt` gefiltert', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([]);

    const seit = '2026-04-27T00:00:00.000Z';
    await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID, seit));

    const args = prisma.outboxEvent.findMany.mock.calls[0][0];
    expect(args.where.occurredAt).toEqual({ gte: new Date(seit) });
    // Cross-Einsatz-Schutz greift bereits in der DB-Where-Klausel
    // (Spec AC15 + Code-Review-Patch P3).
    expect(args.where.payload).toEqual({ path: ['einsatzId'], equals: EINSATZ_ID });
    // DoS-Schutz: explizites take-Limit.
    expect(args.take).toBeGreaterThan(0);
  });

  it('Default-`seit` setzt `now() - 24h`, wenn der Caller keinen Wert übergibt', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([]);
    const before = Date.now();

    await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    const after = Date.now();
    const args = prisma.outboxEvent.findMany.mock.calls[0][0];
    const seit = args.where.occurredAt.gte as Date;
    expect(seit).toBeInstanceOf(Date);
    // Toleranz: 24h zurück, ± Test-Laufzeit.
    expect(seit.getTime()).toBeGreaterThanOrEqual(before - 24 * 60 * 60 * 1000 - 1000);
    expect(seit.getTime()).toBeLessThanOrEqual(after - 24 * 60 * 60 * 1000 + 1000);
  });

  it('ignoriert Events anderer Einsätze (Cross-Einsatz-Schutz im JS-Filter)', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: 'fremder-einsatz', einheitId: EINHEIT_1, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'X' }, '2026-04-27T08:00:00.000Z'),
    ]);

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('reicht Repository-Fehler als Result.fail durch', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      makeOutboxRow({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_1, propagationGroupId: GROUP_A, profil: 'BASIS', aktion: 'AKTIVIERT', begruendung: 'X' }, '2026-04-27T08:00:00.000Z'),
    ]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:db down'));

    const result = await handler.execute(new ListOffenePsaBekanntgabenQuery(EINSATZ_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError/);
  });
});
