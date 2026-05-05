import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { createId } from '@paralleldrive/cuid2';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { PsaProfil } from '@/generated/prisma/enums';
import { PsaProfilZuweisung } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import { KonfliktAufgeloestEvent, type SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import type { IPsaProfilZuweisungRepository } from '@domain/eigenschutz/repositories/i-psa-profil-zuweisung.repository';
import type { ISyncConflictRepository, SyncConflictReadModel } from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import { LocalWinsPsaProfilPayloadSchema, type LocalWinsPsaProfilPayload } from '@domain/eigenschutz/value-objects/local-wins-psa-profil-payload.schema';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER, OUTBOX_REPOSITORY, PSA_PROFIL_ZUWEISUNG_REPOSITORY, SYNC_CONFLICT_REPOSITORY } from '@infrastructure/di-tokens';
import { ResolveKonfliktCommand, type ResolveKonfliktResult } from './resolve-konflikt.command';
import { RESOLVE_KONFLIKT_ERROR_CODES } from './resolve-konflikt.error-codes';

const VALID_RESOLUTIONS: ReadonlySet<SyncConflictResolution> = new Set(['SERVER_WINS', 'LOCAL_WINS', 'MERGED']);

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${RESOLVE_KONFLIKT_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Handler für `ResolveKonfliktCommand` (Story 3.10 AC4, FR50,
 * Architektur §B6 + §G1).
 *
 * **Transactional Flow** (atomar in einer Outbox-TX):
 * 1. Command-Validation (Pflichtfelder, Resolution-Enum).
 * 2. Caller-Membership-Check (`EinsatzTeilnehmer`-Repo, Pattern Story 3.9).
 * 3. Konflikt-Lookup via `findById` (kein Cross-Einsatz-Filter im Repo —
 *    der Cross-Einsatz-Check folgt explizit als Schritt 4 als Defense-in-
 *    Depth gegen Querschuss-Resolves).
 * 4. Cross-Einsatz-Check.
 * 5. Already-Resolved-Idempotenz: `resolvedAt !== null` → Result.ok mit
 *    `alreadyResolved: true`. **Kein** Event-Emit.
 * 6. EntityType-Scope-Guard für `LOCAL_WINS`/`MERGED`.
 * 7. Resolution-spezifischer Pfad:
 *    - `SERVER_WINS`: nur `markResolved` + Event.
 *    - `LOCAL_WINS` (PSA): Aggregat-Reapply (siehe `reapplyLocalWinsForPsa`).
 *    - `MERGED` (PSA, Phase-1-MVP): identisch zu `SERVER_WINS`, aber mit
 *      `resolution = 'MERGED'` (Audit-Marker). Phase 2 implementiert echten
 *      Field-Merge für `GEFAEHRDUNGSBEURTEILUNG_ITEM`.
 * 8. `markResolved` (idempotent über `resolvedAt IS NULL`).
 * 9. Conditional Event-Emit: `KonfliktAufgeloestEvent` NUR bei
 *    `markResolved.alreadyResolved === false`.
 *
 * **API-Gap-Note (siehe Story-Output):** Das Aggregat hat keine `activate`/
 * `hatProfilAktiv`/`save`-Methoden — die Granularität ist row-per-(einheit,
 * profil). Der Reapply spiegelt deshalb das Pattern aus
 * `change-psa-profil.handler.ts` (`findActiveByEinheit` + `saveActivation`/
 * `closeActiveZuweisung`) statt eines hypothetischen Aggregate-Set-Toggles.
 */
@Injectable()
@CommandHandler(ResolveKonfliktCommand)
export class ResolveKonfliktHandler extends TransactionalCommandHandler<ResolveKonfliktCommand, ResolveKonfliktResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SYNC_CONFLICT_REPOSITORY)
    private readonly syncConflictRepo: ISyncConflictRepository,
    @Inject(PSA_PROFIL_ZUWEISUNG_REPOSITORY)
    private readonly psaProfilZuweisungRepo: IPsaProfilZuweisungRepository,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly teilnehmerRepo: IEinsatzTeilnehmerRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: ResolveKonfliktCommand, tx: TransactionContext): Promise<Result<ResolveKonfliktResult> | { result: ResolveKonfliktResult; events: DomainEvent[] }> {
    // Step 1 — Command-Validation.
    const validation = this.validateCommand(command);
    if (validation.isFailure) {
      return Result.fail<ResolveKonfliktResult>(validation.error!);
    }

    // Step 2 — Caller-Membership-Check (Defense-in-Depth zur Guard-Kette).
    let teilnehmer: Awaited<ReturnType<IEinsatzTeilnehmerRepository['findByEinsatzAndUser']>>;
    try {
      teilnehmer = await this.teilnehmerRepo.findByEinsatzAndUser(command.einsatzId, command.callerUserId, tx);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return Result.fail<ResolveKonfliktResult>(wrapInfrastructureError(undefined, `Teilnehmer-Lookup fehlgeschlagen: ${message}`));
    }
    if (!teilnehmer) {
      return Result.fail<ResolveKonfliktResult>(RESOLVE_KONFLIKT_ERROR_CODES.NOT_TEILNEHMER);
    }

    // Step 3 — Konflikt-Lookup. `tx` durchreichen, damit `findById` im
    // selben TX-Kontext wie `markResolved` läuft (kohärenter Snapshot,
    // Code-Review F2).
    const conflictResult = await this.syncConflictRepo.findById(command.syncConflictId, tx);
    if (conflictResult.isFailure) {
      return Result.fail<ResolveKonfliktResult>(wrapInfrastructureError(conflictResult.error, 'sync_conflicts.findById fehlgeschlagen'));
    }
    const conflict = conflictResult.value;
    if (!conflict) {
      return Result.fail<ResolveKonfliktResult>(RESOLVE_KONFLIKT_ERROR_CODES.CONFLICT_NOT_FOUND);
    }

    // Step 4 — Cross-Einsatz-Check (Defense-in-Depth — der Endpoint ist
    // bereits einsatz-scoped via Path-Param + Guard, aber der Read-Model-
    // Lookup-Pfad sollte die Invariante explizit prüfen).
    if (conflict.einsatzId !== command.einsatzId) {
      return Result.fail<ResolveKonfliktResult>(RESOLVE_KONFLIKT_ERROR_CODES.CONFLICT_NOT_IN_EINSATZ);
    }

    // Step 5 — Already-Resolved-Idempotenz (Tab-Reload-Schutz).
    if (conflict.resolvedAt !== null) {
      this.logger.debug('ResolveKonflikt: Idempotenz-Treffer (bereits aufgelöst, kein Event-Emit)', {
        syncConflictId: conflict.id,
        resolvedAt: conflict.resolvedAt,
      });
      return {
        result: { syncConflictId: conflict.id, alreadyResolved: true, resolvedAt: conflict.resolvedAt },
        events: [],
      };
    }

    // Step 6 — EntityType-Scope-Guard für mutierende Resolutions.
    if ((command.resolution === 'LOCAL_WINS' || command.resolution === 'MERGED') && conflict.entityType !== 'PSA_PROFIL_ZUWEISUNG') {
      return Result.fail<ResolveKonfliktResult>(RESOLVE_KONFLIKT_ERROR_CODES.ENTITY_TYPE_NOT_SUPPORTED);
    }

    // Step 7 — Resolution-spezifische Logik.
    const reapplyEvents: DomainEvent[] = [];
    if (command.resolution === 'LOCAL_WINS') {
      const reapplyResult = await this.reapplyLocalWinsForPsa(command, conflict, tx);
      if (reapplyResult.isFailure) {
        // Sekundärer Konflikt-Pfad: `ConflictDetected:` propagiert wortgleich
        // ohne `markResolved` und ohne Event (Story 3.9 AC4 Q4).
        return Result.fail<ResolveKonfliktResult>(reapplyResult.error!);
      }
      reapplyEvents.push(...reapplyResult.value!);
    }
    // SERVER_WINS / MERGED: keine Aggregat-Mutation. Phase-2-Hook für
    // GEFAEHRDUNGSBEURTEILUNG_ITEM-Field-Merge wäre hier ein eigener
    // Reapply-Pfad analog zu `reapplyLocalWinsForPsa`.

    // Step 8 — markResolved (idempotent über `resolvedAt IS NULL`).
    const resolvedAt = new Date();
    const markResult = await this.syncConflictRepo.markResolved(conflict.id, command.resolution, command.callerUserId, resolvedAt, tx);
    if (markResult.isFailure) {
      return Result.fail<ResolveKonfliktResult>(wrapInfrastructureError(markResult.error, 'sync_conflicts.markResolved fehlgeschlagen'));
    }

    // Step 9 — Conditional Event-Emit.
    // Race-Lose-Pfad: ein zweiter Resolve-Call hat das Race verloren
    // (`alreadyResolved=true`). Bei `SERVER_WINS`/`MERGED` (Phase-1-MVP) hat
    // der Pfad das Aggregat NICHT mutiert — wir geben Result.ok zurück und
    // unterdrücken das Event (Idempotenz für Tab-Reload, Multi-Click).
    //
    // Bei `LOCAL_WINS` mit erfolgtem Reapply (`reapplyEvents.length > 0`)
    // hat `reapplyLocalWinsForPsa` das `PsaProfilZuweisung`-Aggregat bereits
    // innerhalb der TX mutiert. Wenn wir hier Result.ok zurückgeben, würde
    // die `TransactionalCommandHandler`-Basisklasse die TX committen — die
    // PSA-Mutation wäre persistiert OHNE Outbox-Event und ohne Korrektur
    // (der Winner-Call hat bereits eine andere Resolution gewählt). Daher:
    // explizit fail mit `ConflictDetected:SyncConflict:RaceLost`, damit die
    // Basisklasse die TX rollbackt.
    if (markResult.value!.alreadyResolved) {
      if (reapplyEvents.length > 0) {
        this.logger.warn?.('ResolveKonflikt: Race-Lose-Pfad mit bereits mutiertem Aggregat — TX-Rollback erzwingen', {
          syncConflictId: conflict.id,
          reapplyEventCount: reapplyEvents.length,
        });
        return Result.fail<ResolveKonfliktResult>('ConflictDetected:SyncConflict:RaceLost');
      }
      this.logger.debug('ResolveKonflikt: Race-Lose-Pfad (markResolved=true, kein Event-Emit)', {
        syncConflictId: conflict.id,
      });
      return {
        result: { syncConflictId: conflict.id, alreadyResolved: true, resolvedAt },
        events: [],
      };
    }

    const events: DomainEvent[] = [
      ...reapplyEvents,
      new KonfliktAufgeloestEvent(
        conflict.einsatzId,
        command.callerUserId,
        conflict.einheitId,
        conflict.id,
        conflict.entityType,
        conflict.entityId,
        conflict.fieldPath,
        command.resolution,
        resolvedAt,
        conflict.id,
      ),
    ];

    return {
      result: { syncConflictId: conflict.id, alreadyResolved: false, resolvedAt },
      events,
    };
  }

  /**
   * Reapply-Logik für `LOCAL_WINS` (PSA-Profil-Zuweisung).
   *
   * Mirrors `change-psa-profil.handler.ts#applyToggle` per Toggle:
   * - Aktiviere Profile, die im Ziel-Set sind, aber server-seitig nicht aktiv:
   *   `PsaProfilZuweisung.create({...})` + `repo.saveActivation(...)`.
   * - Deaktiviere Profile, die server-seitig aktiv sind, aber im Ziel-Set
   *   `aktiv: false` haben: `aggregate.deactivate({expectedVersion: aggregate.version, ...})`
   *   + `repo.closeActiveZuweisung(...)`.
   *
   * **Scope:** Wir scopen nur auf `conflict.einheitId` (single Einheit), weil
   * PSA-Konflikte row-level pro Einheit-Profil-Tupel sind. `localPayload.
   * resolvedEinheitIds` ist UI-Kontext (welche Einheiten der ursprüngliche
   * Bulk-Toggle umfasste) und NICHT die autoritative Scope-Quelle für den
   * Reapply.
   *
   * **`expectedVersion`-Semantik:** Wir verwenden bewusst die *aktuelle*
   * `aggregate.version` (frisch geladen) — kein 409 mehr im In-Memory-Check.
   * Eine sekundäre Race kann nur an der DB-Lost-Update-Schicht in
   * `closeActiveZuweisung` schlagen — der Sentinel
   * `ConflictDetected:PsaProfilZuweisung:current=<n>...` wird wortgleich
   * propagiert (Story 3.9 AC4 Q4 — Multi-Device-Konflikt-Kaskade).
   */
  private async reapplyLocalWinsForPsa(command: ResolveKonfliktCommand, conflict: SyncConflictReadModel, tx: TransactionContext): Promise<Result<DomainEvent[]>> {
    if (conflict.einheitId === null) {
      // PSA-Konflikte haben Story-3.9-strikt eine einheitId; ein null-Wert
      // wäre ein Datenfehler. Defense-in-Depth.
      return Result.fail<DomainEvent[]>(RESOLVE_KONFLIKT_ERROR_CODES.LOCAL_WINS_AGGREGATE_NOT_FOUND);
    }

    // Aggregat-Existenz-Check via `findByZuweisungId`. Das deckt den AC4-Pfad
    // „Aggregat zwischenzeitlich gelöscht" ab — wenn die referenzierte
    // Zuweisungs-Row weg ist, geben wir `LOCAL_WINS_AGGREGATE_NOT_FOUND`
    // zurück und der Konflikt bleibt offen.
    const existsResult = await this.psaProfilZuweisungRepo.findByZuweisungId(conflict.entityId, conflict.einsatzId, tx);
    if (existsResult.isFailure) {
      return Result.fail<DomainEvent[]>(wrapInfrastructureError(existsResult.error, 'PsaProfilZuweisung.findByZuweisungId fehlgeschlagen'));
    }
    if (!existsResult.value) {
      return Result.fail<DomainEvent[]>(RESOLVE_KONFLIKT_ERROR_CODES.LOCAL_WINS_AGGREGATE_NOT_FOUND);
    }

    // Payload-Validation gegen das Zod-Schema.
    const payloadResult = LocalWinsPsaProfilPayloadSchema.safeParse(conflict.localPayload);
    if (!payloadResult.success) {
      return Result.fail<DomainEvent[]>(RESOLVE_KONFLIKT_ERROR_CODES.LOCAL_WINS_PAYLOAD_INVALID);
    }
    const payload: LocalWinsPsaProfilPayload = payloadResult.data;

    const propagationGroupId = createId();
    const events: DomainEvent[] = [];

    for (const toggle of payload.toggles) {
      const stepResult = await this.applyToggleForReapply(command, conflict.einheitId, toggle.profil, toggle.aktiv, payload.begruendung, propagationGroupId, tx);
      if (stepResult.isFailure) {
        // Sentinel wird wortgleich propagiert (z. B.
        // `ConflictDetected:PsaProfilZuweisung:current=8:zuweisungId=...`).
        return Result.fail<DomainEvent[]>(stepResult.error!);
      }
      events.push(...stepResult.value!);
    }

    return Result.ok<DomainEvent[]>(events);
  }

  private async applyToggleForReapply(
    command: ResolveKonfliktCommand,
    einheitId: string,
    profil: PsaProfil,
    aktiv: boolean,
    begruendung: string,
    propagationGroupId: string,
    tx: TransactionContext,
  ): Promise<Result<DomainEvent[]>> {
    const activeResult = await this.psaProfilZuweisungRepo.findActiveByEinheit(command.einsatzId, einheitId, profil, tx);
    if (activeResult.isFailure) {
      return Result.fail<DomainEvent[]>(wrapInfrastructureError(activeResult.error, 'aktive Zuweisung konnte nicht geladen werden'));
    }
    const active = activeResult.value;

    if (aktiv) {
      if (active) {
        // Profil ist bereits aktiv — Toggle-No-Op. Symmetrisch zum
        // `ChangePsaProfilHandler#applyToggle`-Pfad.
        this.logger.debug('LOCAL_WINS-Reapply: Profil bereits aktiv — Toggle als No-Op', {
          einsatzId: command.einsatzId,
          einheitId,
          profil,
        });
        return Result.ok<DomainEvent[]>([]);
      }
      const aggregateResult = PsaProfilZuweisung.create({
        einsatzId: command.einsatzId,
        einheitId,
        profil,
        begruendung,
        aktiviertVonUserId: command.callerUserId,
        propagationGroupId,
      });
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return Result.fail<DomainEvent[]>(aggregateResult.error ?? 'Aggregate-Erzeugung fehlgeschlagen');
      }
      const aggregate = aggregateResult.value;
      const saveResult = await this.psaProfilZuweisungRepo.saveActivation(aggregate, tx);
      if (saveResult.isFailure) {
        return Result.fail<DomainEvent[]>(saveResult.error!);
      }
      return Result.ok<DomainEvent[]>(aggregate.getDomainEvents());
    }

    // Deaktivierung — falls nicht aktiv: No-Op (Set-Operation-Semantik).
    if (!active) {
      this.logger.debug('LOCAL_WINS-Reapply: Profil bereits inaktiv — Deaktivierungs-Toggle als No-Op', {
        einsatzId: command.einsatzId,
        einheitId,
        profil,
      });
      return Result.ok<DomainEvent[]>([]);
    }
    const expectedVersion = active.version;
    const deactivateResult = active.deactivate({
      expectedVersion,
      userId: command.callerUserId,
      begruendung,
      propagationGroupId,
    });
    if (deactivateResult.isFailure) {
      return Result.fail<DomainEvent[]>(deactivateResult.error!);
    }
    const persistResult = await this.psaProfilZuweisungRepo.closeActiveZuweisung(active, expectedVersion, tx);
    if (persistResult.isFailure) {
      // `ConflictDetected:PsaProfilZuweisung:current=<n>:zuweisungId=<id>`
      // propagiert wortgleich — ein dritter User hat das Aggregat zwischen
      // unserem `findActiveByEinheit` und dem `closeActiveZuweisung` mutiert.
      return Result.fail<DomainEvent[]>(persistResult.error!);
    }
    return Result.ok<DomainEvent[]>(active.getDomainEvents());
  }

  private validateCommand(command: ResolveKonfliktCommand): Result<void> {
    if (!command.einsatzId || command.einsatzId.trim().length === 0) {
      return Result.fail<void>(RESOLVE_KONFLIKT_ERROR_CODES.EINSATZ_REQUIRED);
    }
    if (!command.callerUserId || command.callerUserId.trim().length === 0) {
      return Result.fail<void>(RESOLVE_KONFLIKT_ERROR_CODES.CALLER_REQUIRED);
    }
    if (!command.syncConflictId || command.syncConflictId.trim().length === 0) {
      return Result.fail<void>(RESOLVE_KONFLIKT_ERROR_CODES.CONFLICT_ID_REQUIRED);
    }
    if (!VALID_RESOLUTIONS.has(command.resolution)) {
      return Result.fail<void>(RESOLVE_KONFLIKT_ERROR_CODES.RESOLUTION_INVALID);
    }
    return Result.ok<void>(undefined);
  }
}
