import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { ZeichenEntferntEvent } from '@domain/taktische-zeichen/events/zeichen-entfernt.event';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, LOGGER, TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import type { EntferneZeichenCommand } from './entferne-zeichen.command';

/**
 * Handler zum Löschen eines taktischen Zeichens aus dem System.
 * Emittiert ZeichenEntferntEvent nach erfolgreichem Löschen.
 */
@Injectable()
export class EntferneZeichenHandler extends TransactionalCommandHandler<EntferneZeichenCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischeZeichenRepository: ITaktischesZeichenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: EntferneZeichenCommand, tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
    // 1. Zeichen laden um Existenz zu prüfen
    const findResult = await this.taktischeZeichenRepository.findById(command.zeichenId);
    if (findResult.isFailure || !findResult.value) {
      return Result.fail<void>(findResult.error ?? 'ZEICHEN_NOT_FOUND');
    }

    const zeichen = findResult.value;

    // 2. Verknüpfte Zeichen (Einheit/Fahrzeug) nur deplatzieren statt löschen
    if (zeichen.referenzTyp && zeichen.istPlatziert) {
      const entferneResult = zeichen.entferneVonKarte();
      if (entferneResult.isFailure) {
        return Result.fail<void>(entferneResult.error ?? 'ZEICHEN_DEPLATZIEREN_FAILED');
      }

      const saveResult = await this.taktischeZeichenRepository.save(zeichen, tx);
      if (saveResult.isFailure) {
        return Result.fail<void>(saveResult.error ?? 'ZEICHEN_SAVE_FAILED');
      }

      this.logger.log(`Verknüpftes Zeichen von Karte entfernt (id: ${command.zeichenId}, referenzTyp: ${zeichen.referenzTyp}, referenzId: ${zeichen.referenzId})`, 'EntferneZeichenHandler');

      const events = zeichen.getDomainEvents();
      zeichen.clearDomainEvents();
      return { result: undefined, events };
    }

    // 3. Nicht-verknüpfte Zeichen komplett löschen
    const deleteResult = await this.taktischeZeichenRepository.delete(command.zeichenId, tx);
    if (deleteResult.isFailure) {
      return Result.fail<void>(deleteResult.error ?? 'ZEICHEN_DELETE_FAILED');
    }

    this.logger.log(`Taktisches Zeichen gelöscht (id: ${command.zeichenId}, einsatzId: ${command.einsatzId}, entferntVon: ${command.entferntVon})`, 'EntferneZeichenHandler');

    // 4. ZeichenEntferntEvent erzeugen
    const events: DomainEvent[] = [new ZeichenEntferntEvent(zeichen.id.value, zeichen.einsatzId, zeichen.id.value)];

    return { result: undefined, events };
  }
}
