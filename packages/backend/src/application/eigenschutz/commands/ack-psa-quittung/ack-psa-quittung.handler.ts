import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IPsaProfilQuittungRepository } from '@domain/eigenschutz/repositories/i-psa-profil-quittung.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { AckPsaQuittungCommand } from './ack-psa-quittung.command';

/**
 * Sentinel-Error-Codes für den PSA-Quittung-Acknowledge-Flow (Story 3.4
 * AC1/AC7). Der Controller mappt die Präfixe deterministisch auf HTTP-
 * Statuscodes (404 für `NotFound:*`, 422 für `BusinessRule:*`, 500 für
 * `InfrastructureError:*`).
 */
export const ACK_PSA_QUITTUNG_ERROR_CODES = {
  UNZULAESSIGE_EINHEITENZUORDNUNG: 'BusinessRule:UnzulaessigeEinheitenZuordnung',
  NOT_FOUND_PROPAGATION: 'NotFound:PsaPropagation',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:PsaProfilQuittung',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${ACK_PSA_QUITTUNG_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Erfolgs-Payload des Handlers. `alreadyAcknowledged === true` markiert den
 * idempotenten Re-Ack-Pfad — die Aufruf-Site (Controller) antwortet weiter
 * mit 204, ohne dass ein neues Event in der Outbox liegt.
 */
export interface AckPsaQuittungResult {
  alreadyAcknowledged: boolean;
}

/**
 * Handler für `AckPsaQuittungCommand` (Story 3.4 AC1/AC2/AC3).
 *
 * **Transactional Flow:**
 * 1. **Caller-Authorization (AC2):** Caller muss aktive `EinsatzTeilnehmer`-
 *    Bindung im Einsatz haben UND seine `EinsatzPerson` muss Mitglied der
 *    übergebenen `einheitId` sein. Sonst
 *    `BusinessRule:UnzulaessigeEinheitenZuordnung`.
 * 2. **Outbox-Lookup:** Es muss mindestens ein
 *    `eigenschutz.psa_profil_geaendert`-Event mit der Kombination
 *    `(propagationGroupId, einheitId)` in der Outbox existieren — sonst
 *    `NotFound:PsaPropagation` (siehe `QuittungAbgegebenEvent`-Doku:
 *    `propagationGroupId` darf keinen `null`-Trace haben).
 * 3. **Quittung-Upsert** (Story 3.4 AC3): Repo legt die Row an oder fängt
 *    `P2002` ab. Bei `created === false` → idempotenter Re-Ack, kein
 *    Event-Write.
 * 4. **Outbox-Write:** Bei Insert → `QuittungAbgegebenEvent` mit dem aus dem
 *    Repo gelieferten `quittiertAm` anreichern.
 *
 * **Permission-Schicht:** Der Controller setzt `@RequiresPermission(
 * 'eigenschutz:psa:acknowledge')` (AC6/AC7); die hier genannten Schritte 1
 * sind defense-in-depth — Permission-Guard prüft Rollen-/Rechte-Mapping,
 * dieser Block prüft die fachliche Bindung an die Einheit.
 */
@Injectable()
@CommandHandler(AckPsaQuittungCommand)
export class AckPsaQuittungHandler extends TransactionalCommandHandler<AckPsaQuittungCommand, AckPsaQuittungResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(PSA_PROFIL_QUITTUNG_REPOSITORY)
    private readonly quittungRepo: IPsaProfilQuittungRepository,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly teilnehmerRepo: IEinsatzTeilnehmerRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: AckPsaQuittungCommand, tx: TransactionContext): Promise<Result<AckPsaQuittungResult> | { result: AckPsaQuittungResult; events: DomainEvent[] }> {
    // Step 1 — Caller-Authorization (AC2, Defense-in-Depth zusätzlich zum
    // Permission-Guard auf Controller-Ebene).
    const teilnehmer = await this.teilnehmerRepo.findByEinsatzAndUser(command.einsatzId, command.callerUserId, tx);
    if (!teilnehmer) {
      return Result.fail<AckPsaQuittungResult>(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }
    // Defense-in-Depth: einsatzId der Teilnehmer-Row gegen Command verifizieren
    // — falls das Repository je locker filtert, blockt diese Prüfung
    // Cross-Einsatz-Bypass.
    if (teilnehmer.einsatzId !== command.einsatzId) {
      return Result.fail<AckPsaQuittungResult>(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }
    // Defense-in-Depth: bereits ausgeschiedene Teilnehmer (`leftAt !== null`)
    // dürfen keine Quittungen mehr abgeben — sonst könnte ein Account nach
    // dem Verlassen des Einsatzes weiter Bekanntgaben quittieren.
    if (teilnehmer.leftAt !== null) {
      return Result.fail<AckPsaQuittungResult>(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }
    const isMemberOfEinheit = await this.einheitRepo.existsPersonenZuordnung(teilnehmer.einsatzPersonId, command.einheitId, tx);
    if (!isMemberOfEinheit) {
      return Result.fail<AckPsaQuittungResult>(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }

    // Step 2 — Outbox-Lookup: Bekanntgabe-Gruppe muss noch erreichbar sein.
    // Eine Quittung ohne zugehörigen Bekanntgabe-Trace wäre eine „Geister-
    // Quittung" — Story 3.4 schreibt das `propagationGroupId`-Feld auf dem
    // `QuittungAbgegebenEvent` als Pflicht-Feld vor.
    const propagationExists = await this.lookupPropagationExists(command.propagationGroupId, command.einheitId, tx);
    if (!propagationExists) {
      this.logger.warn('AckPsaQuittung: keine PsaProfilGeaendert-Outbox-Row für (propagationGroupId, einheitId) gefunden', {
        einsatzId: command.einsatzId,
        propagationGroupId: command.propagationGroupId,
        einheitId: command.einheitId,
      });
      return Result.fail<AckPsaQuittungResult>(ACK_PSA_QUITTUNG_ERROR_CODES.NOT_FOUND_PROPAGATION);
    }

    // Step 3 — Quittung-Upsert (P2002 = Idempotenz).
    const upsertResult = await this.quittungRepo.upsert(tx, {
      propagationGroupId: command.propagationGroupId,
      einheitId: command.einheitId,
      einsatzId: command.einsatzId,
      quittiertVonUserId: command.callerUserId,
    });
    if (upsertResult.isFailure) {
      return Result.fail<AckPsaQuittungResult>(wrapInfrastructureError(upsertResult.error, 'PSA-Quittung konnte nicht gespeichert werden'));
    }
    const upsert = upsertResult.value!;

    // Step 4 — Idempotenz-Branch: keine Event-Persistierung.
    if (!upsert.created) {
      this.logger.log('PSA-Quittung idempotent (P2002, kein neues Event)', {
        einsatzId: command.einsatzId,
        propagationGroupId: command.propagationGroupId,
        einheitId: command.einheitId,
      });
      return { result: { alreadyAcknowledged: true }, events: [] };
    }

    // Step 5 — Outbox-Write: `QuittungAbgegebenEvent`. `quittiertAm` kommt
    // aus dem Repository (DB-Default-Timestamp), nicht aus dem Aggregate —
    // damit das Event den tatsächlich persistierten Zeitstempel trägt.
    const event = new QuittungAbgegebenEvent(command.einsatzId, command.callerUserId, command.einheitId, command.propagationGroupId, upsert.row.quittiertAm);

    return { result: { alreadyAcknowledged: false }, events: [event] };
  }

  /**
   * Prüft, ob für `(propagationGroupId, einheitId)` mindestens eine
   * `eigenschutz.psa_profil_geaendert`-Outbox-Row existiert.
   *
   * **Warum direkt über die Prisma-Tabelle?** Das `IOutboxRepository`-Port
   * exponiert bewusst keinen JSON-Path-Filter (siehe
   * `i-outbox.repository.ts` — `findByAggregateId`/`findAndLockPending`
   * sind die einzigen Read-Pfade). Ein O(N)-Scan über die letzten Events
   * ist mit der erwarteten Bekanntgabe-Größe (≤ 10 Events pro Gruppe,
   * Story 3.4 AC8) unkritisch und vermeidet einen weiteren Domain-Port,
   * der nur für diesen Use-Case existieren würde.
   *
   * **Filter-Strategie:** Prisma JSON-Path-Filter auf
   * `payload.propagationGroupId` + `payload.einheitId` (Postgres-JSONB,
   * Pattern aus `get-erinnerung-timeline.handler.ts`). DB liefert nur
   * Treffer der Bekanntgabe-Gruppe; ein einziger findFirst mit `take: 1`
   * reicht. Damit kann die alte 50er-In-Memory-Sliding-Window-Heuristik
   * entfallen, die unter Last falsche 404s erzeugt hätte (>50 unrelated
   * `psa_profil_geaendert`-Events zwischen Bekanntgabe und Quittung).
   *
   * **Test-Pfad:** In-Memory-Tx-Mocks, die kein `outboxEvent`-Delegate
   * exposen, werden hier wie „kein Treffer" behandelt — Test-Spec setzt
   * den Mock entsprechend.
   */
  private async lookupPropagationExists(propagationGroupId: string, einheitId: string, tx: TransactionContext): Promise<boolean> {
    const client = tx as {
      outboxEvent?: {
        findFirst?: (args: unknown) => Promise<{ id: string } | null>;
      };
    };
    if (!client.outboxEvent || !client.outboxEvent.findFirst) {
      return false;
    }

    const row = await client.outboxEvent.findFirst({
      where: {
        eventName: PsaProfilGeaendertEvent.eventName(),
        AND: [{ payload: { path: ['propagationGroupId'], equals: propagationGroupId } }, { payload: { path: ['einheitId'], equals: einheitId } }],
      },
      select: { id: true },
    });
    return row !== null;
  }
}
