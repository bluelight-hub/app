// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SICHERHEITSREGEL_QUITTUNG_REPOSITORY, SICHERHEITSREGEL_REPOSITORY } from '@infrastructure/di-tokens';
import { ACK_SICHERHEITSREGEL_ERROR_CODES, AckSicherheitsregelHandler } from '../ack-sicherheitsregel.handler';
import { AckSicherheitsregelCommand } from '../ack-sicherheitsregel.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const REGEL_ID = 'clw3h8x9y0000qwertyui000re';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const EINSATZ_PERSON_ID = 'clw3h8x9y0000qwertyui000pp';

function buildAggregate(overrides: { einheitId?: string | null; istAktiv?: boolean; version?: number } = {}): Sicherheitsregel {
  const result = Sicherheitsregel.reconstitute({
    id: REGEL_ID,
    einsatzId: EINSATZ_ID,
    einheitId: overrides.einheitId === undefined ? EINHEIT_ID : overrides.einheitId,
    titel: 'Test-Regel',
    inhalt: 'Test-Inhalt',
    version: overrides.version ?? 1,
    erstelltVonUserId: USER_ID,
    aktualisiertVonUserId: USER_ID,
    istAktiv: overrides.istAktiv ?? true,
  });
  return result.value!;
}

describe('AckSicherheitsregelHandler (Story 2.7)', () => {
  let handler: AckSicherheitsregelHandler;
  let sicherheitsregelRepo: { findActiveById: jest.Mock };
  let quittungRepo: { upsert: jest.Mock; findByRegel: jest.Mock; findByRegelAndEinheit: jest.Mock };
  let teilnehmerRepo: { findByEinsatzAndUser: jest.Mock };
  let einheitRepo: { existsPersonenZuordnung: jest.Mock };
  let outboxRepo: { save: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;
  let txMock: { outboxEvent: { findFirst: jest.Mock } };

  beforeEach(async () => {
    txMock = { outboxEvent: { findFirst: jest.fn().mockResolvedValue({ payload: { propagationGroupId: 'propgroup-from-outbox' } }) } };
    sicherheitsregelRepo = { findActiveById: jest.fn() };
    quittungRepo = {
      upsert: jest.fn(),
      findByRegel: jest.fn(),
      findByRegelAndEinheit: jest.fn(),
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
        AckSicherheitsregelHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: SICHERHEITSREGEL_REPOSITORY, useValue: sicherheitsregelRepo },
        { provide: SICHERHEITSREGEL_QUITTUNG_REPOSITORY, useValue: quittungRepo },
        { provide: EINSATZ_TEILNEHMER_REPOSITORY, useValue: teilnehmerRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(AckSicherheitsregelHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy single) quittiert eine einheitenspezifische Regel und schreibt ein Event mit propagationGroupId aus der Outbox', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(buildAggregate()));
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: true,
        quittung: {
          id: 'q-1',
          regelId: REGEL_ID,
          einheitId: EINHEIT_ID,
          einheitName: '1. Sangruppe',
          quittiertAm: new Date(),
          quittiertVonUserId: USER_ID,
        },
      }),
    );

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.alreadyAcknowledged).toBe(false);
    expect(quittungRepo.upsert).toHaveBeenCalledWith(expect.anything(), {
      regelId: REGEL_ID,
      einheitId: EINHEIT_ID,
      quittiertVonUserId: USER_ID,
    });
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const [events] = outboxRepo.save.mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(SicherheitsregelQuittiertEvent);
    expect(events[0].propagationGroupId).toBe('propgroup-from-outbox');
    expect(events[0].einheitId).toBe(EINHEIT_ID);
  });

  it('(Happy einsatzweit) quittiert eine einsatzweite Regel mit beliebiger Einheit', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(buildAggregate({ einheitId: null })));
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: true,
        quittung: { id: 'q-1', regelId: REGEL_ID, einheitId: EINHEIT_ID, einheitName: '1. Sangruppe', quittiertAm: new Date(), quittiertVonUserId: USER_ID },
      }),
    );

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
  });

  it('(Idempotent Re-Ack) liefert alreadyAcknowledged=true und schreibt KEIN Event in die Outbox', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(buildAggregate()));
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: false,
        quittung: { id: 'q-1', regelId: REGEL_ID, einheitId: EINHEIT_ID, einheitName: '1. Sangruppe', quittiertAm: new Date(), quittiertVonUserId: USER_ID },
      }),
    );

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.alreadyAcknowledged).toBe(true);
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(NotFound:Sicherheitsregel) wenn findActiveById null liefert (deprecated oder fremder Einsatz)', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND);
    expect(quittungRepo.upsert).not.toHaveBeenCalled();
  });

  it('(Caller without Teilnehmer) liefert UnzulaessigeEinheitenZuordnung wenn der User keinen Teilnehmer-Eintrag hat', async () => {
    teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue(null);

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_SICHERHEITSREGEL_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    expect(sicherheitsregelRepo.findActiveById).not.toHaveBeenCalled();
  });

  it('(Caller in fremder Einheit) liefert UnzulaessigeEinheitenZuordnung wenn die EinsatzPerson nicht in einheitId ist', async () => {
    einheitRepo.existsPersonenZuordnung.mockResolvedValue(false);

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ACK_SICHERHEITSREGEL_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
  });

  it('(OCC mismatch) liefert ConflictDetected:Sicherheitsregel:current=<n> bei expectedRegelVersion-Mismatch', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(buildAggregate({ version: 3 })));

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID, 2));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^ConflictDetected:Sicherheitsregel:current=3$/);
    expect(quittungRepo.upsert).not.toHaveBeenCalled();
  });

  it('(Aggregate-Match-Fail) liefert RegelTrifftNichtAufEinheit wenn die einheitId nicht zur konkreten Regel passt', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(buildAggregate({ einheitId: 'andere-einheit-id' })));

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:RegelTrifftNichtAufEinheit');
  });

  it('(propagationGroupId fallback) loggt Warning und persistiert null wenn kein Outbox-Event existiert', async () => {
    sicherheitsregelRepo.findActiveById.mockResolvedValue(Result.ok(buildAggregate()));
    quittungRepo.upsert.mockResolvedValue(
      Result.ok({
        created: true,
        quittung: { id: 'q-1', regelId: REGEL_ID, einheitId: EINHEIT_ID, einheitName: '1. Sangruppe', quittiertAm: new Date(), quittiertVonUserId: USER_ID },
      }),
    );
    txMock.outboxEvent.findFirst.mockResolvedValue(null);

    const result = await handler.execute(new AckSicherheitsregelCommand(EINSATZ_ID, REGEL_ID, EINHEIT_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('keine SicherheitsregelAusgerufen-Outbox-Row'), expect.any(Object));
    const [events] = outboxRepo.save.mock.calls[0];
    expect(events[0].propagationGroupId).toBeNull();
  });
});
