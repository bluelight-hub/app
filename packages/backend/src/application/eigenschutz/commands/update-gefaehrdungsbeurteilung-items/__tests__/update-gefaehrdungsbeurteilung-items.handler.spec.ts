// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { UpdateGefaehrdungsbeurteilungItemsHandler, UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES } from '../update-gefaehrdungsbeurteilung-items.handler';
import { UpdateGefaehrdungsbeurteilungItemsCommand } from '../update-gefaehrdungsbeurteilung-items.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const FREMDER_EINSATZ_ID = 'clw3h8x9y0000qwertyui99999';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00077';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

function buildAggregate(opts: { einsatzId?: string; version?: number; items?: GefaehrdungItem[] } = {}): Gefaehrdungsbeurteilung {
  const aggregate = Gefaehrdungsbeurteilung.create({
    id: BEURTEILUNG_ID,
    einsatzId: opts.einsatzId ?? EINSATZ_ID,
    einheitId: EINHEIT_ID,
    createdBy: USER_ID,
    items: opts.items ?? [],
  }).value!;
  // Version-Manipulation für Conflict-Szenarien: Zusatz-Updates aufsetzen.
  const targetVersion = opts.version ?? 1;
  let currentVersion = 1;
  while (currentVersion < targetVersion) {
    const ok = aggregate.updateItems(opts.items ?? [], currentVersion, USER_ID);
    expect(ok.isSuccess).toBe(true);
    currentVersion += 1;
  }
  aggregate.clearDomainEvents();
  return aggregate;
}

function buildCommand(overrides: Partial<Parameters<typeof UpdateGefaehrdungsbeurteilungItemsCommand.create>[0]> = {}): UpdateGefaehrdungsbeurteilungItemsCommand {
  return UpdateGefaehrdungsbeurteilungItemsCommand.create({
    einsatzId: EINSATZ_ID,
    gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
    userId: USER_ID,
    expectedVersion: 1,
    items: [{ title: 'Neue-Gefährdung' }],
    ...overrides,
  }).value!;
}

