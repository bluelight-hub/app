import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SICHERHEITSREGEL_CONFLICT_DETECTED, SICHERHEITSREGEL_NO_CHANGES_DETECTED, Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SICHERHEITSREGEL_REPOSITORY, SICHERHEITSREGEL_VERSION_REPOSITORY } from '@infrastructure/di-tokens';
import { UpdateSicherheitsregelHandler, UPDATE_SICHERHEITSREGEL_ERROR_CODES } from '../update-sicherheitsregel.handler';
import { UpdateSicherheitsregelCommand } from '../update-sicherheitsregel.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const REGEL_ID = 'clw3h8x9y0000qwertyui00077';
const EINHEIT_A = 'clw3h8x9y0000qwertyui000aa';
const EINHEIT_B = 'clw3h8x9y0000qwertyui000bb';
const EINHEIT_C = 'clw3h8x9y0000qwertyui000cc';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const PROPAGATION_GROUP_ID = 'grp3h8x9y0000qwertyui00111';

function buildAggregate(opts: { einheitId?: string | null; version?: number; titel?: string; inhalt?: string } = {}): Sicherheitsregel {
  const aggregate = Sicherheitsregel.create({
    id: REGEL_ID,
    einsatzId: EINSATZ_ID,
    einheitId: opts.einheitId === undefined ? EINHEIT_A : opts.einheitId,
    titel: opts.titel ?? 'Alter Titel',
    inhalt: opts.inhalt ?? 'Alter Inhalt',
    erstelltVonUserId: USER_ID,
    propagationGroupId: PROPAGATION_GROUP_ID,
  }).value!;
  const targetVersion = opts.version ?? 1;
  let currentVersion = 1;
  while (currentVersion < targetVersion) {
    // Künstliche Version-Inkrementierung via update (Titel/Inhalt alternieren).
    const updated = aggregate.update(
      { titel: `${opts.titel ?? 'Alter Titel'}-${currentVersion}`, inhalt: `${opts.inhalt ?? 'Alter Inhalt'}-${currentVersion}`, einheitId: aggregate.einheitId },
      currentVersion,
      USER_ID,
      PROPAGATION_GROUP_ID,
    );
    expect(updated.isSuccess).toBe(true);
    currentVersion += 1;
  }
  aggregate.clearDomainEvents();
  return aggregate;
}

function buildReadModel(opts: { einheitId?: string | null; version?: number; titel?: string; inhalt?: string } = {}) {
  const aggregate = buildAggregate(opts);
  return {
    aggregate,
    erstelltAm: new Date('2026-04-22T10:00:00.000Z'),
    aktualisiertAm: new Date('2026-04-22T10:15:00.000Z'),
    aktualisiertVonUserId: USER_ID,
    propagationGroupId: PROPAGATION_GROUP_ID,
  };
}

function buildCommand(overrides: Partial<Parameters<typeof UpdateSicherheitsregelCommand.create>[0]> = {}): UpdateSicherheitsregelCommand {
  return UpdateSicherheitsregelCommand.create({
    einsatzId: EINSATZ_ID,
    regelId: REGEL_ID,
    userId: USER_ID,
    expectedVersion: 1,
    titel: 'Neuer Titel',
    inhalt: 'Neuer Inhalt',
    einheitIds: [EINHEIT_A],
    ...overrides,
  }).value!;
}

