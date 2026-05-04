import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { ISyncConflictRepository } from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SYNC_CONFLICT_REPOSITORY } from '@infrastructure/di-tokens';
import { ReportSyncConflictCommand, type ReportSyncConflictResult } from './report-sync-conflict.command';

/**
 * Sentinel-Codes des Handlers (Story 3.9 AC4). Der Controller mappt die
 * Präfixe deterministisch: 422 für `BusinessRule:*` / `ValidationFailed:*`,
 * 500 für `InfrastructureError:*`.
 */
export const REPORT_SYNC_CONFLICT_ERROR_CODES = {
  EINSATZ_REQUIRED: 'BusinessRule:EinsatzIdErforderlich',
  CALLER_REQUIRED: 'BusinessRule:CallerUserIdErforderlich',
  ENTITY_ID_REQUIRED: 'BusinessRule:EntityIdErforderlich',
  FIELD_PATH_INVALID: 'BusinessRule:FieldPathInvalid',
  VERSION_INVALID: 'BusinessRule:VersionInvalid',
  VERSION_NOT_CONFLICT: 'BusinessRule:ServerVersionMussGroesserAlsLocalSein',
  LOCAL_PAYLOAD_INVALID: 'ValidationFailed:LocalPayloadInvalid',
  LOCAL_PAYLOAD_TOO_LARGE: 'ValidationFailed:LocalPayloadTooLarge',
  ENTITY_TYPE_NOT_SUPPORTED: 'BusinessRule:EntityTypeNotSupportedInStory39',
  NOT_TEILNEHMER: 'BusinessRule:UnzulaessigeEinheitenZuordnung',
  EINHEIT_NOT_IN_EINSATZ: 'BusinessRule:EinheitNichtImEinsatz',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${REPORT_SYNC_CONFLICT_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

const FIELD_PATH_MAX = 200;

/**
 * Handler für `ReportSyncConflictCommand` (Story 3.9 AC4, FR50,
 * Architektur §B6).
 *
 * **Transactional Flow** (TX-atomar `INSERT sync_conflicts` + Outbox-Append):
 * 1. Validate: 6 Pflichtfelder, fieldPath-Length, Versions ≥ 1, Versions-
 *    Plausibilität (`server > local`), entityType strikt.
 * 2. Caller-Auth: Caller MUSS aktiver Teilnehmer im Einsatz sein.
 * 3. Cross-Einsatz-Check: falls einheitId gesetzt → muss zum einsatzId gehören.
 * 4. Repository-Idempotenz-Pfad (`recordOrFindExisting`).
 * 5. **Conditional Event-Emit:** NUR bei frischem Insert
 *    (`alreadyExisted=false`). Re-Trigger durch Tab-Reload/Retry darf den
 *    Banner NICHT erneut bursten.
 *
 * **`entityType`-Scope:** Story 3.9 strikt `'PSA_PROFIL_ZUWEISUNG'`. Andere
 * Werte → `BusinessRule:EntityTypeNotSupportedInStory39`. Phase-2 weitet das
 * in 3.10 auf.
 */
@Injectable()
@CommandHandler(ReportSyncConflictCommand)
export class ReportSyncConflictHandler extends TransactionalCommandHandler<ReportSyncConflictCommand, ReportSyncConflictResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SYNC_CONFLICT_REPOSITORY)
    private readonly syncConflictRepo: ISyncConflictRepository,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly teilnehmerRepo: IEinsatzTeilnehmerRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: ReportSyncConflictCommand,
    tx: TransactionContext,
  ): Promise<Result<ReportSyncConflictResult> | { result: ReportSyncConflictResult; events: DomainEvent[] }> {
    // Step 1 — Command-Validation.
    const validation = this.validateCommand(command);
    if (validation.isFailure) {
      return Result.fail<ReportSyncConflictResult>(validation.error!);
    }

    // Step 2 — Caller-Auth: aktiver Teilnehmer im Einsatz.
    let teilnehmer: Awaited<ReturnType<IEinsatzTeilnehmerRepository['findByEinsatzAndUser']>>;
    try {
      teilnehmer = await this.teilnehmerRepo.findByEinsatzAndUser(command.einsatzId, command.callerUserId, tx);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return Result.fail<ReportSyncConflictResult>(wrapInfrastructureError(undefined, `Teilnehmer-Lookup fehlgeschlagen: ${message}`));
    }
    if (!teilnehmer) {
      return Result.fail<ReportSyncConflictResult>(REPORT_SYNC_CONFLICT_ERROR_CODES.NOT_TEILNEHMER);
    }

    // Step 3 — Cross-Einsatz-Membership-Check für einheitId (falls gesetzt).
    if (command.einheitId !== null) {
      const einheitResult = await this.einheitRepo.findById(command.einheitId, tx);
      if (einheitResult.isFailure) {
        return Result.fail<ReportSyncConflictResult>(wrapInfrastructureError(einheitResult.error, 'Einheit konnte nicht geladen werden'));
      }
      const einheit = einheitResult.value;
      if (!einheit || einheit.einsatzId !== command.einsatzId) {
        return Result.fail<ReportSyncConflictResult>(REPORT_SYNC_CONFLICT_ERROR_CODES.EINHEIT_NOT_IN_EINSATZ);
      }
    }

    // Step 4 — Repository-Idempotenz-Pfad.
    const recordResult = await this.syncConflictRepo.recordOrFindExisting(
      {
        einsatzId: command.einsatzId,
        einheitId: command.einheitId,
        entityType: command.entityType,
        entityId: command.entityId,
        fieldPath: command.fieldPath,
        localPayload: command.localPayload,
        serverVersion: command.serverVersion,
        localExpectedVersion: command.localExpectedVersion,
        reportedByUserId: command.callerUserId,
      },
      tx,
    );
    if (recordResult.isFailure) {
      return Result.fail<ReportSyncConflictResult>(wrapInfrastructureError(recordResult.error, 'sync_conflicts-Persistenz fehlgeschlagen'));
    }
    const { id, alreadyExisted } = recordResult.value!;

    // Step 5 — Conditional Event-Emit.
    const events: DomainEvent[] = [];
    if (!alreadyExisted) {
      events.push(
        new KonfliktErkanntEvent(
          command.einsatzId,
          command.callerUserId,
          command.einheitId,
          command.entityType,
          command.entityId,
          command.fieldPath,
          command.localPayload,
          command.serverVersion,
          command.localExpectedVersion,
          command.entityId,
        ),
      );
    } else {
      this.logger.debug('ReportSyncConflict: Idempotenz-Treffer (kein Event-Emit)', {
        syncConflictId: id,
      });
    }

    return { result: { syncConflictId: id, alreadyExisted }, events };
  }

  private validateCommand(command: ReportSyncConflictCommand): Result<void> {
    if (!command.einsatzId || command.einsatzId.trim().length === 0) {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.EINSATZ_REQUIRED);
    }
    if (!command.callerUserId || command.callerUserId.trim().length === 0) {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.CALLER_REQUIRED);
    }
    if (!command.entityId || command.entityId.trim().length === 0) {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.ENTITY_ID_REQUIRED);
    }
    if (typeof command.fieldPath !== 'string' || command.fieldPath.trim().length === 0 || command.fieldPath.length > FIELD_PATH_MAX) {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.FIELD_PATH_INVALID);
    }
    if (!Number.isInteger(command.serverVersion) || command.serverVersion < 1 || !Number.isInteger(command.localExpectedVersion) || command.localExpectedVersion < 1) {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.VERSION_INVALID);
    }
    if (command.serverVersion <= command.localExpectedVersion) {
      // Defense-in-Depth: ein Client, der `local === server` (oder gar
      // local > server) meldet, hat ein Bug. Wir persistieren den Konflikt
      // nicht stillschweigend.
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.VERSION_NOT_CONFLICT);
    }
    if (command.localPayload === null || typeof command.localPayload !== 'object' || Array.isArray(command.localPayload)) {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.LOCAL_PAYLOAD_INVALID);
    }
    if (command.entityType !== 'PSA_PROFIL_ZUWEISUNG') {
      return Result.fail<void>(REPORT_SYNC_CONFLICT_ERROR_CODES.ENTITY_TYPE_NOT_SUPPORTED);
    }
    return Result.ok<void>(undefined);
  }
}
