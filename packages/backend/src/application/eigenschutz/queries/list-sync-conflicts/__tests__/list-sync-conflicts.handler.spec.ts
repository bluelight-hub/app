import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { SyncConflictReadModel } from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER, SYNC_CONFLICT_REPOSITORY } from '@infrastructure/di-tokens';
import { LIST_SYNC_CONFLICTS_ERROR_CODES } from '../list-sync-conflicts.error-codes';
import { ListSyncConflictsHandler } from '../list-sync-conflicts.handler';
import { ListSyncConflictsQuery } from '../list-sync-conflicts.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const EINSATZ_PERSON_ID = 'clw3h8x9y0000qwertyui000pp';

function makeReadModel(overrides: Partial<SyncConflictReadModel> = {}): SyncConflictReadModel {
  return {
    id: 'sc-1',
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    entityType: 'PSA_PROFIL_ZUWEISUNG',
    entityId: 'clw3h8x9y0000qwertyui00080',
    fieldPath: 'profil',
    localPayload: { toggles: [{ profil: 'CBRN_PATIENT', aktivieren: true }] },
    serverVersion: 6,
    localExpectedVersion: 5,
    reportedAt: new Date('2026-04-27T08:00:00.000Z'),
    reportedByUserId: USER_ID,
    resolvedAt: null,
    resolvedByUserId: null,
    resolution: null,
    ...overrides,
  };
}

