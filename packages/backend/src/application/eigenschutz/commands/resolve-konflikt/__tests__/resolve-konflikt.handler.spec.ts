import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { PsaProfilZuweisung } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import { KonfliktAufgeloestEvent, type SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { SyncConflictReadModel } from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER, OUTBOX_REPOSITORY, PSA_PROFIL_ZUWEISUNG_REPOSITORY, SYNC_CONFLICT_REPOSITORY } from '@infrastructure/di-tokens';
import { ResolveKonfliktCommand } from '../resolve-konflikt.command';
import { RESOLVE_KONFLIKT_ERROR_CODES } from '../resolve-konflikt.error-codes';
import { ResolveKonfliktHandler } from '../resolve-konflikt.handler';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const ENTITY_ID = 'clw3h8x9y0000qwertyui00080';
const SYNC_CONFLICT_ID = 'clw3h8x9y0000qwertyui000sc';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const EINSATZ_PERSON_ID = 'clw3h8x9y0000qwertyui000pp';

function buildConflict(overrides: Partial<SyncConflictReadModel> = {}): SyncConflictReadModel {
  return {
    id: SYNC_CONFLICT_ID,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    entityType: 'PSA_PROFIL_ZUWEISUNG',
    entityId: ENTITY_ID,
    fieldPath: 'profil',
    localPayload: {
      toggles: [{ profil: 'CBRN_PATIENT', aktiv: true }],
      begruendung: 'CBRN-Lage erkannt',
      resolvedEinheitIds: [EINHEIT_ID],
    },
    serverVersion: 6,
    localExpectedVersion: 5,
    reportedAt: new Date('2026-05-01T08:00:00Z'),
    reportedByUserId: USER_ID,
    resolvedAt: null,
    resolvedByUserId: null,
    resolution: null,
    ...overrides,
  };
}

function buildAggregate(profil: 'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ' = 'CBRN_PATIENT', version = 1): PsaProfilZuweisung {
  const result = PsaProfilZuweisung.reconstitute({
    id: ENTITY_ID,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    profil,
    gueltigVon: new Date('2026-05-01T07:00:00Z'),
    gueltigBis: null,
    aktiviertVonUserId: USER_ID,
    begruendung: 'Initial-Aktivierung',
    propagationGroupId: 'pg-init',
    version,
  });
  if (result.isFailure || !result.value) {
    throw new Error(`reconstitute failed: ${result.error}`);
  }
  return result.value;
}

