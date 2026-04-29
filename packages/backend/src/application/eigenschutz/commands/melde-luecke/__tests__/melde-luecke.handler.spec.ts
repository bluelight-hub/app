// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { MELDE_LUECKE_ERROR_CODES, MeldeLueckeHandler } from '../melde-luecke.handler';
import { MeldeLueckeCommand } from '../melde-luecke.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyuipgrp01';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const EINSATZ_PERSON_ID = 'clw3h8x9y0000qwertyui000pp';
const NOTIZ = 'Schutzanzug Größe L fehlt — nachgeordert 14:28';

describe('MeldeLueckeHandler (Story 3.6)', () => {
  let handler: MeldeLueckeHandler;
  let quittungRepo: { upsertWithLuecke: jest.Mock; upsert: jest.Mock; findByGroup: jest.Mock; findByEinsatzAndGroup: jest.Mock };
  let teilnehmerRepo: { findByEinsatzAndUser: jest.Mock };
  let einheitRepo: { existsPersonenZuordnung: jest.Mock };
  let outboxRepo: { save: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;
  let txMock: { outboxEvent: { findFirst: jest.Mock } };

  beforeEach(async () => {
    txMock = {
      outboxEvent: {
        findFirst: jest.fn().mockResolvedValue({ id: 'outbox-row-1' }),
      },
    };
    quittungRepo = {
      upsertWithLuecke: jest.fn(),
      upsert: jest.fn(),
      findByGroup: jest.fn(),
      findByEinsatzAndGroup: jest.fn(),
    };
    teilnehmerRepo = {
      findByEinsatzAndUser: jest.fn().mockResolvedValue({
        id: 't-1',
        einsatzId: EINSATZ_ID,
        userId: USER_ID,
        einsatzPersonId: EINSATZ_PERSON_ID,
        personVorname: 'Max',
        personNachname: 'Müller',
        personFunkrufname: null,
        personFunktion: 'Helfer',
        joinedAt: new Date(),
        leftAt: null,
      }),
    };
    einheitRepo = { existsPersonenZuordnung: jest.fn().mockResolvedValue(true) };
    outboxRepo = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (callback) => callback(txMock)) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeldeLueckeHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: PSA_PROFIL_QUITTUNG_REPOSITORY, useValue: quittungRepo },
        { provide: EINSATZ_TEILNEHMER_REPOSITORY, useValue: teilnehmerRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(MeldeLueckeHandler);
  });

  afterEach(() => jest.clearAllMocks());

  function makeRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'q-1',
      propagationGroupId: PROPAGATION_GROUP_ID,
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      quittiertAm: new Date('2026-04-24T10:30:00.000Z'),
      quittiertVonUserId: USER_ID,
      lueckeGemeldet: true,
      lueckeNotiz: NOTIZ,
      ...overrides,
    };
  }

  it('(Happy-Path Create) legt Quittung mit Lücke an + emittiert LueckeGemeldetEvent', async () => {
    quittungRepo.upsertWithLuecke.mockResolvedValue(Result.ok({ created: true, row: makeRow() }));

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.created).toBe(true);
    expect(quittungRepo.upsertWithLuecke).toHaveBeenCalledWith(expect.anything(), {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
      lueckeNotiz: NOTIZ,
    });
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const savedEvents = outboxRepo.save.mock.calls[0][0];
    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]).toBeInstanceOf(LueckeGemeldetEvent);
    expect(savedEvents[0].meldung).toBe(NOTIZ);
    expect(savedEvents[0].propagationGroupId).toBe(PROPAGATION_GROUP_ID);
  });

  it('(Update-Pfad) zweiter Send mit anderer Notiz → Update der Notiz, created=false', async () => {
    const NEUE_NOTIZ = 'Korrektur: zusätzlich Stiefel 44 fehlt';
    quittungRepo.upsertWithLuecke.mockResolvedValue(Result.ok({ created: false, row: makeRow({ lueckeNotiz: NEUE_NOTIZ }) }));

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NEUE_NOTIZ, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.created).toBe(false);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    expect(outboxRepo.save.mock.calls[0][0]).toHaveLength(1); // genau ein Event auch im Update-Pfad
  });

  it('trimmt die Meldung vor Persistenz (Defense-in-Depth)', async () => {
    quittungRepo.upsertWithLuecke.mockResolvedValue(Result.ok({ created: true, row: makeRow() }));

    await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, `   ${NOTIZ}   `, USER_ID));

    expect(quittungRepo.upsertWithLuecke).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lueckeNotiz: NOTIZ }));
  });

  it('(BusinessRule:LueckeNotizLeer) lehnt Whitespace-only-Submit ab', async () => {
    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, '   \t  \n', USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(MELDE_LUECKE_ERROR_CODES.LUECKE_NOTIZ_LEER);
    expect(quittungRepo.upsertWithLuecke).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(NotFound:PsaPropagation) fehlt eine PsaProfilGeaendert-Outbox-Row', async () => {
    txMock.outboxEvent.findFirst = jest.fn().mockResolvedValue(null);

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(MELDE_LUECKE_ERROR_CODES.NOT_FOUND_PROPAGATION);
    expect(quittungRepo.upsertWithLuecke).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(BusinessRule:UnzulaessigeEinheitenZuordnung) lehnt nicht-Mitglieder der Einheit ab', async () => {
    einheitRepo.existsPersonenZuordnung = jest.fn().mockResolvedValue(false);

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(MELDE_LUECKE_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(BusinessRule:UnzulaessigeEinheitenZuordnung) lehnt ausgeschiedene Teilnehmer (leftAt !== null) ab', async () => {
    teilnehmerRepo.findByEinsatzAndUser = jest.fn().mockResolvedValue({
      id: 't-1',
      einsatzId: EINSATZ_ID,
      einsatzPersonId: EINSATZ_PERSON_ID,
      leftAt: new Date(),
    });

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(MELDE_LUECKE_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
  });

  it('(BusinessRule:UnzulaessigeEinheitenZuordnung) lehnt ohne Teilnehmer-Bindung ab', async () => {
    teilnehmerRepo.findByEinsatzAndUser = jest.fn().mockResolvedValue(null);

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(MELDE_LUECKE_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
  });

  it('(InfrastructureError) wrappt Repository-Fehler in InfrastructureError-Sentinel', async () => {
    quittungRepo.upsertWithLuecke.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:Luecke:connection-lost'));

    const result = await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:PsaProfilQuittung');
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(Tx-Rollback) bei Repository-Fehler kein verwaistes Event in der Outbox', async () => {
    quittungRepo.upsertWithLuecke.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:Luecke:boom'));

    await handler.execute(new MeldeLueckeCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, NOTIZ, USER_ID));

    // Wir prüfen nur, dass kein Event-Save lief — der Tx-Wrapper rollt
    // tatsächliche DB-Writes bei Result.fail zurück; im Mock-Test reicht
    // dass `save` nicht gerufen wurde.
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });
});