describe('ListSyncConflictsHandler (Story 3.10 AC3)', () => {
  let handler: ListSyncConflictsHandler;
  let syncConflictRepo: { findOpenByEinsatzId: jest.Mock };
  let teilnehmerRepo: { findByEinsatzAndUser: jest.Mock };
  let logger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    syncConflictRepo = { findOpenByEinsatzId: jest.fn() };
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
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSyncConflictsHandler,
        { provide: SYNC_CONFLICT_REPOSITORY, useValue: syncConflictRepo },
        { provide: EINSATZ_TEILNEHMER_REPOSITORY, useValue: teilnehmerRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(ListSyncConflictsHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy-Path) mappt 3 Read-Models zu Items ohne `einsatzId`-Feld', async () => {
    syncConflictRepo.findOpenByEinsatzId.mockResolvedValue(
      Result.ok([
        makeReadModel({ id: 'sc-1' }),
        makeReadModel({ id: 'sc-2', einheitId: null }),
        makeReadModel({ id: 'sc-3', entityType: 'GEFAEHRDUNGSBEURTEILUNG', fieldPath: 'risiko', serverVersion: 12, localExpectedVersion: 11 }),
      ]),
    );

    const result = await handler.execute(new ListSyncConflictsQuery(EINSATZ_ID, USER_ID));

    expect(result.isSuccess).toBe(true);
    const conflicts = result.value!.conflicts;
    expect(conflicts).toHaveLength(3);

    // Kein `einsatzId`-Feld in den Items.
    for (const item of conflicts) {
      expect(item).not.toHaveProperty('einsatzId');
      expect(item).not.toHaveProperty('resolvedAt');
      expect(item).not.toHaveProperty('resolvedByUserId');
      expect(item).not.toHaveProperty('resolution');
    }

    // Felder werden 1:1 übernommen.
    expect(conflicts[0]).toMatchObject({
      id: 'sc-1',
      einheitId: EINHEIT_ID,
      entityType: 'PSA_PROFIL_ZUWEISUNG',
      fieldPath: 'profil',
      serverVersion: 6,
      localExpectedVersion: 5,
      reportedByUserId: USER_ID,
    });
    expect(conflicts[1].einheitId).toBeNull();
    expect(conflicts[2].entityType).toBe('GEFAEHRDUNGSBEURTEILUNG');
  });

  it('reicht den `filter` (entityType + einheitId) an das Repository durch', async () => {
    syncConflictRepo.findOpenByEinsatzId.mockResolvedValue(Result.ok([]));

    await handler.execute(
      new ListSyncConflictsQuery(EINSATZ_ID, USER_ID, {
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        einheitId: EINHEIT_ID,
      }),
    );

    expect(syncConflictRepo.findOpenByEinsatzId).toHaveBeenCalledTimes(1);
    expect(syncConflictRepo.findOpenByEinsatzId).toHaveBeenCalledWith(EINSATZ_ID, {
      entityType: 'PSA_PROFIL_ZUWEISUNG',
      einheitId: EINHEIT_ID,
    });
  });

  it('Membership-Failure → `BusinessRule:UnzulaessigeEinheitenZuordnung` (Caller ist NICHT Teilnehmer)', async () => {
    teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue(null);

    const result = await handler.execute(new ListSyncConflictsQuery(EINSATZ_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(LIST_SYNC_CONFLICTS_ERROR_CODES.NOT_TEILNEHMER);
    expect(syncConflictRepo.findOpenByEinsatzId).not.toHaveBeenCalled();
  });

  it('Validation-Failure: leerer / Whitespace-only `einsatzId` → `BusinessRule:EinsatzIdErforderlich`', async () => {
    const emptyResult = await handler.execute(new ListSyncConflictsQuery('', USER_ID));
    expect(emptyResult.isFailure).toBe(true);
    expect(emptyResult.error).toBe(LIST_SYNC_CONFLICTS_ERROR_CODES.EINSATZ_REQUIRED);

    const whitespaceResult = await handler.execute(new ListSyncConflictsQuery('   ', USER_ID));
    expect(whitespaceResult.isFailure).toBe(true);
    expect(whitespaceResult.error).toBe(LIST_SYNC_CONFLICTS_ERROR_CODES.EINSATZ_REQUIRED);

    expect(teilnehmerRepo.findByEinsatzAndUser).not.toHaveBeenCalled();
    expect(syncConflictRepo.findOpenByEinsatzId).not.toHaveBeenCalled();
  });

  it('Validation-Failure: leerer / Whitespace-only `callerUserId` → `BusinessRule:CallerUserIdErforderlich`', async () => {
    const emptyResult = await handler.execute(new ListSyncConflictsQuery(EINSATZ_ID, ''));
    expect(emptyResult.isFailure).toBe(true);
    expect(emptyResult.error).toBe(LIST_SYNC_CONFLICTS_ERROR_CODES.CALLER_REQUIRED);

    const whitespaceResult = await handler.execute(new ListSyncConflictsQuery(EINSATZ_ID, '   '));
    expect(whitespaceResult.isFailure).toBe(true);
    expect(whitespaceResult.error).toBe(LIST_SYNC_CONFLICTS_ERROR_CODES.CALLER_REQUIRED);

    expect(teilnehmerRepo.findByEinsatzAndUser).not.toHaveBeenCalled();
  });

  it('Repository-Failure (`InfrastructureError:...`) wird wortgleich propagiert', async () => {
    syncConflictRepo.findOpenByEinsatzId.mockResolvedValue(Result.fail<readonly SyncConflictReadModel[]>('InfrastructureError:SyncConflictRepository:db down'));

    const result = await handler.execute(new ListSyncConflictsQuery(EINSATZ_ID, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:SyncConflictRepository:db down');
  });

  it('Whitespace-Trim auf `einsatzId`/`callerUserId` (Pattern Story 3.9 P14) — getrimmte Werte gehen ans Repo', async () => {
    syncConflictRepo.findOpenByEinsatzId.mockResolvedValue(Result.ok([]));

    const result = await handler.execute(new ListSyncConflictsQuery(`  ${EINSATZ_ID}  `, `  ${USER_ID}\n`));

    expect(result.isSuccess).toBe(true);
    expect(teilnehmerRepo.findByEinsatzAndUser).toHaveBeenCalledWith(EINSATZ_ID, USER_ID);
    expect(syncConflictRepo.findOpenByEinsatzId).toHaveBeenCalledWith(EINSATZ_ID, undefined);
  });
});
