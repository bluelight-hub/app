import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { BEFEHL_ERROR_CODES } from '@/application/befehl/errors/befehl-error.codes';
import { AddBefehlKommentarCommand } from './add-befehl-kommentar.command';

/**
 * Handler für AddBefehlKommentarCommand mit Transactional Outbox Pattern.
 *
 * Erweitert TransactionalCommandHandler für atomare Persistierung von
 * Kommentar-Hinzufügung und Domain Events in einer Datenbank-Transaktion.
 *
 * **Transactional Flow:**
 * 1. Validiert BefehlId, AuthorId-Formate
 * 2. Lädt Befehl Aggregate aus Repository
 * 3. Führt Domain Logic aus (addKommentar)
 * 4. Speichert Aggregate in Transaction (via Repository)
 * 5. Base Handler speichert Events in Outbox (atomar in gleicher TX)
 */
@Injectable()
export class AddBefehlKommentarHandler extends TransactionalCommandHandler<AddBefehlKommentarCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(BEFEHL_REPOSITORY)
    private readonly befehlRepository: IBefehlRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: AddBefehlKommentarCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. Validate BefehlId
    const befehlIdResult = BefehlId.create(command.befehlId);
    if (befehlIdResult.isFailure) {
      return Result.fail(befehlIdResult.error ?? 'Ungültige Befehl-ID');
    }
    const befehlId = befehlIdResult.value as BefehlId;

    // 2. Validate AuthorId
    const authorIdResult = UserId.create(command.authorId);
    if (authorIdResult.isFailure) {
      return Result.fail(authorIdResult.error ?? 'Ungültige Author-ID');
    }
    const authorId = authorIdResult.value as UserId;

    // 3. Load Befehl from Repository
    const findResult = await this.befehlRepository.findById(befehlId, tx);
    if (findResult.isFailure) {
      return Result.fail(findResult.error ?? 'Fehler beim Laden des Befehls');
    }
    const befehl = findResult.value as Befehl | null;
    if (!befehl) {
      return Result.fail(BEFEHL_ERROR_CODES.NOT_FOUND);
    }

    // 4. Execute Domain Logic
    const kommentarResult = befehl.addKommentar(authorId, command.text, command.isRueckfrage, command.parentId);
    if (kommentarResult.isFailure) {
      return Result.fail(kommentarResult.error ?? 'Kommentar konnte nicht hinzugefügt werden');
    }

    // 5. Save Aggregate in Transaction
    const saveResult = await this.befehlRepository.save(befehl, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Speichern fehlgeschlagen');
    }

    // 6. Extract Domain Events für Outbox
    const events = befehl.getDomainEvents();

    return { result: befehl.id.value, events };
  }
}
