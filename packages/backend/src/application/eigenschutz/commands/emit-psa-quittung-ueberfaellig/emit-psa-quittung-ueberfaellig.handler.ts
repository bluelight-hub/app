import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { EmitPsaQuittungUeberfaelligCommand } from './emit-psa-quittung-ueberfaellig.command';
import { lookupQuittungUeberfaelligEmitted } from '../_shared/lookup-psa-quittung-ueberfaellig-emitted';
import { lookupQuittungAbgegebenForGroup } from '../_shared/lookup-psa-quittung-abgegeben-for-group';

/**
 * Sentinel-Error-Codes für `EmitPsaQuittungUeberfaelligHandler` (Story 3.7 AC4).
 * Keine `BusinessRule:`-Sentinels: Step 1 ist idempotent (`emitted: false`)
 * ohne Fehler — das ist erwartetes Race-Cond-Verhalten, kein User-Error.
 */
export const EMIT_PSA_QUITTUNG_UEBERFAELLIG_ERROR_CODES = {
  INFRASTRUCTURE_ERROR: 'InfrastructureError:PsaQuittungUeberfaellig',
} as const;

/**
 * Erfolgs-Payload des Handlers.
 *
 * `emitted` markiert, ob ein neues `QuittungUeberfaelligEvent` in die Outbox
 * geschrieben wurde (`true`) oder ob der Re-Check ergab, dass entweder
 * bereits quittiert wurde oder bereits ein Überfällig-Event existiert
 * (`false` = idempotenter Skip, `events[]` leer).
 */
export interface EmitPsaQuittungUeberfaelligResult {
  emitted: boolean;
}

/**
 * Handler für `EmitPsaQuittungUeberfaelligCommand` (Story 3.7 AC4).
 *
 * **Transactional Flow:**
 * 1. **Idempotenz-Re-Check (Defense-in-Depth):**
 *    - `lookupQuittungAbgegebenForGroup` — wenn der Empfänger zwischen
 *      Scheduler-Read und Handler-Execute quittiert hat → kein Event.
 *    - `lookupQuittungUeberfaelligEmitted` — wenn ein paralleler Pod
 *      gerade ein konkurrierendes Event geschrieben hat → kein Event.
 * 2. **Event-Konstruktion** mit den vom Scheduler übergebenen Feldern.
 * 3. **Outbox-Write** atomar via `TransactionalCommandHandler`.
 *
 * **Kein Aggregate-Update:** Der Handler ist „nur Outbox + Event" — keine
 * domänen-fachliche State-Änderung, sondern Audit-Trail-Eintrag aus dem
 * Scheduler-Lifecycle.
 */
@Injectable()
@CommandHandler(EmitPsaQuittungUeberfaelligCommand)
export class EmitPsaQuittungUeberfaelligHandler extends TransactionalCommandHandler<EmitPsaQuittungUeberfaelligCommand, EmitPsaQuittungUeberfaelligResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: EmitPsaQuittungUeberfaelligCommand,
    tx: TransactionContext,
  ): Promise<Result<EmitPsaQuittungUeberfaelligResult> | { result: EmitPsaQuittungUeberfaelligResult; events: DomainEvent[] }> {
    // Step 1a — Quittung wurde inzwischen abgegeben? Race-Cond-Schutz.
    try {
      const quittungVorhanden = await lookupQuittungAbgegebenForGroup(tx, command.propagationGroupId, command.einheitId);
      if (quittungVorhanden) {
        this.logger.debug?.('EmitPsaQuittungUeberfaellig: Quittung wurde inzwischen abgegeben — kein Event', {
          propagationGroupId: command.propagationGroupId,
          einheitId: command.einheitId,
        });
        return { result: { emitted: false }, events: [] };
      }

      // Step 1b — Überfällig-Event bereits emittiert? Pod-Race-Schutz.
      const bereitsEmittiert = await lookupQuittungUeberfaelligEmitted(tx, command.propagationGroupId, command.einheitId);
      if (bereitsEmittiert) {
        this.logger.debug?.('EmitPsaQuittungUeberfaellig: Event bereits in Outbox — Skip', {
          propagationGroupId: command.propagationGroupId,
          einheitId: command.einheitId,
        });
        return { result: { emitted: false }, events: [] };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<EmitPsaQuittungUeberfaelligResult>(`${EMIT_PSA_QUITTUNG_UEBERFAELLIG_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`);
    }

    // Step 2 — Event konstruieren.
    const event = new QuittungUeberfaelligEvent(command.einsatzId, command.einheitId, command.propagationGroupId, command.originalEventId, command.ueberfaelligSeitMin, command.zuweisungId);

    // Step 3 — Outbox-Save erfolgt automatisch durch TransactionalCommandHandler.
    return { result: { emitted: true }, events: [event] };
  }
}
