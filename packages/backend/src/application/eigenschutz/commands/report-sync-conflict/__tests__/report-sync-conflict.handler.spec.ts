import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SYNC_CONFLICT_REPOSITORY } from '@infrastructure/di-tokens';
import { REPORT_SYNC_CONFLICT_ERROR_CODES, ReportSyncConflictHandler } from '../report-sync-conflict.handler';
import { ReportSyncConflictCommand } from '../report-sync-conflict.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const ENTITY_ID = 'clw3h8x9y0000qwertyui00080';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const EINSATZ_PERSON_ID = 'clw3h8x9y0000qwertyui000pp';

describe('ReportSyncConflictHandler (Story 3.9)', () => {
  let handler: ReportSyncConflictHandler;
  let syncConflictRepo: { recordOrFindExisting: jest.Mock };
  let teilnehmerRepo: { findByEinsatzAndUser: jest.Mock };
  let einheitRepo: { findById: jest.Mock };
  let outboxRepo: { save: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;

  function buildCommand(overrides: Partial<Record<string, unknown>> = {}): ReportSyncConflictCommand {
    const defaults = {
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID as string | null,
      entityType: 'PSA_PROFIL_ZUWEISUNG' as const,
      entityId: ENTITY_ID,
      fieldPath: 'profil',
      localPayload: { toggles: [{ profil: 'CBRN_PATIENT', aktivieren: true }], begruendung: 'CBRN' } as Record<string, unknown>,
      serverVersion: 6,
      localExpectedVersion: 5,
      callerUserId: USER_ID,
    };
    const merged = { ...defaults, ...overrides };
    return new ReportSyncConflictCommand(
      merged.einsatzId,
      merged.einheitId,
      merged.entityType,
      merged.entityId,
      merged.fieldPath,
      merged.localPayload,
      merged.serverVersion,
      merged.localExpectedVersion,
      merged.callerUserId,
    );
  }

  beforeEach(async () => {
    const txMock = {};
    syncConflictRepo = { recordOrFindExisting: jest.fn() };
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
    einheitRepo = { findById: jest.fn().mockResolvedValue(Result.ok({ id: EINHEIT_ID, einsatzId: EINSATZ_ID })) };
    outboxRepo = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb(txMock)) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportSyncConflictHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outboxRepo },
        { provide: SYNC_CONFLICT_REPOSITORY, useValue: syncConflictRepo },
        { provide: EINSATZ_TEILNEHMER_REPOSITORY, useValue: teilnehmerRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get(ReportSyncConflictHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('(Happy-Path frischer Insert) Idempotenz=false → 1 Domain-Event KonfliktErkannt mit allen Feldern', async () => {
    syncConflictRepo.recordOrFindExisting.mockResolvedValue(Result.ok({ id: 'sc-1', alreadyExisted: false }));

    const result = await handler.execute(buildCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ syncConflictId: 'sc-1', alreadyExisted: false });
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const events = outboxRepo.save.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(KonfliktErkanntEvent);
    expect(events[0].entityType).toBe('PSA_PROFIL_ZUWEISUNG');
    expect(events[0].entityId).toBe(ENTITY_ID);
    expect(events[0].serverVersion).toBe(6);
    expect(events[0].localExpectedVersion).toBe(5);
  });

  it('(Idempotenz-Pfad) Repository liefert alreadyExisted=true → KEIN Event-Emit, Result trägt existierende ID', async () => {
    syncConflictRepo.recordOrFindExisting.mockResolvedValue(Result.ok({ id: 'sc-existing', alreadyExisted: true }));

    const result = await handler.execute(buildCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ syncConflictId: 'sc-existing', alreadyExisted: true });
    // TransactionalCommandHandler Z. 277: outbox.save wird NUR bei events.length > 0 aufgerufen.
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(Validation) serverVersion === localExpectedVersion → VERSION_NOT_CONFLICT', async () => {
    const result = await handler.execute(buildCommand({ serverVersion: 5, localExpectedVersion: 5 }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.VERSION_NOT_CONFLICT);
    expect(syncConflictRepo.recordOrFindExisting).not.toHaveBeenCalled();
  });

  it('(Validation) serverVersion === 0 → VERSION_INVALID', async () => {
    const result = await handler.execute(buildCommand({ serverVersion: 0, localExpectedVersion: 5 }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.VERSION_INVALID);
  });

  it('(Validation) entityType === GEFAEHRDUNGSBEURTEILUNG_ITEM → ENTITY_TYPE_NOT_SUPPORTED (Story-3.9-strikt)', async () => {
    const cmd = buildCommand({ entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' });
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.ENTITY_TYPE_NOT_SUPPORTED);
  });

  it('(Validation) localPayload === null → LOCAL_PAYLOAD_INVALID', async () => {
    const result = await handler.execute(buildCommand({ localPayload: null as unknown as Record<string, unknown> }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.LOCAL_PAYLOAD_INVALID);
  });

  it('(Validation) fieldPath leer → FIELD_PATH_INVALID', async () => {
    const result = await handler.execute(buildCommand({ fieldPath: '   ' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.FIELD_PATH_INVALID);
  });

  // Code-Review P14 — Whitespace-Only / leere String-Felder werden früh
  // abgewiesen (validateCommand-Order). Defense-in-Depth zur DTO-Validation
  // im Controller — sichert, dass auch direkt aufgerufene Handler (Tests,
  // CLI) sauber failen.
  it('(Validation) einsatzId === "" → EINSATZ_REQUIRED', async () => {
    const result = await handler.execute(buildCommand({ einsatzId: '' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.EINSATZ_REQUIRED);
  });

  it('(Validation) einsatzId === "   " (whitespace) → EINSATZ_REQUIRED', async () => {
    const result = await handler.execute(buildCommand({ einsatzId: '   ' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.EINSATZ_REQUIRED);
  });

  it('(Validation) callerUserId === "" → CALLER_REQUIRED', async () => {
    const result = await handler.execute(buildCommand({ callerUserId: '' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.CALLER_REQUIRED);
  });

  it('(Validation) entityId === "" → ENTITY_ID_REQUIRED', async () => {
    const result = await handler.execute(buildCommand({ entityId: '' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.ENTITY_ID_REQUIRED);
  });

  it('(Auth) teilnehmerRepo liefert null → NOT_TEILNEHMER', async () => {
    teilnehmerRepo.findByEinsatzAndUser.mockResolvedValue(null);
    const result = await handler.execute(buildCommand());
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.NOT_TEILNEHMER);
    expect(syncConflictRepo.recordOrFindExisting).not.toHaveBeenCalled();
  });

  it('(Cross-Einsatz) einheit gehört zu fremdem Einsatz → EINHEIT_NOT_IN_EINSATZ', async () => {
    einheitRepo.findById.mockResolvedValue(Result.ok({ id: EINHEIT_ID, einsatzId: 'fremder-einsatz' }));
    const result = await handler.execute(buildCommand());
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(REPORT_SYNC_CONFLICT_ERROR_CODES.EINHEIT_NOT_IN_EINSATZ);
    expect(syncConflictRepo.recordOrFindExisting).not.toHaveBeenCalled();
  });

  it('(einheitId === null) Cross-Einsatz-Check wird übersprungen — Phase-2-Forward-Compat', async () => {
    syncConflictRepo.recordOrFindExisting.mockResolvedValue(Result.ok({ id: 'sc-2', alreadyExisted: false }));
    const result = await handler.execute(buildCommand({ einheitId: null }));
    expect(result.isSuccess).toBe(true);
    expect(einheitRepo.findById).not.toHaveBeenCalled();
  });

  it('(Repository-Failure) recordOrFindExisting fail → Sentinel propagiert wortgleich, kein Event-Emit', async () => {
    syncConflictRepo.recordOrFindExisting.mockResolvedValue(Result.fail('InfrastructureError:SyncConflictRepository:db-down'));
    const result = await handler.execute(buildCommand());
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:SyncConflictRepository:db-down');
  });

  it('(LocalPayload-Cap) recordOrFindExisting liefert ValidationFailed:LocalPayloadTooLarge → propagiert', async () => {
    syncConflictRepo.recordOrFindExisting.mockResolvedValue(Result.fail('ValidationFailed:LocalPayloadTooLarge'));
    const result = await handler.execute(buildCommand());
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:LocalPayloadTooLarge');
  });
});