describe('UpdateGefaehrdungsbeurteilungItemsHandler', () => {
  let handler: UpdateGefaehrdungsbeurteilungItemsHandler;
  let beurteilungRepo: { findById: jest.Mock; updateItems: jest.Mock; save: jest.Mock; findReadModelById: jest.Mock; existsForEinheit: jest.Mock };
  let versionRepo: { saveInitialVersion: jest.Mock; saveNewVersion: jest.Mock };
  let outboxRepo: { save: jest.Mock; findPendingEvents: jest.Mock; markAsPublished: jest.Mock; markAsFailed: jest.Mock; getRetryCount: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    beurteilungRepo = {
      findById: jest.fn(),
      updateItems: jest.fn().mockResolvedValue(Result.ok(undefined)),
      save: jest.fn(),
      findReadModelById: jest.fn(),
      existsForEinheit: jest.fn(),
    };
    versionRepo = {
      saveInitialVersion: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(Result.ok(undefined)),
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
        UpdateGefaehrdungsbeurteilungItemsHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, useValue: beurteilungRepo },
        { provide: GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, useValue: versionRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(UpdateGefaehrdungsbeurteilungItemsHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy-Path Add-Only) inkrementiert Version und schreibt neue Version-Zeile', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate()));

    const result = await handler.execute(buildCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(BEURTEILUNG_ID);
    expect(beurteilungRepo.updateItems).toHaveBeenCalledTimes(1);
    expect(versionRepo.saveNewVersion).toHaveBeenCalledTimes(1);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);

    const versionArgs = versionRepo.saveNewVersion.mock.calls[0][0];
    expect(versionArgs.version).toBe(2);
    expect(versionArgs.changedFields).toEqual({ added: [expect.any(String)], removed: [], updated: [], unchanged: 0 });
    expect(versionArgs.items).toHaveLength(1);
    expect(versionArgs.items[0].id).toEqual(expect.any(String));
    expect(versionArgs.eventId).toBeTruthy();
  });

  it('(Happy-Path Remove-All) akzeptiert leeres items-Array ohne 422', async () => {
    const existingItem = GefaehrdungItem.create({ id: 'clw3h8x9y0000qwertyuiaaaaa', title: 'Alt' }).value!;
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate({ items: [existingItem] })));

    const result = await handler.execute(buildCommand({ items: [] }));
    expect(result.isSuccess).toBe(true);

    const versionArgs = versionRepo.saveNewVersion.mock.calls[0][0];
    expect(versionArgs.items).toEqual([]);
    expect(versionArgs.changedFields).toEqual({ added: [], removed: ['clw3h8x9y0000qwertyuiaaaaa'], updated: [], unchanged: 0 });
  });

  it('(Happy-Path Mixed) zählt Add + Edit + Remove im Diff', async () => {
    const idA = 'clw3h8x9y0000qwertyuiaaaaa';
    const idB = 'clw3h8x9y0000qwertyuibbbbb';
    const items = [GefaehrdungItem.create({ id: idA, title: 'A' }).value!, GefaehrdungItem.create({ id: idB, title: 'B' }).value!];
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate({ items })));

    const cmd = buildCommand({
      items: [
        { id: idA, title: 'A-neu' }, // updated
        { title: 'C-neu' }, // added (keine ID)
      ],
    });
    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);

    const versionArgs = versionRepo.saveNewVersion.mock.calls[0][0];
    expect(versionArgs.changedFields).toEqual({
      added: [expect.any(String)],
      removed: [idB],
      updated: [{ id: idA, fields: ['title'] }],
      unchanged: 0,
    });
    expect(versionArgs.items[1].id).toEqual(expect.any(String));
    expect(versionArgs.items[1].id).not.toBe(idA);
  });

  it('(Regression) ergänzt stabile IDs für id-lose Client-Items vor Aggregate- und Version-Persistenz', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate()));

    const result = await handler.execute(
      buildCommand({
        items: [{ title: 'Atemschutz', schutzmassnahmen: 'PA-Trupp einsetzen' }],
      }),
    );

    expect(result.isSuccess).toBe(true);
    const persistedAggregate = beurteilungRepo.updateItems.mock.calls[0][0];
    const versionArgs = versionRepo.saveNewVersion.mock.calls[0][0];
    const generatedId = versionArgs.items[0].id;

    expect(generatedId).toEqual(expect.any(String));
    expect(generatedId).not.toHaveLength(0);
    expect(persistedAggregate.items[0].id).toBe(generatedId);
    expect(versionArgs.changedFields.added).toEqual([generatedId]);
  });

  it('(409 ConflictDetected) bei Version-Mismatch — keine Persistenz, Sentinel im Error', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate({ version: 3 })));

    const result = await handler.execute(buildCommand({ expectedVersion: 1 }));

    expect(result.isFailure).toBe(true);
    // Story 2.3 AC10: Handler hängt aktuellen `aggregate.version` als `:current=<n>`
    // ans ConflictDetected-Sentinel — der Controller parst das für den 409-Context.
    expect(result.error?.startsWith(UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.CONFLICT_DETECTED)).toBe(true);
    expect(result.error).toBe(`${UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.CONFLICT_DETECTED}:current=3`);
    expect(beurteilungRepo.updateItems).not.toHaveBeenCalled();
    expect(versionRepo.saveNewVersion).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(404 Beurteilung) wenn ID unbekannt ist', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.BEURTEILUNG_NOT_FOUND);
    expect(beurteilungRepo.updateItems).not.toHaveBeenCalled();
  });

  it('(404 Cross-Einsatz) Beurteilung gehört zu anderem Einsatz — leakfrei als NotFound', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate({ einsatzId: FREMDER_EINSATZ_ID })));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.BEURTEILUNG_NOT_FOUND);
    expect(beurteilungRepo.updateItems).not.toHaveBeenCalled();
  });

  it('(400) wenn ein Item ungültig ist (leerer Titel) — kein Repo-Call, ValidationFailed:-Präfix (Story 2.3 AC11)', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate()));

    const result = await handler.execute(buildCommand({ items: [{ title: '' }] }));

    expect(result.isFailure).toBe(true);
    expect(result.error?.startsWith('ValidationFailed:')).toBe(true);
    expect(result.error).toContain('Titel');
    expect(beurteilungRepo.updateItems).not.toHaveBeenCalled();
    expect(versionRepo.saveNewVersion).not.toHaveBeenCalled();
  });

  it('(409 DB-Level ConflictDetected) Repo-Fail triggert findById-Reload für currentVersion (Story 2.3 AC2 + AC10)', async () => {
    // Zwei parallele TXs: In-Memory-Check passt (expectedVersion = 1 matcht),
    // aber das DB-seitige `updateMany` schlägt wegen `version`-Mismatch fehl.
    // Der Handler soll `findById` erneut aufrufen, um die aktuelle DB-Version
    // für den 409-Context zu ermitteln.
    const aggregate = buildAggregate({ version: 1 });
    beurteilungRepo.findById.mockResolvedValueOnce(Result.ok(aggregate));
    beurteilungRepo.updateItems.mockResolvedValue(Result.fail(UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.CONFLICT_DETECTED));
    beurteilungRepo.findById.mockResolvedValueOnce(Result.ok(buildAggregate({ version: 5 })));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(`${UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.CONFLICT_DETECTED}:current=5`);
    expect(beurteilungRepo.findById).toHaveBeenCalledTimes(2);
    expect(versionRepo.saveNewVersion).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(Event-Binding) bindet Version-Zeile an dieselbe eventId wie das Outbox-Event', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate()));

    await handler.execute(buildCommand());

    const versionArgs = versionRepo.saveNewVersion.mock.calls[0][0];
    const outboxArgs = outboxRepo.save.mock.calls[0][0];
    const outboxEvent = outboxArgs.find((event: unknown) => event instanceof GefaehrdungsbeurteilungAktualisiertEvent) as GefaehrdungsbeurteilungAktualisiertEvent;

    expect(outboxEvent).toBeDefined();
    expect(versionArgs.eventId).toBe(outboxEvent.eventId);
    expect(versionArgs.gueltigVon).toEqual(outboxEvent.occurredAt);
  });

  it('(Infra-Fail beurteilungRepo.findById) propagiert den DB-Fehler ohne Mutation', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.fail('DB-Verbindung unterbrochen'));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('DB-Verbindung unterbrochen');
    expect(beurteilungRepo.updateItems).not.toHaveBeenCalled();
    expect(versionRepo.saveNewVersion).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(Infra-Fail beurteilungRepo.updateItems) bricht ab bevor Version-Zeile angelegt wird', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate()));
    beurteilungRepo.updateItems.mockResolvedValue(Result.fail('Prisma-Update fehlgeschlagen'));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Prisma-Update fehlgeschlagen');
    expect(versionRepo.saveNewVersion).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(Infra-Fail versionRepo.saveNewVersion) liefert Repo-Fehler', async () => {
    beurteilungRepo.findById.mockResolvedValue(Result.ok(buildAggregate()));
    versionRepo.saveNewVersion.mockResolvedValue(Result.fail('Version-Row Duplikat'));

    const result = await handler.execute(buildCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Version-Row Duplikat');
  });
});
