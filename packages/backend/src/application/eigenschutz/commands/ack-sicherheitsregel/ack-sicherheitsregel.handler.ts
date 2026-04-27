import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import type { ISicherheitsregelRepository } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import type { ISicherheitsregelQuittungRepository } from '@domain/eigenschutz/repositories/i-sicherheitsregel-quittung.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SICHERHEITSREGEL_QUITTUNG_REPOSITORY, SICHERHEITSREGEL_REPOSITORY } from '@infrastructure/di-tokens';
import { AckSicherheitsregelCommand } from './ack-sicherheitsregel.command';

/**
 * Sentinel-Error-Codes für den Acknowledge-Flow (Story 2.7 AC4/AC9). Der
 * Controller mappt die Präfixe deterministisch auf HTTP-Statuscodes
 * (404 für `NotFound:*`, 409 für `ConflictDetected:*`, 422 für
 * `BusinessRule:*`, 500 für `InfrastructureError:*`).
 */
export const ACK_SICHERHEITSREGEL_ERROR_CODES = {
  REGEL_NOT_FOUND: 'NotFound:Sicherheitsregel',
  UNZULAESSIGE_EINHEITENZUORDNUNG: 'BusinessRule:UnzulaessigeEinheitenZuordnung',
  REGEL_TRIFFT_NICHT_AUF_EINHEIT: 'BusinessRule:RegelTrifftNichtAufEinheit',
  REGEL_ABGEKUENDIGT: SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT,
  CONFLICT_DETECTED: 'ConflictDetected:Sicherheitsregel',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${ACK_SICHERHEITSREGEL_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

function encodeConflictSentinel(currentVersion: number): string {
  return `${ACK_SICHERHEITSREGEL_ERROR_CODES.CONFLICT_DETECTED}:current=${currentVersion}`;
}

/**
 * Erfolgs-Payload des Handlers. `alreadyAcknowledged === true` markiert den
 * idempotenten Re-Ack-Pfad — das Aufruf-Site (Controller) antwortet weiter
 * mit 204, ohne dass ein neues Event in der Outbox liegt.
 */
export interface AckSicherheitsregelResult {
  alreadyAcknowledged: boolean;
}

/**
 * Handler für `AckSicherheitsregelCommand` (Story 2.7 AC9).
 *
 * **Transactional Flow:**
 * 1. **Caller-Authorization (AC4):** Caller muss eine aktive `EinsatzTeilnehmer`-
 *    Bindung im Einsatz haben UND seine `EinsatzPerson` muss Mitglied der
 *    übergebenen `einheitId` sein. Sonst `BusinessRule:UnzulaessigeEinheitenZuordnung`.
 * 2. **Regel-Lookup:** `findActiveById(regelId, einsatzId, tx)` — null bedeutet
 *    nicht-existent ODER abgekündigt → `NotFound:Sicherheitsregel`.
 * 3. **OCC-Check (optional, AC9 Step 4):** Wenn `expectedRegelVersion` gesetzt
 *    und nicht-passend → `ConflictDetected:Sicherheitsregel:current=<n>` (HTTP 409).
 * 4. **Aggregate-Check:** `aggregate.acknowledge(einheitId, callerUserId)` —
 *    durchschleifen bei Failure (Defense-in-Depth gegen einheitId-Mismatch).
 * 5. **Quittung-Upsert:** Repo legt die Row an oder fängt P2002 ab. Bei
 *    `created === false` → idempotenter Re-Ack, kein Event-Write.
 * 6. **Outbox-Write:** Bei Insert → Event mit der `propagationGroupId` der
 *    jüngsten `SicherheitsregelAusgerufen`-Outbox-Row für diese Regel
 *    anreichern. Wenn keine Outbox-Row gefunden wird (Retention), `null`
 *    mit Log — kein Throw.
 *
 * **Permissions deferred:** Konsistent zu Story 2.6 (PO-Decision 2026-04-24).
 * Sobald die Plattform-Permission-Story landet, ergänzt eine Folge-Story
 * `@RequirePermissions('eigenschutz:sicherheitsregel:acknowledge')` und der
 * Caller-Authorization-Block hier wird redundant. TODO unten markiert die
 * Stelle.
 */
@Injectable()
@CommandHandler(AckSicherheitsregelCommand)
export class AckSicherheitsregelHandler extends TransactionalCommandHandler<AckSicherheitsregelCommand, AckSicherheitsregelResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SICHERHEITSREGEL_REPOSITORY)
    private readonly sicherheitsregelRepo: ISicherheitsregelRepository,
    @Inject(SICHERHEITSREGEL_QUITTUNG_REPOSITORY)
    private readonly quittungRepo: ISicherheitsregelQuittungRepository,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly teilnehmerRepo: IEinsatzTeilnehmerRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: AckSicherheitsregelCommand,
    tx: TransactionContext,
  ): Promise<Result<AckSicherheitsregelResult> | { result: AckSicherheitsregelResult; events: DomainEvent[] }> {
    // Step 1 — Caller-Authorization (AC4).
    // TODO(Story-2.7+): Sobald Plattform-Permissions live sind (PO-Decision
    // 2026-04-24, Sicherheitsregel-`@RequirePermissions`-Decorator), kann
    // dieser Block durch den deklarativen Permission-Check ersetzt werden.
    const teilnehmer = await this.teilnehmerRepo.findByEinsatzAndUser(command.einsatzId, command.callerUserId, tx);
    if (!teilnehmer) {
      return Result.fail<AckSicherheitsregelResult>(ACK_SICHERHEITSREGEL_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }
    const isMemberOfEinheit = await this.einheitRepo.existsPersonenZuordnung(teilnehmer.einsatzPersonId, command.einheitId, tx);
    if (!isMemberOfEinheit) {
      return Result.fail<AckSicherheitsregelResult>(ACK_SICHERHEITSREGEL_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }

    // Step 2 — Regel-Lookup mit Aktivitäts-Check.
    const regelResult = await this.sicherheitsregelRepo.findActiveById(command.regelId, command.einsatzId, tx);
    if (regelResult.isFailure) {
      return Result.fail<AckSicherheitsregelResult>(wrapInfrastructureError(regelResult.error, 'Sicherheitsregel konnte nicht geladen werden'));
    }
    const aggregate = regelResult.value;
    if (!aggregate) {
      return Result.fail<AckSicherheitsregelResult>(ACK_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND);
    }

    // Step 3 — OCC-Check (optional).
    if (command.expectedRegelVersion !== undefined && aggregate.version !== command.expectedRegelVersion) {
      return Result.fail<AckSicherheitsregelResult>(encodeConflictSentinel(aggregate.version));
    }

    // Step 4 — Aggregate-Check (einheitId-Match + Active-State Defense-in-Depth).
    const ackResult = aggregate.acknowledge(command.einheitId, command.callerUserId);
    if (ackResult.isFailure) {
      return Result.fail<AckSicherheitsregelResult>(ackResult.error ?? 'acknowledge failed');
    }
    const baseEvent = ackResult.value!.event;

    // Step 5 — Quittung-Upsert (P2002 = Idempotenz).
    const upsertResult = await this.quittungRepo.upsert(tx, {
      regelId: command.regelId,
      einheitId: command.einheitId,
      quittiertVonUserId: command.callerUserId,
    });
    if (upsertResult.isFailure) {
      return Result.fail<AckSicherheitsregelResult>(wrapInfrastructureError(upsertResult.error, 'Quittung konnte nicht gespeichert werden'));
    }
    const upsert = upsertResult.value!;

    // Step 6 — Idempotenz-Branch: keine Event-Persistierung.
    if (!upsert.created) {
      this.logger.log('Sicherheitsregel-Quittung idempotent (P2002, kein neues Event)', {
        regelId: command.regelId,
        einsatzId: command.einsatzId,
        einheitId: command.einheitId,
      });
      return { result: { alreadyAcknowledged: true }, events: [] };
    }

    // Step 7 — Outbox-Write mit propagationGroupId aus letzter Ausgerufen-Event-Row.
    const propagationGroupId = await this.lookupPropagationGroupId(command.regelId, tx);
    if (propagationGroupId === null) {
      this.logger.warn('AckSicherheitsregel: keine SicherheitsregelAusgerufen-Outbox-Row gefunden, Quittung wird mit propagationGroupId=null persistiert (Audit-Trace-Bruch)', {
        regelId: command.regelId,
        einsatzId: command.einsatzId,
        einheitId: command.einheitId,
      });
    }

    // Erweitere das vom Aggregate erzeugte Event um die nachgeladene
    // propagationGroupId. Das Aggregate kennt sie nicht (lebt nur im Event-
    // Stream); der Handler reichert sie hier an. eventId/occurredAt vom
    // Aggregate-Event werden bewahrt, damit Idempotency-Pfade (Replay) den
    // Event-Identity halten.
    const enrichedEvent = new SicherheitsregelQuittiertEvent(
      baseEvent.einsatzId,
      baseEvent.userId,
      baseEvent.einheitId as string,
      baseEvent.regelId,
      propagationGroupId,
      baseEvent.quittiertAm,
      baseEvent.aggregateId,
      baseEvent.occurredAt,
    );

    return { result: { alreadyAcknowledged: false }, events: [enrichedEvent] };
  }

  /**
   * Liest die jüngste **nicht-deprecate** `SicherheitsregelAusgerufen`-Outbox-
   * Row der Regel und extrahiert `payload.propagationGroupId`. Wenn keine
   * passende Row gefunden wird (Outbox-Retention abgeräumt), liefert die
   * Methode `null` — der Caller loggt das und persistiert `null` im
   * Quittiert-Event.
   *
   * **Warum „nicht-deprecate"-Filter?** (Story 2.7 Code-Review-Patch,
   * Decision 3): Bei deprecate-then-ack-Race käme über `orderBy: occurredAt
   * DESC` das Deprecate-Event obenauf, dessen `propagationGroupId` aber zu
   * einem anderen Banner gehört. Die Quittung soll an die Bekanntgabe
   * gebunden bleiben, die der Empfänger gesehen hat — also filtern wir
   * deprecate-Events explizit aus.
   *
   * **Fehler-Handling** (Story 2.7 Code-Review-Patch, lookupPropagationGroupId
   * darf DB-Fehler nicht still schlucken): Echte transiente DB-Fehler werden
   * geworfen und rollen die Tx zurück — nur „kein Treffer" und „Tx-Client
   * ohne `outboxEvent`-Delegate" liefern `null`.
   *
   * **Warum nicht über das Repo?** Der `loadPropagationGroupIds`-Helper im
   * `PrismaSicherheitsregelRepository` liest das **älteste** Event (Create-
   * Pfad). Hier wollen wir das **jüngste, nicht-deprecate** Event (kann auch
   * ein Update sein, das die propagationGroupId neu schreibt). Die
   * Implementierung läuft deshalb direkt über die Prisma-`OutboxEvent`-
   * Tabelle.
   */
  private async lookupPropagationGroupId(regelId: string, tx: TransactionContext): Promise<string | null> {
    const client = tx as {
      outboxEvent?: {
        findMany?: (args: unknown) => Promise<Array<{ payload: unknown }>>;
        findFirst?: (args: unknown) => Promise<{ payload: unknown } | null>;
      };
    };
    if (!client.outboxEvent) {
      // Tx-Client ohne `outboxEvent`-Delegate ist ein bekannter In-Memory-
      // Test-Pfad (kein echter Prisma-Client). Wird dort als „kein Treffer"
      // behandelt, in Produktion fehlt der Delegate niemals.
      return null;
    }

    // Wir lesen die jüngsten 5 Kandidaten (orderBy DESC) und filtern in JS
    // deprecate-Events (`payload.changedFields.deprecated === true`) heraus.
    // Begründung: Prisma-JSON-Path-Filter ist datenbank-spezifisch; ein
    // O(5)-In-Memory-Filter ist robust und mit jedem unterstützten Prisma-
    // Backend kompatibel.
    const queryArgs = {
      where: {
        aggregateId: regelId,
        eventName: SicherheitsregelAusgerufenEvent.eventName(),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      select: { payload: true },
      take: 5,
    };

    const rows = client.outboxEvent.findMany
      ? await client.outboxEvent.findMany(queryArgs)
      : client.outboxEvent.findFirst
        ? await client.outboxEvent.findFirst(queryArgs).then((row) => (row ? [row] : []))
        : [];

    for (const row of rows) {
      const payload = row.payload as { propagationGroupId?: unknown; changedFields?: { deprecated?: unknown } } | null;
      if (!payload) continue;
      if (payload.changedFields && payload.changedFields.deprecated === true) continue;
      if (typeof payload.propagationGroupId === 'string') {
        return payload.propagationGroupId;
      }
    }
    return null;
  }
}