describe('UpdateSicherheitsregelHandler', () => {
  let handler: UpdateSicherheitsregelHandler;
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
      deprecate: jest.fn().mockResolvedValue(Result.ok(undefined)),
      updateWithNewVersion: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };
    versionRepo = {
      saveInitialVersion: jest.fn().mockResolvedValue(Result.ok(undefined)),
      saveNewVersion: jest.fn().mockResolvedValue(Result.ok(undefined)),
      closeCurrentVersion: jest.fn().mockResolvedValue(Result.ok(undefined)),
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
        UpdateSicherheitsregelHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: SICHERHEITSREGEL_REPOSITORY, useValue: sicherheitsregelRepo },
        { provide: SICHERHEITSREGEL_VERSION_REPOSITORY, useValue: versionRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(UpdateSicherheitsregelHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy-In-Place) gleiche Einheit, nur Titel/Inhalt neu → Version inkrementiert, propagationGroupId bleibt erhalten', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, version: 1 })));

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A] }));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([REGEL_ID]);

    expect(sicherheitsregelRepo.updateWithNewVersion).toHaveBeenCalledTimes(1);
    expect(sicherheitsregelRepo.deprecate).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.save).not.toHaveBeenCalled();
    expect(versionRepo.saveNewVersion).toHaveBeenCalledTimes(1);
    expect(versionRepo.saveInitialVersion).not.toHaveBeenCalled();
    expect(versionRepo.closeCurrentVersion).not.toHaveBeenCalled();

    const versionArgs = versionRepo.saveNewVersion.mock.calls[0][0];
    expect(versionArgs.version).toBe(2);
    expect(versionArgs.titel).toBe('Neuer Titel');
    expect(versionArgs.inhalt).toBe('Neuer Inhalt');

    const outboxArgs = outboxRepo.save.mock.calls[0][0];
    expect(outboxArgs).toHaveLength(1);
    const event = outboxArgs[0] as SicherheitsregelAusgerufenEvent;
    expect(event.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
    expect(event.fromVersion).toBe(1);
    expect(event.toVersion).toBe(2);
    expect(event.changedFields.updated).toEqual(expect.arrayContaining(['titel', 'inhalt']));
  });

  it('(Happy-In-Place-Einsatzweit) einsatzweit bleibt einsatzweit → In-Place-Pfad, kein Einheiten-Lookup', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: null, version: 1 })));

    const result = await handler.execute(buildCommand({ einheitIds: null }));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([REGEL_ID]);
    expect(einheitRepo.findById).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.updateWithNewVersion).toHaveBeenCalledTimes(1);
    expect(sicherheitsregelRepo.deprecate).not.toHaveBeenCalled();
  });

  it('(404 REGEL_NOT_FOUND) fehlendes Read-Model → keine Mutation', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(UPDATE_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND);
    expect(sicherheitsregelRepo.updateWithNewVersion).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.save).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.deprecate).not.toHaveBeenCalled();
  });

  it('(409 Version-Mismatch) current=3 + expectedVersion=1 → :current=3 Suffix', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, version: 3 })));

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A], expectedVersion: 1 }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(SICHERHEITSREGEL_CONFLICT_DETECTED);
    expect(result.error).toContain(':current=3');
    expect(sicherheitsregelRepo.updateWithNewVersion).not.toHaveBeenCalled();
  });

  it('(422 NoChangesDetected) identische Werte + gleiche Einheit → BusinessRule-Sentinel, keine Mutation', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, titel: 'Gleicher Titel', inhalt: 'Gleicher Inhalt', version: 1 })));

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_A], titel: 'Gleicher Titel', inhalt: 'Gleicher Inhalt' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(SICHERHEITSREGEL_NO_CHANGES_DETECTED);
    expect(sicherheitsregelRepo.updateWithNewVersion).not.toHaveBeenCalled();
    expect(versionRepo.saveNewVersion).not.toHaveBeenCalled();
  });

  it('(Re-Wire) Einheit A → B+C: alte Row deprecated (ohne Delete), zwei neue Rows mit identischer propagationGroupId', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, version: 1 })));

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_B, EINHEIT_C] }));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(2);

    // Alte Row: deprecate + closeCurrentVersion (kein physischer Delete).
    // deprecate trägt jetzt zusätzlich `aktualisiertVonUserId` und
    // `expectedVersion` für das DB-Level-OCC (Story 2.6 Code-Review-Patch).
    expect(sicherheitsregelRepo.deprecate).toHaveBeenCalledTimes(1);
    expect(sicherheitsregelRepo.deprecate).toHaveBeenCalledWith(REGEL_ID, EINSATZ_ID, USER_ID, 1, expect.anything());
    expect(versionRepo.closeCurrentVersion).toHaveBeenCalledTimes(1);
    expect(sicherheitsregelRepo.updateWithNewVersion).not.toHaveBeenCalled();

    // Neue Rows: pro Einheit save + initiale Version.
    expect(sicherheitsregelRepo.save).toHaveBeenCalledTimes(2);
    expect(versionRepo.saveInitialVersion).toHaveBeenCalledTimes(2);

    // Alle Events (1 deprecate + 2 create) teilen die gleiche propagationGroupId.
    const outboxArgs = outboxRepo.save.mock.calls[0][0];
    expect(outboxArgs).toHaveLength(3);
    for (const event of outboxArgs) {
      expect(event).toBeInstanceOf(SicherheitsregelAusgerufenEvent);
      expect(event.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
    }
    const events = outboxArgs as SicherheitsregelAusgerufenEvent[];
    const deprecated = events.find((event) => event.changedFields.deprecated === true);
    const created = events.filter((event) => event.changedFields.created === true);
    expect(deprecated).toBeDefined();
    expect(deprecated!.regelId).toBe(REGEL_ID);
    expect(created).toHaveLength(2);
    expect(new Set(created.map((event) => event.einheitId))).toEqual(new Set([EINHEIT_B, EINHEIT_C]));
  });

  it('(Re-Wire → einsatzweit) Einheit A → null: alte Row deprecated, eine neue einsatzweite Row', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, version: 1 })));

    const result = await handler.execute(buildCommand({ einheitIds: null }));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(sicherheitsregelRepo.deprecate).toHaveBeenCalledTimes(1);
    expect(sicherheitsregelRepo.save).toHaveBeenCalledTimes(1);

    const savedAggregate = sicherheitsregelRepo.save.mock.calls[0][0];
    expect(savedAggregate.einheitId).toBeNull();
    expect(savedAggregate.einsatzweit).toBe(true);
  });

  it('(Re-Wire EINHEIT_NOT_FOUND) Ziel-Einheit existiert nicht → Abbruch, keine alte Row angefasst', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, version: 1 })));
    einheitRepo.findById.mockImplementation(async (einheitId: string) => {
      if (einheitId === EINHEIT_B) return Result.ok(null);
      return Result.ok({ id: einheitId, einsatzId: EINSATZ_ID });
    });

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_B] }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(UPDATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND);
    expect(sicherheitsregelRepo.deprecate).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.save).not.toHaveBeenCalled();
    expect(versionRepo.closeCurrentVersion).not.toHaveBeenCalled();
  });

  it('(Re-Wire 409) stale expectedVersion im Re-Wire-Pfad → :current=<n> Sentinel, keine Mutation', async () => {
    sicherheitsregelRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel({ einheitId: EINHEIT_A, version: 3 })));

    const result = await handler.execute(buildCommand({ einheitIds: [EINHEIT_B], expectedVersion: 1 }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(SICHERHEITSREGEL_CONFLICT_DETECTED);
    expect(result.error).toContain(':current=3');
    expect(sicherheitsregelRepo.deprecate).not.toHaveBeenCalled();
    expect(sicherheitsregelRepo.save).not.toHaveBeenCalled();
  });
});
