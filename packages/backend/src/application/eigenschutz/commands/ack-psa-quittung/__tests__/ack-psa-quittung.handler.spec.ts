// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ACK_PSA_QUITTUNG_ERROR_CODES, AckPsaQuittungHandler } from '../ack-psa-quittung.handler';
import { AckPsaQuittungCommand } from '../ack-psa-quittung.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyuipgrp01';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const EINSATZ_PERSON_ID = 'clw3h8x9y0000qwertyui000pp';
const QUITTIERT_AM = new Date('2026-04-27T08:42:13.000Z');

describe('AckPsaQuittungHandler (Story 3.4)', () => {
  let handler: AckPsaQuittungHandler;
  let quittungRepo: { upsert: jest.Mock; findByGroup: jest.Mock; findByEinsatzAndGroup: jest.Mock };
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
        AckPsaQuittungHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: PSA_PROFIL_QUITTUNG_REPOSITORY, useValue: quittungRepo },
        { provide: EINSATZ_TEILNEHMER_REPOSITORY, useValue: teilnehmerRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(AckPsaQuittungHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy-Path) quittiert die Bekanntgabe-Gruppe und schreibt ein QuittungAbgegebenEvent', async () => {
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: true,
        row: {
          id: 'q-1',
          propagationGroupId: PROPAGATION_GROUP_ID,
          einsatzId: EINSATZ_ID,
          einheitId: EINHEIT_ID,
          quittiertAm: QUITTIERT_AM,
          quittiertVonUserId: USER_ID,
          lueckeGemeldet: false,
          lueckeNotiz: null,
        },
      }),
    );

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.alreadyAcknowledged).toBe(false);
    expect(quittungRepo.upsert).toHaveBeenCalledWith(expect.anything(), {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
    });
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const [events] = outboxRepo.save.mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(QuittungAbgegebenEvent);
    expect(events[0].propagationGroupId).toBe(PROPAGATION_GROUP_ID);
    expect(events[0].einheitId).toBe(EINHEIT_ID);
    expect(events[0].einsatzId).toBe(EINSATZ_ID);
    expect(events[0].userId).toBe(USER_ID);
    expect(events[0].quittiertAm).toEqual(QUITTIERT_AM);
  });

  it('(Idempotent Re-Ack) liefert alreadyAcknowledged=true und schreibt KEIN Event in die Outbox', async () => {
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: false,
        row: {
          id: 'q-1',
          propagationGroupId: PROPAGATION_GROUP_ID,
          einsatzId: EINSATZ_ID,
          einheitId: EINHEIT_ID,
          quittiertAm: QUITTIERT_AM,
          quittiertVonUserId: USER_ID,
          lueckeGemeldet: false,
          lueckeNotiz: null,
        },
      }),
    );

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.alreadyAcknowledged).toBe(true);
    expect(outboxRepo.save).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('idempotent'), expect.any(Object));
  });

  it('(Caller without Teilnehmer) liefert UnzulaessigeEinheitenZuordnung wenn der User keinen Teilnehmer-Eintrag hat', async () => {
    teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue(null);

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    expect(quittungRepo.upsert).not.toHaveBeenCalled();
    expect(txMock.outboxEvent.findFirst).not.toHaveBeenCalled();
  });

  it('(Caller in fremder Einheit) liefert UnzulaessigeEinheitenZuordnung wenn die EinsatzPerson nicht in einheitId ist', async () => {
    einheitRepo.existsPersonenZuordnung.mockResolvedValue(false);

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    expect(quittungRepo.upsert).not.toHaveBeenCalled();
  });

  it('(Caller-Teilnehmer aus fremdem Einsatz) liefert UnzulaessigeEinheitenZuordnung — Defense-in-Depth', async () => {
    teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue({
      id: 't-1',
      einsatzId: 'fremder-einsatz',
      userId: USER_ID,
      einsatzPersonId: EINSATZ_PERSON_ID,
      personVorname: 'Max',
      personNachname: 'Müller',
      personFunkrufname: null,
      personFunktion: 'Helfer',
      joinedAt: new Date(),
      leftAt: null,
    });

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    expect(einheitRepo.existsPersonenZuordnung).not.toHaveBeenCalled();
  });

  it('(Bereits ausgeschiedener Teilnehmer) liefert UnzulaessigeEinheitenZuordnung wenn leftAt gesetzt ist', async () => {
    teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue({
      id: 't-1',
      einsatzId: EINSATZ_ID,
      userId: USER_ID,
      einsatzPersonId: EINSATZ_PERSON_ID,
      personVorname: 'Max',
      personNachname: 'Müller',
      personFunkrufname: null,
      personFunktion: 'Helfer',
      joinedAt: new Date('2026-04-27T08:00:00.000Z'),
      leftAt: new Date('2026-04-27T18:00:00.000Z'),
    });

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    expect(einheitRepo.existsPersonenZuordnung).not.toHaveBeenCalled();
  });

  it('(NotFound:PsaPropagation) wenn keine PsaProfilGeaendert-Outbox-Row für (group, einheit) existiert', async () => {
    // Prisma-JSON-Filter `{ payload: { path: [...], equals: ... } }` matcht
    // exakt — wenn keine Row mit (propagationGroupId, einheitId) existiert,
    // liefert findFirst null. Den DB-Filter testen wir hier durch Null-Antwort.
    txMock.outboxEvent.findFirst.mockResolvedValue(null);

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_PSA_QUITTUNG_ERROR_CODES.NOT_FOUND_PROPAGATION);
    expect(quittungRepo.upsert).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('keine PsaProfilGeaendert-Outbox-Row'), expect.any(Object));
  });

  it('(Outbox-Filter sucht nach eigenschutz.psa_profil_geaendert) — keine andere Event-Quelle', async () => {
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: true,
        row: {
          id: 'q-1',
          propagationGroupId: PROPAGATION_GROUP_ID,
          einsatzId: EINSATZ_ID,
          einheitId: EINHEIT_ID,
          quittiertAm: QUITTIERT_AM,
          quittiertVonUserId: USER_ID,
          lueckeGemeldet: false,
          lueckeNotiz: null,
        },
      }),
    );

    await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    const args = txMock.outboxEvent.findFirst.mock.calls[0][0];
    expect(args.where.eventName).toBe(PsaProfilGeaendertEvent.eventName());
    // Spec AC2: Filter muss propagationGroupId UND einheitId in der DB-Query
    // enthalten, sonst skaliert der Lookup mit der Outbox-Größe.
    expect(args.where.AND).toEqual([{ payload: { path: ['propagationGroupId'], equals: PROPAGATION_GROUP_ID } }, { payload: { path: ['einheitId'], equals: EINHEIT_ID } }]);
  });

  it('(Tx-Rollback bei Repo-Fehler) — InfrastructureError-Sentinel propagiert nach außen', async () => {
    quittungRepo.upsert.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:db down'));

    const result = await handler.execute(new AckPsaQuittungCommand(EINSATZ_ID, PROPAGATION_GROUP_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:PsaProfilQuittung/);
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });
});
