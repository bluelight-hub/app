import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SICHERHEITSREGEL_REPOSITORY, SICHERHEITSREGEL_VERSION_REPOSITORY } from '@infrastructure/di-tokens';
import { CreateSicherheitsregelHandler, CREATE_SICHERHEITSREGEL_ERROR_CODES } from '../create-sicherheitsregel.handler';
import { CreateSicherheitsregelCommand } from '../create-sicherheitsregel.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_A = 'clw3h8x9y0000qwertyui000aa';
const EINHEIT_B = 'clw3h8x9y0000qwertyui000bb';
const EINHEIT_C = 'clw3h8x9y0000qwertyui000cc';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

function buildCommand(overrides: Partial<Parameters<typeof CreateSicherheitsregelCommand.create>[0]> = {}): CreateSicherheitsregelCommand {
  const result = CreateSicherheitsregelCommand.create({
    einsatzId: EINSATZ_ID,
    createdBy: USER_ID,
    titel: 'Atemschutzträger melden',
    inhalt: 'Alle Atemschutzträger melden sich beim Einsatzleiter.',
    einheitIds: null,
    ...overrides,
  });
  return result.value!;
}

describe('CreateSicherheitsregelHandler', () => {
  let handler: CreateSicherheitsregelHandler;
  let sicherheitsregelRepo: { save: jest.Mock; findById: jest.Mock; findReadModelById: jest.Mock; findActiveByEinsatz: jest.Mock; deprecate: jest.Mock; updateWithNewVersion: jest.Mock };
  let versionRepo: { saveInitialVersion: jest.Mock; saveNewVersion: jest.Mock; closeCurrentVersion: jest.Mock };
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
    sicherheitsregelRepo = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findReadModelById: jest.fn(),
      findActiveByEinsatz: jest.fn(),
      deprecate: jest.fn(),
      updateWithNewVersion: jest.fn(),
    };
    versionRepo = {
      saveInitialVersion: jest.fn().mockResolvedValue(Result.ok(undefined)),
      saveNewVersion: jest.fn(),
      closeCurrentVersion: jest.fn(),
    };
    einheitRepo = {
      findById: jest.fn().mockImplementation(async (einheitId: string) => Result.ok({ id: einheitId, einsatzId: EINSATZ_ID })),
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
    prisma = { $transaction: jest.fn().mockImplementation(async (callback) => callback({})) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSicherheitsregelHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: SICHERHEITSREGEL_REPOSITORY, useValue: sicherheitsregelRepo },
        { provide: SICHERHEITSREGEL_VERSION_REPOSITORY, useValue: versionRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(CreateSicherheitsregelHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy-Einsatzweit) erzeugt genau eine Row mit einheitId=null und eine initiale Version-Zeile', async () => {
    const result = await handler.execute(buildCommand({ einheitIds: null }));

    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value).toHaveLength(1);

    expect(einheitRepo.findById).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.save).toHaveBeenCalledTimes(1);
    expect(versionRepo.saveInitialVersion).toHaveBeenCalledTimes(1);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);

    const savedAggregate = sicherheitsregelRepo.save.mock.calls[0][0];
    expect(savedAggregate.einheitId).toBeNull();
    expect(savedAggregate.einsatzweit).toBe(true);
    expect(savedAggregate.version).toBe(1);

    const versionArgs = versionRepo.saveInitialVersion.mock.calls[0][0];
    expect(versionArgs.version).toBe(1);
    expect(versionArgs.titel).toBe('Atemschutzträger melden');
    expect(versionArgs.changedByUserId).toBe(USER_ID);
    expect(versionArgs.eventId).toBeTruthy();
  });

  it('(Happy-Fanout) Multi-Einheiten-Create erzeugt pro Einheit eine Row mit identischer propagationGroupId', async () => {
    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A, EINHEIT_B, EINHEIT_C] }));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(3);

    expect(einheitRepo.findById).toHaveBeenCalledTimes(3);
    expect(sicherheitsregelRepo.save).toHaveBeenCalledTimes(3);
    expect(versionRepo.saveInitialVersion).toHaveBeenCalledTimes(3);

    // Alle drei Aggregates hängen am identischen propagationGroupId aus dem Event
    const outboxArgs = outboxRepo.save.mock.calls[0][0];
    expect(outboxArgs).toHaveLength(3);
    const propagationGroupIds = outboxArgs.map((event: SicherheitsregelAusgerufenEvent) => event.propagationGroupId);
    expect(propagationGroupIds[0]).toBeTruthy();
    expect(new Set(propagationGroupIds).size).toBe(1);

    // Jede Row hat eine andere einheitId
    const einheitIds = sicherheitsregelRepo.save.mock.calls.map((call) => call[0].einheitId);
    expect(new Set(einheitIds)).toEqual(new Set([EINHEIT_A, EINHEIT_B, EINHEIT_C]));

    // Events sind SicherheitsregelAusgerufenEvent mit `{created: true}`
    for (const event of outboxArgs) {
      expect(event).toBeInstanceOf(SicherheitsregelAusgerufenEvent);
      expect(event.changedFields).toEqual({ created: true });
      expect(event.fromVersion).toBeNull();
      expect(event.toVersion).toBe(1);
    }
  });

  it('(404 EINHEIT_NOT_FOUND) eine Einheit existiert nicht → kein Save, kein Event, saubere Fehlermeldung', async () => {
    einheitRepo.findById.mockImplementation(async (einheitId: string) => {
      if (einheitId === EINHEIT_B) return Result.ok(null);
      return Result.ok({ id: einheitId, einsatzId: EINSATZ_ID });
    });

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A, EINHEIT_B, EINHEIT_C] }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(CREATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND);
    expect(sicherheitsregelRepo.save).not.toHaveBeenCalled();
    expect(versionRepo.saveInitialVersion).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(404 EINHEIT_NOT_FOUND) Einheit gehört zu anderem Einsatz → NotFound', async () => {
    einheitRepo.findById.mockImplementation(async (einheitId: string) => {
      if (einheitId === EINHEIT_A) return Result.ok({ id: einheitId, einsatzId: 'clw3h8x9y0000qwertyui99999' });
      return Result.ok({ id: einheitId, einsatzId: EINSATZ_ID });
    });

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A] }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(CREATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND);
    expect(sicherheitsregelRepo.save).not.toHaveBeenCalled();
  });

  it('persistiert Outbox-Event mit Propagation-Gruppen-ID pro Single-Einheit-Create', async () => {
    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A] }));

    expect(result.isSuccess).toBe(true);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);

    const outboxArgs = outboxRepo.save.mock.calls[0][0];
    expect(outboxArgs).toHaveLength(1);
    const event = outboxArgs[0] as SicherheitsregelAusgerufenEvent;
    expect(event).toBeInstanceOf(SicherheitsregelAusgerufenEvent);
    expect(event.propagationGroupId).toBeTruthy();
    expect(event.regelId).toBe(result.value![0]);
  });
});
