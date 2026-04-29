import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
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
import { MeldeLueckeCommand } from './melde-luecke.command';
import { lookupPsaPropagationExists } from '../_shared/lookup-psa-propagation';
import { assertCallerAuthorizedForEinheit, UNZULAESSIGE_EINHEITEN_ZUORDNUNG } from '../_shared/caller-authorization';

/**
 * Sentinel-Error-Codes für den MeldeLuecke-Flow (Story 3.6 AC2).
 * Der Controller mappt die Präfixe deterministisch: 404 für `NotFound:*`,
 * 422 für `BusinessRule:*`, 500 für `InfrastructureError:*`.
 */
export const MELDE_LUECKE_ERROR_CODES = {
  UNZULAESSIGE_EINHEITENZUORDNUNG: UNZULAESSIGE_EINHEITEN_ZUORDNUNG,
  NOT_FOUND_PROPAGATION: 'NotFound:PsaPropagation',
  LUECKE_NOTIZ_LEER: 'BusinessRule:LueckeNotizLeer',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:PsaProfilQuittung',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${MELDE_LUECKE_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Erfolgs-Payload des Handlers.
 *
 * `created` markiert, ob eine neue Quittungs-Row angelegt wurde
 * (`true` = Quittung+Lücke atomar) oder eine bestehende geupdated
 * (`false` = vorab quittiert oder Notiz-Korrektur).
 */
export interface MeldeLueckeResult {
  created: boolean;
}

/**
 * Handler für `MeldeLueckeCommand` (Story 3.6 AC2, FR20).
 *
 * **Transactional Flow** (1:1 Pattern `AckPsaQuittungHandler`):
 * 1. **Caller-Authorization (AC4):** DRY-Helper `assertCallerAuthorizedForEinheit`.
 * 2. **Outbox-Lookup:** DRY-Helper `lookupPsaPropagationExists` —
 *    `NotFound:PsaPropagation` falls keine Bekanntgabe-Row existiert.
 * 3. **Trim-Validation:** `meldung.trim()` darf nicht leer sein
 *    (`BusinessRule:LueckeNotizLeer`).
 * 4. **Quittungs-Upsert mit Lücke (AC3):** `IPsaProfilQuittungRepository.
 *    upsertWithLuecke(...)` — atomares Insert/Update.
 * 5. **Outbox-Write `LueckeGemeldetEvent`** mit Server-`now()`. **KEIN**
 *    zusätzliches `QuittungAbgegebenEvent` (Q5-Default — verhindert
 *    Doppel-Telemetrie).
 *
 * **Permission-Schicht:** Der Controller setzt `@RequiresPermission(
 * 'eigenschutz:psa:acknowledge')` (AC9 / Q4 — Reuse statt neue Permission).
 */
@Injectable()
@CommandHandler(MeldeLueckeCommand)
export class MeldeLueckeHandler extends TransactionalCommandHandler<MeldeLueckeCommand, MeldeLueckeResult> {
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

  protected async executeInTransaction(command: MeldeLueckeCommand, tx: TransactionContext): Promise<Result<MeldeLueckeResult> | { result: MeldeLueckeResult; events: DomainEvent[] }> {
    // Step 1 — Caller-Authorization (AC4).
    const authResult = await assertCallerAuthorizedForEinheit(
      tx,
      { teilnehmerRepo: this.teilnehmerRepo, einheitRepo: this.einheitRepo },
      { einsatzId: command.einsatzId, callerUserId: command.callerUserId, einheitId: command.einheitId },
    );
    if (authResult.isFailure) {
      return Result.fail<MeldeLueckeResult>(authResult.error ?? MELDE_LUECKE_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG);
    }

    // Step 2 — Outbox-Lookup: Bekanntgabe-Gruppe muss noch erreichbar sein.
    const propagationExists = await lookupPsaPropagationExists(tx, command.propagationGroupId, command.einheitId);
    if (!propagationExists) {
      this.logger.warn('MeldeLuecke: keine PsaProfilGeaendert-Outbox-Row für (propagationGroupId, einheitId) gefunden', {
        einsatzId: command.einsatzId,
        propagationGroupId: command.propagationGroupId,
        einheitId: command.einheitId,
      });
      return Result.fail<MeldeLueckeResult>(MELDE_LUECKE_ERROR_CODES.NOT_FOUND_PROPAGATION);
    }

    // Step 3 — Trim-Validation (Defense-in-Depth gegen Whitespace-only).
    const trimmedMeldung = command.meldung.trim();
    if (trimmedMeldung.length === 0) {
      return Result.fail<MeldeLueckeResult>(MELDE_LUECKE_ERROR_CODES.LUECKE_NOTIZ_LEER);
    }

    // Step 4 — Quittungs-Upsert mit Lücke (AC3).
    const upsertResult = await this.quittungRepo.upsertWithLuecke(tx, {
      propagationGroupId: command.propagationGroupId,
      einheitId: command.einheitId,
      einsatzId: command.einsatzId,
      quittiertVonUserId: command.callerUserId,
      lueckeNotiz: trimmedMeldung,
    });
    if (upsertResult.isFailure) {
      return Result.fail<MeldeLueckeResult>(wrapInfrastructureError(upsertResult.error, 'PSA-Lücke konnte nicht gespeichert werden'));
    }
    const upsert = upsertResult.value!;

    // Step 5 — Outbox-Write: `LueckeGemeldetEvent` mit Server-`now()`.
    // MVP-Default (Q3): keine separate `luecke_gemeldet_am`-Spalte —
    // `gemeldetAm` ist Server-Zeit zum Persistierungs-Zeitpunkt.
    const gemeldetAm = new Date();
    const event = new LueckeGemeldetEvent(command.einsatzId, command.callerUserId, command.einheitId, command.propagationGroupId, trimmedMeldung, gemeldetAm);

    return { result: { created: upsert.created }, events: [event] };
  }
}
