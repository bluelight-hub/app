import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
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
import { lookupPsaPropagationExists } from '../_shared/lookup-psa-propagation';
import { assertCallerAuthorizedForEinheit, UNZULAESSIGE_EINHEITEN_ZUORDNUNG } from '../_shared/caller-authorization';

/**
 * Sentinel-Error-Codes für den PSA-Quittung-Acknowledge-Flow (Story 3.4
 * AC1/AC7). Der Controller mappt die Präfixe deterministisch auf HTTP-
 * Statuscodes (404 für `NotFound:*`, 422 für `BusinessRule:*`, 500 für
 * `InfrastructureError:*`).
 */
export const ACK_PSA_QUITTUNG_ERROR_CODES = {
  UNZULAESSIGE_EINHEITENZUORDNUNG: UNZULAESSIGE_EINHEITEN_ZUORDNUNG,
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
    // Permission-Guard auf Controller-Ebene). Story 3.6 AC4 hat die Logik
    // in `_shared/caller-authorization.ts` extrahiert — dieser Handler und
    // `MeldeLueckeHandler` konsumieren denselben Helper.
    const authResult = await assertCallerAuthorizedForEinheit(
      tx,
      { teilnehmerRepo: this.teilnehmerRepo, einheitRepo: this.einheitRepo },
      { einsatzId: command.einsatzId, callerUserId: command.callerUserId, einheitId: command.einheitId },
    );
    if (authResult.isFailure) {
      return Result.fail<AckPsaQuittungResult>(authResult.error ?? ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }

    // Step 2 — Outbox-Lookup: Bekanntgabe-Gruppe muss noch erreichbar sein.
    // Story 3.6 AC3 hat die JSON-Path-Filter-Logik in
    // `_shared/lookup-psa-propagation.ts` extrahiert — beide Handler nutzen
    // denselben Helper.
    const propagationExists = await lookupPsaPropagationExists(tx, command.propagationGroupId, command.einheitId);
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
}
