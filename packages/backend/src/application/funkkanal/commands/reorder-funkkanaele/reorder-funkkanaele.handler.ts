import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import { FunkkanalReihenfolgeGeaendertEvent } from '@domain/events/funkkanal-reihenfolge-geaendert.event';
import type { FunkkanalReorderEntry, IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { ReorderFunkkanaeleCommand } from './reorder-funkkanaele.command';

/**
 * Handler für den Bulk-Reorder aller Funkkanäle eines Einsatzes.
 *
 * Validiert Cross-Aggregate-Invarianten (alle Kanäle gehören zum Einsatz,
 * keiner ist archiviert, ordering deckt alle aktiven Kanäle ab) und ruft
 * den Repository-Bulk-Update auf. Ein einzelnes
 * `FunkkanalReihenfolgeGeaendertEvent` wird als Zusammenfassung emittiert.
 */
@Injectable()
export class ReorderFunkkanaeleHandler extends TransactionalCommandHandler<ReorderFunkkanaeleCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: ReorderFunkkanaeleCommand, tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<void>(einsatzIdResult.error ?? 'Ungültige EinsatzId');
    }
    const einsatzId = einsatzIdResult.value;

    const repoEntries: FunkkanalReorderEntry[] = [];
    for (const entry of command.ordering) {
      const idResult = FunkkanalId.create(entry.kanalId);
      if (idResult.isFailure || !idResult.value) {
        return Result.fail<void>(idResult.error ?? 'Ungültige FunkkanalId');
      }
      repoEntries.push({ id: idResult.value, sortIndex: entry.sortIndex });
    }

    const existing = await this.funkkanalRepository.findByEinsatzId(einsatzId, { includeArchived: false }, tx);
    const existingIds = new Set(existing.map((a) => a.kanal.id.value));
    for (const entry of command.ordering) {
      if (!existingIds.has(entry.kanalId)) {
        return Result.fail<void>(`Kanal ${entry.kanalId} gehört nicht zu diesem Einsatz`);
      }
    }
    if (repoEntries.length !== existing.length) {
      return Result.fail<void>('ordering muss alle aktiven Kanäle des Einsatzes umfassen');
    }

    await this.funkkanalRepository.reorder(einsatzId, repoEntries, tx);

    const event = new FunkkanalReihenfolgeGeaendertEvent(
      einsatzId,
      command.ordering.map((e) => ({ kanalId: e.kanalId, sortIndex: e.sortIndex })),
    );

    return { result: undefined, events: [event] };
  }
}