describe('ResolveKonfliktHandler (Story 3.10)', () => {
  let handler: ResolveKonfliktHandler;
  let syncConflictRepo: { findById: jest.Mock; markResolved: jest.Mock };
  let psaProfilZuweisungRepo: { findByZuweisungId: jest.Mock; findActiveByEinheit: jest.Mock; saveActivation: jest.Mock; closeActiveZuweisung: jest.Mock };
  let teilnehmerRepo: { findByEinsatzAndUser: jest.Mock };
  let outboxRepo: { save: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;

  function buildCommand(overrides: { einsatzId?: string; syncConflictId?: string; resolution?: SyncConflictResolution; callerUserId?: string } = {}): ResolveKonfliktCommand {
    return new ResolveKonfliktCommand(overrides.einsatzId ?? EINSATZ_ID, overrides.syncConflictId ?? SYNC_CONFLICT_ID, overrides.resolution ?? 'SERVER_WINS', overrides.callerUserId ?? USER_ID);
  }

  beforeEach(async () => {
    const txMock = {};
    syncConflictRepo = {
      findById: jest.fn().mockResolvedValue(Result.ok(buildConflict())),
      markResolved: jest.fn().mockResolvedValue(Result.ok({ alreadyResolved: false })),
    };
    psaProfilZuweisungRepo = {
      findByZuweisungId: jest.fn().mockResolvedValue(Result.ok(buildAggregate())),
      findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(null)),
      saveActivation: jest.fn().mockResolvedValue(Result.ok()),
      closeActiveZuweisung: jest.fn().mockResolvedValue(Result.ok()),
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
    outboxRepo = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb(txMock)) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveKonfliktHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: SYNC_CONFLICT_REPOSITORY, useValue: syncConflictRepo },
        { provide: PSA_PROFIL_ZUWEISUNG_REPOSITORY, useValue: psaProfilZuweisungRepo },
        { provide: EINSATZ_TEILNEHMER_REPOSITORY, useValue: teilnehmerRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(ResolveKonfliktHandler);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // SERVER_WINS — 4 Tests
  // ---------------------------------------------------------------------------

  it('(SERVER_WINS Happy-Path PSA_PROFIL_ZUWEISUNG) markResolved + KonfliktAufgeloestEvent, KEINE Aggregat-Mutation', async () => {
    const result = await handler.execute(buildCommand({ resolution: 'SERVER_WINS' }));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.syncConflictId).toBe(SYNC_CONFLICT_ID);
    expect(result.value!.alreadyResolved).toBe(false);
    expect(result.value!.resolvedAt).toBeInstanceOf(Date);
    expect(syncConflictRepo.markResolved).toHaveBeenCalledTimes(1);
    expect(syncConflictRepo.markResolved).toHaveBeenCalledWith(SYNC_CONFLICT_ID, 'SERVER_WINS', USER_ID, expect.any(Date), expect.anything());
    expect(psaProfilZuweisungRepo.findByZuweisungId).not.toHaveBeenCalled();
    expect(psaProfilZuweisungRepo.findActiveByEinheit).not.toHaveBeenCalled();
    expect(psaProfilZuweisungRepo.saveActivation).not.toHaveBeenCalled();
    expect(psaProfilZuweisungRepo.closeActiveZuweisung).not.toHaveBeenCalled();
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const events = outboxRepo.save.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(KonfliktAufgeloestEvent);
    expect(events[0].resolution).toBe('SERVER_WINS');
    expect(events[0].entityType).toBe('PSA_PROFIL_ZUWEISUNG');
  });

  it('(SERVER_WINS Happy-Path GEFAEHRDUNGSBEURTEILUNG_ITEM) entity-agnostisch zulässig — markResolved + Event', async () => {
    syncConflictRepo.findById.mockResolvedValue(Result.ok(buildConflict({ entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM', einheitId: null })));

    const result = await handler.execute(buildCommand({ resolution: 'SERVER_WINS' }));

    expect(result.isSuccess).toBe(true);
    expect(syncConflictRepo.markResolved).toHaveBeenCalledTimes(1);
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const events = outboxRepo.save.mock.calls[0][0];
    expect(events[0].entityType).toBe('GEFAEHRDUNGSBEURTEILUNG_ITEM');
    expect(events[0].resolution).toBe('SERVER_WINS');
  });

  it('(SERVER_WINS Idempotenz) zweiter Call mit resolvedAt !== null → Result.ok mit alreadyResolved=true, KEIN Event', async () => {
    const resolvedAt = new Date('2026-05-01T09:00:00Z');
    syncConflictRepo.findById.mockResolvedValue(Result.ok(buildConflict({ resolvedAt, resolvedByUserId: USER_ID, resolution: 'SERVER_WINS' })));

    const result = await handler.execute(buildCommand({ resolution: 'SERVER_WINS' }));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ syncConflictId: SYNC_CONFLICT_ID, alreadyResolved: true, resolvedAt });
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(SERVER_WINS) Konflikt nicht im Einsatz → CONFLICT_NOT_IN_EINSATZ, kein markResolved, kein Event', async () => {
    syncConflictRepo.findById.mockResolvedValue(Result.ok(buildConflict({ einsatzId: 'fremder-einsatz' })));

    const result = await handler.execute(buildCommand({ resolution: 'SERVER_WINS' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.CONFLICT_NOT_IN_EINSATZ);
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(SERVER_WINS) findById liefert null → CONFLICT_NOT_FOUND', async () => {
    syncConflictRepo.findById.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand({ resolution: 'SERVER_WINS' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.CONFLICT_NOT_FOUND);
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // LOCAL_WINS — 3 Tests
  // ---------------------------------------------------------------------------

  it('(LOCAL_WINS Happy-Path PSA-Toggle-Reapply) PsaProfilGeaendert + KonfliktAufgeloest emittiert', async () => {
    // Toggle-Set: CBRN_PATIENT aktivieren — server-seitig nicht aktiv.
    psaProfilZuweisungRepo.findActiveByEinheit.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand({ resolution: 'LOCAL_WINS' }));

    expect(result.isSuccess).toBe(true);
    expect(psaProfilZuweisungRepo.findByZuweisungId).toHaveBeenCalledWith(ENTITY_ID, EINSATZ_ID, expect.anything());
    expect(psaProfilZuweisungRepo.saveActivation).toHaveBeenCalledTimes(1);
    expect(psaProfilZuweisungRepo.closeActiveZuweisung).not.toHaveBeenCalled();
    expect(syncConflictRepo.markResolved).toHaveBeenCalledTimes(1);
    expect(syncConflictRepo.markResolved).toHaveBeenCalledWith(SYNC_CONFLICT_ID, 'LOCAL_WINS', USER_ID, expect.any(Date), expect.anything());
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const events = outboxRepo.save.mock.calls[0][0];
    // 1 PsaProfilGeaendert (AKTIVIERT) + 1 KonfliktAufgeloest
    expect(events).toHaveLength(2);
    expect(events[0]).toBeInstanceOf(PsaProfilGeaendertEvent);
    expect(events[0].aktion).toBe('AKTIVIERT');
    expect(events[0].profil).toBe('CBRN_PATIENT');
    expect(events[1]).toBeInstanceOf(KonfliktAufgeloestEvent);
    expect(events[1].resolution).toBe('LOCAL_WINS');
  });

  it('(LOCAL_WINS) entityType GEFAEHRDUNGSBEURTEILUNG_ITEM → ENTITY_TYPE_NOT_SUPPORTED, kein Reapply, kein Event', async () => {
    syncConflictRepo.findById.mockResolvedValue(Result.ok(buildConflict({ entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' })));

    const result = await handler.execute(buildCommand({ resolution: 'LOCAL_WINS' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.ENTITY_TYPE_NOT_SUPPORTED);
    expect(psaProfilZuweisungRepo.findByZuweisungId).not.toHaveBeenCalled();
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(LOCAL_WINS) Aggregat zwischenzeitlich gelöscht → LOCAL_WINS_AGGREGATE_NOT_FOUND, Konflikt bleibt offen', async () => {
    psaProfilZuweisungRepo.findByZuweisungId.mockResolvedValue(Result.ok(null));

    const result = await handler.execute(buildCommand({ resolution: 'LOCAL_WINS' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.LOCAL_WINS_AGGREGATE_NOT_FOUND);
    expect(psaProfilZuweisungRepo.saveActivation).not.toHaveBeenCalled();
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // MERGED — 2 Tests
  // ---------------------------------------------------------------------------

  it('(MERGED Happy-Path PSA_PROFIL_ZUWEISUNG) Phase-1-MVP: keine Aggregat-Mutation, nur markResolved + Event mit resolution=MERGED', async () => {
    const result = await handler.execute(buildCommand({ resolution: 'MERGED' }));

    expect(result.isSuccess).toBe(true);
    expect(psaProfilZuweisungRepo.findByZuweisungId).not.toHaveBeenCalled();
    expect(psaProfilZuweisungRepo.findActiveByEinheit).not.toHaveBeenCalled();
    expect(psaProfilZuweisungRepo.saveActivation).not.toHaveBeenCalled();
    expect(psaProfilZuweisungRepo.closeActiveZuweisung).not.toHaveBeenCalled();
    expect(syncConflictRepo.markResolved).toHaveBeenCalledTimes(1);
    expect(syncConflictRepo.markResolved).toHaveBeenCalledWith(SYNC_CONFLICT_ID, 'MERGED', USER_ID, expect.any(Date), expect.anything());
    const events = outboxRepo.save.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(KonfliktAufgeloestEvent);
    expect(events[0].resolution).toBe('MERGED');
  });

  it('(MERGED) entityType GEFAEHRDUNGSBEURTEILUNG_ITEM → ENTITY_TYPE_NOT_SUPPORTED (Phase-2-strikt)', async () => {
    syncConflictRepo.findById.mockResolvedValue(Result.ok(buildConflict({ entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' })));

    const result = await handler.execute(buildCommand({ resolution: 'MERGED' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.ENTITY_TYPE_NOT_SUPPORTED);
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Sekundärer Konflikt-Pfad im LOCAL_WINS-Reapply — 1 Test
  // ---------------------------------------------------------------------------

  it('(Sekundärer Konflikt) LOCAL_WINS-Reapply: closeActiveZuweisung liefert ConflictDetected:current=8 → propagiert wortgleich, kein markResolved, kein Event', async () => {
    // Payload-Toggle: BASIS deaktivieren. Server hat BASIS aktiv mit version=7.
    syncConflictRepo.findById.mockResolvedValue(
      Result.ok(
        buildConflict({
          localPayload: {
            toggles: [{ profil: 'BASIS', aktiv: false }],
            begruendung: 'Lokal: BASIS deaktivieren',
            resolvedEinheitIds: [EINHEIT_ID],
          },
        }),
      ),
    );
    const activeAggregate = buildAggregate('BASIS', 7);
    psaProfilZuweisungRepo.findActiveByEinheit.mockResolvedValue(Result.ok(activeAggregate));
    psaProfilZuweisungRepo.closeActiveZuweisung.mockResolvedValue(Result.fail('ConflictDetected:PsaProfilZuweisung:current=8:zuweisungId=clw3h8x9y0000qwertyui00080'));

    const result = await handler.execute(buildCommand({ resolution: 'LOCAL_WINS' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ConflictDetected:PsaProfilZuweisung:current=8:zuweisungId=clw3h8x9y0000qwertyui00080');
    expect(psaProfilZuweisungRepo.closeActiveZuweisung).toHaveBeenCalledTimes(1);
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // LocalPayload-Schema-Drift — 1 Test
  // ---------------------------------------------------------------------------

  it('(LOCAL_WINS Schema-Drift) localPayload.toggles fehlt → LOCAL_WINS_PAYLOAD_INVALID', async () => {
    syncConflictRepo.findById.mockResolvedValue(
      Result.ok(
        buildConflict({
          localPayload: {
            // toggles fehlt absichtlich
            begruendung: 'irgendwas',
            resolvedEinheitIds: [EINHEIT_ID],
          },
        }),
      ),
    );

    const result = await handler.execute(buildCommand({ resolution: 'LOCAL_WINS' }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.LOCAL_WINS_PAYLOAD_INVALID);
    expect(psaProfilZuweisungRepo.saveActivation).not.toHaveBeenCalled();
    expect(syncConflictRepo.markResolved).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Validation + Membership — 1 Test (kombiniert)
  // ---------------------------------------------------------------------------

  describe('Validation + Membership', () => {
    it('(Validation) syncConflictId leer → CONFLICT_ID_REQUIRED, kein DB-Roundtrip', async () => {
      const result = await handler.execute(buildCommand({ syncConflictId: '   ' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.CONFLICT_ID_REQUIRED);
      expect(syncConflictRepo.findById).not.toHaveBeenCalled();
    });

    it('(Validation) ungültige resolution → RESOLUTION_INVALID', async () => {
      const result = await handler.execute(buildCommand({ resolution: 'INVALID' as unknown as SyncConflictResolution }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.RESOLUTION_INVALID);
      expect(syncConflictRepo.findById).not.toHaveBeenCalled();
    });

    it('(Membership) teilnehmerRepo liefert null → NOT_TEILNEHMER, kein Konflikt-Lookup', async () => {
      teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue(null);
      const result = await handler.execute(buildCommand({ resolution: 'SERVER_WINS' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(RESOLVE_KONFLIKT_ERROR_CODES.NOT_TEILNEHMER);
      expect(syncConflictRepo.findById).not.toHaveBeenCalled();
    });
  });
});
