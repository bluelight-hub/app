import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { SICHERHEITSREGEL_CONFLICT_DETECTED, SICHERHEITSREGEL_NO_CHANGES_DETECTED, Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { ISicherheitsregelRepository } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import type { ISicherheitsregelVersionRepository } from '@domain/eigenschutz/repositories/i-sicherheitsregel-version.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SICHERHEITSREGEL_REPOSITORY, SICHERHEITSREGEL_VERSION_REPOSITORY } from '@infrastructure/di-tokens';
import { UpdateSicherheitsregelCommand } from './update-sicherheitsregel.command';

/**
 * Sentinel-Error-Codes für den Update-Flow (Story 2.6 AC3/AC4). Der Controller
 * mappt die Präfixe deterministisch auf HTTP-Statuscodes (404, 409, 422, 500).
 */
export const UPDATE_SICHERHEITSREGEL_ERROR_CODES = {
  REGEL_NOT_FOUND: 'NotFound:Sicherheitsregel',
  EINHEIT_NOT_FOUND: 'NotFound:Einheit',
  CONFLICT_DETECTED: SICHERHEITSREGEL_CONFLICT_DETECTED,
  NO_CHANGES_DETECTED: SICHERHEITSREGEL_NO_CHANGES_DETECTED,
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${UPDATE_SICHERHEITSREGEL_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Hängt den aktuellen DB-Versionsstand als `:current=<n>`-Suffix an den
 * ConflictDetected-Sentinel, damit der Controller die 409-Response mit
 * `context.currentVersion + context.attemptedVersion` anreichern kann
 * (analog zu Story 2.3 Version-Chain-Hardening).
 */
function encodeConflictSentinel(currentVersion: number): string {
  return `${SICHERHEITSREGEL_CONFLICT_DETECTED}:current=${currentVersion}`;
}

/**
 * Zusatzkontext, den der Controller bei einem 409 in die Error-Response packt.
 * `currentVersion` entstammt dem `:current=<n>`-Suffix; `attemptedVersion`
 * reicht der Controller aus dem Request-Body durch.
 */
export interface UpdateSicherheitsregelConflictContext {
  currentVersion: number;
  attemptedVersion: number;
}

/**
 * Handler für `UpdateSicherheitsregelCommand` (Story 2.6 AC3/AC4).
 *
 * **Transactional Flow:**
 * 1. Read-Model laden → liefert Aggregate + `propagationGroupId` + Timestamps
 *    (der Port kapselt, dass die Gruppen-ID im Event-Payload lebt — siehe
 *    Dev-Notes, keine Schema-Migration). Nicht gefunden ⇒ `NotFound:Sicherheitsregel`.
 * 2. Ziel-Set normalisieren:
 *    - `null` → `{null}` (einsatzweit)
 *    - `string[]` → dedupliziertes Set
 * 3. **Re-Wire-Entscheidung:** Vergleich des neuen Ziel-Sets mit dem aktuellen
 *    `einheitId` der Row (Single-Element-Set bzw. `{null}`).
 *    - **Gleich** → reiner In-Place-Update (`aggregate.update(...)` →
 *      `repo.updateWithNewVersion`, neue Version-Zeile, Version N → N+1).
 *    - **Unterschiedlich** → Re-Wire: alte Row abkündigen
 *      (`aggregate.deprecate` + `repo.deprecate` + `versionRepo.closeCurrentVersion`),
 *      dann pro neuer Zieleinheit eine frische Row erzeugen
 *      (`Sicherheitsregel.create` + `repo.save` + `saveInitialVersion`).
 * 4. Optimistic-Concurrency: Aggregate-Methode prüft `expectedVersion`;
 *    Mismatch ⇒ `ConflictDetected:Sicherheitsregel:current=<n>`.
 *    No-Op-Update (gleiche Werte + gleiche Einheit) ⇒ `BusinessRule:NoChangesDetected`.
 * 5. Bei Re-Wire: neue Einheiten müssen existieren UND zum Einsatz gehören
 *    (Einsatz-Scoping analog zum Create-Flow).
 * 6. Base-Handler persistiert alle gesammelten Events atomar über Outbox.
 *
 * **Return-Typ:** `string[]` — IDs aller Rows, die nach der Operation in der
 * Fanout-Gruppe **aktiv** sind. In-Place-Update ⇒ `[regelId]`. Re-Wire ⇒
 * Liste der neu erzeugten Rows. Symmetrisch zum Create-Handler; der
 * Controller (Task 6) entscheidet das Response-Shape.
 */
@Injectable()
@CommandHandler(UpdateSicherheitsregelCommand)
export class UpdateSicherheitsregelHandler extends TransactionalCommandHandler<UpdateSicherheitsregelCommand, string[]> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SICHERHEITSREGEL_REPOSITORY)
    private readonly sicherheitsregelRepo: ISicherheitsregelRepository,
    @Inject(SICHERHEITSREGEL_VERSION_REPOSITORY)
    private readonly versionRepo: ISicherheitsregelVersionRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateSicherheitsregelCommand, tx: TransactionContext): Promise<Result<string[]> | { result: string[]; events: DomainEvent[] }> {
    // Step 1 — Read-Model laden (Aggregate + propagationGroupId + Metadaten).
    const readModelResult = await this.sicherheitsregelRepo.findReadModelById(command.regelId, command.einsatzId, tx);
    if (readModelResult.isFailure) {
      return Result.fail<string[]>(wrapInfrastructureError(readModelResult.error, 'Sicherheitsregel konnte nicht geladen werden'));
    }
    const readModel = readModelResult.value;
    if (!readModel) {
      return Result.fail<string[]>(UPDATE_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND);
    }
    const aggregate = readModel.aggregate;
    const propagationGroupId = readModel.propagationGroupId;

    // Step 2 — Neues Ziel-Set normalisieren (null = einsatzweit, sonst Deduplikation).
    const newTargets = this.normalizeTargets(command.einheitIds);

    // Step 3 — Ziel-Vergleich: Re-Wire-Pfad nur wenn sich das Ziel-Set
    // tatsächlich ändert. Wenn der Client `einsatzweit` oder dieselbe Einzel-
    // Einheit schickt, reicht ein In-Place-Update.
    const currentTarget = aggregate.einheitId; // null oder einheitId
    const isInPlaceUpdate = this.isSameSingleTarget(newTargets, currentTarget);

    if (isInPlaceUpdate) {
      return this.applyInPlaceUpdate(command, aggregate, propagationGroupId, tx);
    }
    return this.applyReWire(command, aggregate, propagationGroupId, newTargets, tx);
  }

  /**
   * In-Place-Update (AC3): Titel/Inhalt ändern, Version inkrementieren, neue
   * Version-Zeile anhängen. `einheitId` kann dabei unverändert bleiben (der
   * Vergleich oben hat das sichergestellt).
   */
  private async applyInPlaceUpdate(
    command: UpdateSicherheitsregelCommand,
    aggregate: Sicherheitsregel,
    propagationGroupId: string,
    tx: TransactionContext,
  ): Promise<Result<string[]> | { result: string[]; events: DomainEvent[] }> {
    const updateResult = aggregate.update({ titel: command.titel, inhalt: command.inhalt, einheitId: aggregate.einheitId }, command.expectedVersion, command.userId, propagationGroupId);
    if (updateResult.isFailure) {
      const errorMessage = updateResult.error ?? 'Update fehlgeschlagen';
      if (errorMessage === SICHERHEITSREGEL_CONFLICT_DETECTED) {
        return Result.fail<string[]>(encodeConflictSentinel(aggregate.version));
      }
      // `BusinessRule:NoChangesDetected` und rohe Validierungsfehler direkt
      // durchreichen — der Controller mappt BusinessRule: → 422.
      return Result.fail<string[]>(errorMessage);
    }

    const saveResult = await this.sicherheitsregelRepo.updateWithNewVersion(aggregate, command.userId, tx);
    if (saveResult.isFailure) {
      const saveError = saveResult.error ?? 'Sicherheitsregel konnte nicht aktualisiert werden';
      if (saveError === SICHERHEITSREGEL_CONFLICT_DETECTED) {
        // Reload OHNE `tx` (frischer Connection-Snapshot, siehe
        // Analog-Kommentar im Gefährdungsbeurteilungs-Handler).
        const reload = await this.sicherheitsregelRepo.findById(command.regelId, command.einsatzId);
        if (reload.isSuccess && reload.value) {
          return Result.fail<string[]>(encodeConflictSentinel(reload.value.version));
        }
        this.logger.warn('Conflict-Reload nach DB-Level-409 fehlgeschlagen — 409 ohne currentVersion', {
          regelId: command.regelId,
          reloadError: reload.isFailure ? reload.error : 'aggregate-not-found',
        });
        return Result.fail<string[]>(SICHERHEITSREGEL_CONFLICT_DETECTED);
      }
      return Result.fail<string[]>(wrapInfrastructureError(saveError, 'Sicherheitsregel konnte nicht aktualisiert werden'));
    }

    const events = aggregate.getDomainEvents();
    const ausgerufenEvent = events.find((event) => event instanceof SicherheitsregelAusgerufenEvent) as SicherheitsregelAusgerufenEvent | undefined;
    if (!ausgerufenEvent) {
      return Result.fail<string[]>('SicherheitsregelAusgerufenEvent fehlt nach update');
    }

    const versionResult = await this.versionRepo.saveNewVersion(
      {
        regelId: aggregate.id.value,
        version: aggregate.version,
        titel: aggregate.titel,
        inhalt: aggregate.inhalt,
        gueltigVon: ausgerufenEvent.occurredAt,
        changedByUserId: command.userId,
        eventId: ausgerufenEvent.eventId,
      },
      tx,
    );
    if (versionResult.isFailure) {
      return Result.fail<string[]>(wrapInfrastructureError(versionResult.error, 'Version-Row konnte nicht gespeichert werden'));
    }

    this.logger.log('Sicherheitsregel aktualisiert (in-place)', {
      regelId: aggregate.id.value,
      einsatzId: command.einsatzId,
      propagationGroupId,
      fromVersion: ausgerufenEvent.fromVersion,
      toVersion: ausgerufenEvent.toVersion,
      changedFields: ausgerufenEvent.changedFields,
    });

    return { result: [aggregate.id.value], events };
  }

  /**
   * Re-Wire-Pfad (AC4): alte Row logisch abkündigen, für jede neue Einheit
   * eine frische Row mit der ursprünglichen `propagationGroupId`. OCC-Check
   * erfolgt via `aggregate.deprecate` NICHT — `deprecate` kennt kein
   * `expectedVersion`-Token. Wir prüfen die Version daher explizit VOR dem
   * Abkündigen, damit stale-Client-Writes nicht versehentlich Rows
   * neu-aufspannen.
   */
  private async applyReWire(
    command: UpdateSicherheitsregelCommand,
    aggregate: Sicherheitsregel,
    propagationGroupId: string,
    newTargets: (string | null)[],
    tx: TransactionContext,
  ): Promise<Result<string[]> | { result: string[]; events: DomainEvent[] }> {
    // Aggregate-Level-OCC-Guard vor dem Re-Wire — das Aggregate kennt
    // `expectedVersion` nur in `update`, nicht in `deprecate`. Die DB-Level-
    // Prüfung passiert zusätzlich in `repo.deprecate(... expectedVersion)`,
    // damit zwei parallele Re-Wires mit identischem `expectedVersion`
    // serialisiert werden (READ COMMITTED-Race).
    if (aggregate.version !== command.expectedVersion) {
      return Result.fail<string[]>(encodeConflictSentinel(aggregate.version));
    }

    // Einheit-Existenz + Einsatz-Scope: alle neuen konkreten Einheiten
    // müssen zum Einsatz gehören. Die einsatzweite Variante (`null`) ist
    // kein Einheiten-Ziel und wird übersprungen.
    for (const einheitId of newTargets) {
      if (einheitId === null) continue;
      const einheitResult = await this.einheitRepo.findById(einheitId, tx);
      if (einheitResult.isFailure) {
        return Result.fail<string[]>(wrapInfrastructureError(einheitResult.error, 'Einheit konnte nicht geladen werden'));
      }
      const einheit = einheitResult.value;
      if (!einheit || einheit.einsatzId !== command.einsatzId) {
        return Result.fail<string[]>(UPDATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND);
      }
    }

    const collectedEvents: DomainEvent[] = [];

    // Step A — Alte Row abkündigen. Emittiert `{deprecated: true}`-Event mit
    // derselben `propagationGroupId`, damit Consumer die logische Kontinuität
    // erkennen.
    const deprecateResult = aggregate.deprecate(command.userId, propagationGroupId);
    if (deprecateResult.isFailure) {
      return Result.fail<string[]>(deprecateResult.error ?? 'Regel konnte nicht abgekündigt werden');
    }
    const deprecateEvent = aggregate.getDomainEvents().find((event) => event instanceof SicherheitsregelAusgerufenEvent) as SicherheitsregelAusgerufenEvent | undefined;
    if (!deprecateEvent) {
      return Result.fail<string[]>('Deprecate-Event fehlt nach aggregate.deprecate');
    }

    const repoDeprecateResult = await this.sicherheitsregelRepo.deprecate(aggregate.id.value, command.einsatzId, command.userId, command.expectedVersion, tx);
    if (repoDeprecateResult.isFailure) {
      const deprecateError = repoDeprecateResult.error ?? 'Regel konnte nicht abgekündigt werden';
      if (deprecateError === SICHERHEITSREGEL_CONFLICT_DETECTED) {
        // Reload OHNE `tx` (frischer Connection-Snapshot, analog In-Place-Pfad).
        const reload = await this.sicherheitsregelRepo.findById(command.regelId, command.einsatzId);
        if (reload.isSuccess && reload.value) {
          return Result.fail<string[]>(encodeConflictSentinel(reload.value.version));
        }
        this.logger.warn('Conflict-Reload nach Re-Wire-DB-Level-409 fehlgeschlagen — 409 ohne currentVersion', {
          regelId: command.regelId,
          reloadError: reload.isFailure ? reload.error : 'aggregate-not-found',
        });
        return Result.fail<string[]>(SICHERHEITSREGEL_CONFLICT_DETECTED);
      }
      if (deprecateError === UPDATE_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND) {
        return Result.fail<string[]>(UPDATE_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND);
      }
      return Result.fail<string[]>(wrapInfrastructureError(deprecateError, 'Regel konnte nicht abgekündigt werden'));
    }

    const closeVersionResult = await this.versionRepo.closeCurrentVersion(aggregate.id.value, deprecateEvent.occurredAt, tx);
    if (closeVersionResult.isFailure) {
      return Result.fail<string[]>(wrapInfrastructureError(closeVersionResult.error, 'Version-Zeile konnte nicht geschlossen werden'));
    }

    collectedEvents.push(deprecateEvent);

    // Step B — Neue Rows pro Ziel erzeugen, identische propagationGroupId.
    const createdIds: string[] = [];
    for (const einheitId of newTargets) {
      const newAggregateResult = Sicherheitsregel.create({
        einsatzId: command.einsatzId,
        einheitId,
        titel: command.titel,
        inhalt: command.inhalt,
        erstelltVonUserId: command.userId,
        propagationGroupId,
      });
      if (newAggregateResult.isFailure || !newAggregateResult.value) {
        return Result.fail<string[]>(newAggregateResult.error ?? 'Neue Sicherheitsregel konnte nicht erzeugt werden');
      }
      const newAggregate = newAggregateResult.value;

      const saveResult = await this.sicherheitsregelRepo.save(newAggregate, command.userId, tx);
      if (saveResult.isFailure) {
        return Result.fail<string[]>(wrapInfrastructureError(saveResult.error, 'Neue Sicherheitsregel konnte nicht gespeichert werden'));
      }

      const newEvents = newAggregate.getDomainEvents();
      const createEvent = newEvents.find((event) => event instanceof SicherheitsregelAusgerufenEvent) as SicherheitsregelAusgerufenEvent | undefined;
      if (!createEvent) {
        return Result.fail<string[]>('Create-Event fehlt nach aggregate.create im Re-Wire-Pfad');
      }

      const versionResult = await this.versionRepo.saveInitialVersion(
        {
          regelId: newAggregate.id.value,
          version: newAggregate.version,
          titel: newAggregate.titel,
          inhalt: newAggregate.inhalt,
          gueltigVon: createEvent.occurredAt,
          changedByUserId: command.userId,
          eventId: createEvent.eventId,
        },
        tx,
      );
      if (versionResult.isFailure) {
        return Result.fail<string[]>(wrapInfrastructureError(versionResult.error, 'Initiale Version (Re-Wire) konnte nicht gespeichert werden'));
      }

      createdIds.push(newAggregate.id.value);
      collectedEvents.push(...newEvents);
    }

    this.logger.log('Sicherheitsregel re-wired', {
      einsatzId: command.einsatzId,
      deprecatedRegelId: aggregate.id.value,
      newRegelIds: createdIds,
      propagationGroupId,
      einsatzweit: command.einheitIds === null,
      fanoutSize: createdIds.length,
    });

    return { result: createdIds, events: collectedEvents };
  }

  private normalizeTargets(einheitIds: string[] | null): (string | null)[] {
    if (einheitIds === null) return [null];
    // Deduplikation: ein Client könnte dieselbe Einheit doppelt schicken.
    const unique = Array.from(new Set(einheitIds));
    return unique;
  }

  /**
   * True, wenn das neue Ziel-Set exakt dem aktuellen Einzel-Ziel entspricht.
   * - `{null}` vs. `currentTarget === null` → true (einsatzweit bleibt)
   * - `{einheitId}` vs. `currentTarget === einheitId` → true (gleiche Einheit)
   * - Alles andere → false (Re-Wire nötig)
   */
  private isSameSingleTarget(newTargets: (string | null)[], currentTarget: string | null): boolean {
    if (newTargets.length !== 1) return false;
    return newTargets[0] === currentTarget;
  }
}
