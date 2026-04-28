// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ListPsaQuittungenHandler } from '../list-psa-quittungen.handler';
import { ListPsaQuittungenQuery } from '../list-psa-quittungen.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyuipgrp01';
const EINHEIT_A = 'clw3h8x9y0000qwertyui00050';
const EINHEIT_B = 'clw3h8x9y0000qwertyui00051';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

describe('ListPsaQuittungenHandler (Story 3.4 AC8)', () => {
  let handler: ListPsaQuittungenHandler;
  let prisma: { outboxEvent: { findMany: jest.Mock } };
  let quittungRepo: { findByEinsatzAndGroup: jest.Mock };
  let einheitRepo: { findByEinsatzId: jest.Mock };

  beforeEach(async () => {
    prisma = { outboxEvent: { findMany: jest.fn() } };
    quittungRepo = { findByEinsatzAndGroup: jest.fn() };
    einheitRepo = {
      findByEinsatzId: jest.fn().mockResolvedValue(
        Result.ok([
          { id: EINHEIT_A, name: '1. Sanitätsgruppe' },
          { id: EINHEIT_B, name: '2. Sanitätsgruppe' },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPsaQuittungenHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: PSA_PROFIL_QUITTUNG_REPOSITORY, useValue: quittungRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
      ],
    }).compile();

    handler = module.get(ListPsaQuittungenHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('liefert pro erwartetem Empfänger genau einen Eintrag und leitet den Status korrekt ab', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      { payload: { propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_A, profil: 'BASIS', aktion: 'AKTIVIERT' } },
      { payload: { propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_B, profil: 'BASIS', aktion: 'AKTIVIERT' } },
    ]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(
      Result.ok([
        {
          id: 'q-1',
          propagationGroupId: PROPAGATION_GROUP_ID,
          einsatzId: EINSATZ_ID,
          einheitId: EINHEIT_A,
          quittiertAm: new Date('2026-04-27T08:42:13.000Z'),
          quittiertVonUserId: USER_ID,
          lueckeGemeldet: false,
          lueckeNotiz: null,
        },
      ]),
    );

    const result = await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(result.isSuccess).toBe(true);
    const entries = result.value!;
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      einheitId: EINHEIT_A,
      einheitName: '1. Sanitätsgruppe',
      status: 'QUITTIERT',
      quittiertAm: '2026-04-27T08:42:13.000Z',
      quittiertVonUserId: USER_ID,
    });
    expect(entries[1]).toEqual({
      einheitId: EINHEIT_B,
      einheitName: '2. Sanitätsgruppe',
      status: 'AUSSTEHEND',
    });
  });

  it('filtert Outbox-Events DB-seitig auf eventName + propagationGroupId + einsatzId', async () => {
    // Prisma-JSON-Filter werden direkt an die DB geschickt — der Test
    // verifiziert die Where-Shape statt In-Memory-Filterung. Die DB-Antwort
    // ist hier bereits gefiltert (einzelne Match-Row).
    prisma.outboxEvent.findMany.mockResolvedValue([{ payload: { einheitId: EINHEIT_A } }]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([]));

    const result = await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value![0].einheitId).toBe(EINHEIT_A);
    const where = prisma.outboxEvent.findMany.mock.calls[0][0].where;
    expect(where.eventName).toBe(PsaProfilGeaendertEvent.eventName());
    expect(where.AND).toEqual([{ payload: { path: ['propagationGroupId'], equals: PROPAGATION_GROUP_ID } }, { payload: { path: ['einsatzId'], equals: EINSATZ_ID } }]);
  });

  it('Cross-Einsatz-Schutz: Repository wird mit einsatzId aufgerufen', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([{ payload: { propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_A } }]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([]));

    await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(quittungRepo.findByEinsatzAndGroup).toHaveBeenCalledWith(EINSATZ_ID, PROPAGATION_GROUP_ID);
  });

  it('liefert eine leere Liste, wenn die Outbox kein passendes Event enthält', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([]);

    const result = await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(quittungRepo.findByEinsatzAndGroup).not.toHaveBeenCalled();
  });

  it('reicht Repository-Fehler als Result.fail durch', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([{ payload: { propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_A } }]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:db down'));

    const result = await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError/);
  });

  it('liefert lokalisierten Platzhalter, wenn die Einheit nicht mehr im Einsatz existiert', async () => {
    // Einheit B existiert in der Outbox (Bekanntgabe ging raus), wurde aber
    // zwischenzeitlich gelöscht und ist nicht mehr im findByEinsatzId-Ergebnis.
    prisma.outboxEvent.findMany.mockResolvedValue([{ payload: { propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_B } }]);
    einheitRepo.findByEinsatzId.mockResolvedValue(Result.ok([{ id: EINHEIT_A, name: '1. Sanitätsgruppe' }]));
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([]));

    const result = await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value![0].einheitName).toBe('Einheit nicht verfügbar');
  });

  it('reicht Einheits-Repo-Fehler als Result.fail durch (statt rohe CUID2 zu liefern)', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([{ payload: { einheitId: EINHEIT_A } }]);
    quittungRepo.findByEinsatzAndGroup.mockResolvedValue(Result.ok([]));
    einheitRepo.findByEinsatzId.mockResolvedValue(Result.fail('InfrastructureError:EinsatzEinheit:db down'));

    const result = await handler.execute(new ListPsaQuittungenQuery(EINSATZ_ID, PROPAGATION_GROUP_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError/);
  });
});
