// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
  KRAEFTE_REPOSITORIES,
  LOGGER,
  OUTBOX_REPOSITORY,
} from '@infrastructure/di-tokens';
import { CreateGefaehrdungsbeurteilungHandler, CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES } from '../create-gefaehrdungsbeurteilung.handler';
import { CreateGefaehrdungsbeurteilungCommand } from '../create-gefaehrdungsbeurteilung.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const VORLAGE_ID = 'clw3h8x9y0000qwertyui00111';

function buildCommand(overrides: Partial<Parameters<typeof CreateGefaehrdungsbeurteilungCommand.create>[0]> = {}): CreateGefaehrdungsbeurteilungCommand {
  const result = CreateGefaehrdungsbeurteilungCommand.create({
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    createdBy: USER_ID,
    ...overrides,
  });
  return result.value!;
}

describe('CreateGefaehrdungsbeurteilungHandler', () => {
  let handler: CreateGefaehrdungsbeurteilungHandler;
  let beurteilungRepo: {
    save: jest.Mock;
    findById: jest.Mock;
    existsForEinheit: jest.Mock;
  };
  let versionRepo: { saveInitialVersion: jest.Mock };
  let vorlageRepo: { findById: jest.Mock; findAktive: jest.Mock };
  let einheitRepo: {
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    existsPersonenZuordnung: jest.Mock;
    savePersonenZuordnung: jest.Mock;
    removePersonenZuordnung: jest.Mock;
    countChildren: jest.Mock;
    countPersonen: jest.Mock;
  };
  let outboxRepo: { save: jest.Mock; findPendingEvents: jest.Mock; markAsPublished: jest.Mock; markAsFailed: jest.Mock; getRetryCount: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    beurteilungRepo = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      existsForEinheit: jest.fn().mockResolvedValue(Result.ok(false)),
    };
    versionRepo = { saveInitialVersion: jest.fn().mockResolvedValue(Result.ok(undefined)) };
    vorlageRepo = { findById: jest.fn(), findAktive: jest.fn() };
    einheitRepo = {
      findById: jest.fn().mockResolvedValue(Result.ok({ id: EINHEIT_ID, einsatzId: EINSATZ_ID })),
      findByEinsatzId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsPersonenZuordnung: jest.fn(),
      savePersonenZuordnung: jest.fn(),
      removePersonenZuordnung: jest.fn(),
      countChildren: jest.fn(),
      countPersonen: jest.fn(),
    };
    outboxRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };
    prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback({})),
    };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGefaehrdungsbeurteilungHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, useValue: beurteilungRepo },
        { provide: GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, useValue: versionRepo },
        { provide: GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY, useValue: vorlageRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(CreateGefaehrdungsbeurteilungHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('(Happy-Path Leer) erstellt Aggregate ohne Vorlage, speichert Version und persistiert Event im Outbox', async () => {
    const result = await handler.execute(buildCommand());

    expect(result.isSuccess).toBe(true);
    expect(typeof result.value).toBe('string');
    expect(beurteilungRepo.existsForEinheit).toHaveBeenCalledWith(EINSATZ_ID, EINHEIT_ID, expect.anything());
    expect(beurteilungRepo.save).toHaveBeenCalledTimes(1);
    expect(versionRepo.saveInitialVersion).toHaveBeenCalledTimes(1);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);

    const versionArgs = versionRepo.saveInitialVersion.mock.calls[0][0];
    expect(versionArgs.version).toBe(1);
    expect(versionArgs.changedFields).toEqual({ created: true });
    expect(versionArgs.items).toEqual([]);
    expect(versionArgs.eventId).toBeTruthy();

    const outboxArgs = outboxRepo.save.mock.calls[0][0];
    expect(Array.isArray(outboxArgs)).toBe(true);
    expect(outboxArgs).toHaveLength(1);
    expect(vorlageRepo.findById).not.toHaveBeenCalled();
  });

  it('(Happy-Path Vorlage) kopiert Items per Deep-Clone und übernimmt sie in die Version-Zeile', async () => {
    const vorlagenItems = [GefaehrdungItem.create({ title: 'Stolperfalle' }).value!, GefaehrdungItem.create({ title: 'Chemikalien', schutzmassnahmen: 'Handschuhe' }).value!];
    vorlageRepo.findById.mockResolvedValue(Result.ok({ id: VORLAGE_ID, slug: 'manv', name: 'MANV', szenario: 'MANV', items: vorlagenItems, version: 1, aktiv: true, erstelltAm: new Date() }));

    const result = await handler.execute(buildCommand({ vorlageId: VORLAGE_ID }));

    expect(result.isSuccess).toBe(true);
    expect(vorlageRepo.findById).toHaveBeenCalledWith(VORLAGE_ID, expect.anything());
    const versionArgs = versionRepo.saveInitialVersion.mock.calls[0][0];
    expect(versionArgs.items).toHaveLength(2);
    // Deep-Copy: die gespeicherten Items sind andere Instanzen als die Vorlagen-Items.
    expect(versionArgs.items[0]).not.toBe(vorlagenItems[0]);
  });

  it('(422) liefert BusinessRule-Code, wenn Einheit bereits eine Beurteilung hat', async () => {
    beurteilungRepo.existsForEinheit.mockResolvedValue(Result.ok(true));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_HAT_BEREITS_BEURTEILUNG);
    expect(beurteilungRepo.save).not.toHaveBeenCalled();
    expect(versionRepo.saveInitialVersion).not.toHaveBeenCalled();
  });

  it('(404) liefert NotFound-Code, wenn Vorlage nicht existiert', async () => {
    vorlageRepo.findById.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand({ vorlageId: VORLAGE_ID }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.VORLAGE_NOT_FOUND);
    expect(beurteilungRepo.save).not.toHaveBeenCalled();
  });

  it('(404) liefert NotFound:Einheit, wenn die Einheit nicht existiert', async () => {
    einheitRepo.findById.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_NOT_FOUND);
    expect(beurteilungRepo.existsForEinheit).not.toHaveBeenCalled();
    expect(beurteilungRepo.save).not.toHaveBeenCalled();
  });

  it('(404) liefert NotFound:Einheit, wenn die Einheit zu einem anderen Einsatz gehört (AC6)', async () => {
    einheitRepo.findById.mockResolvedValue(Result.ok({ id: EINHEIT_ID, einsatzId: 'clw3h8x9y0000qwertyui99999' }));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_NOT_FOUND);
    expect(beurteilungRepo.existsForEinheit).not.toHaveBeenCalled();
    expect(beurteilungRepo.save).not.toHaveBeenCalled();
  });
});
