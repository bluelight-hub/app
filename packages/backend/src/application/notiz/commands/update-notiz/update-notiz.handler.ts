import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { NOTIZ_REPOSITORY, KATEGORIE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { NotizResponseFactory } from '../../dto/notiz-response.factory';
import type { UpdateNotizCommand } from './update-notiz.command';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';
import type { NotizResponseDto } from '../../dto/notiz-response.dto';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Handler zum Aktualisieren einer Notiz (Story 7.3).
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class UpdateNotizHandler extends TransactionalCommandHandler<UpdateNotizCommand, NotizResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(NOTIZ_REPOSITORY)
    private readonly notizRepository: INotizRepository,
    @Inject(KATEGORIE_REPOSITORY)
    private readonly kategorieRepository: IKategorieRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly responseFactory: NotizResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateNotizCommand, _tx: TransactionContext): Promise<Result<NotizResponseDto> | { result: NotizResponseDto; events: DomainEvent[] }> {
    // 1. NotizId erstellen
    const notizIdResult = NotizId.create(command.notizId);
    if (notizIdResult.isFailure || !notizIdResult.value) {
      return Result.fail<NotizResponseDto>(NOTIZ_ERROR_CODES.NOT_FOUND);
    }

    // 2. Notiz aus Repository laden
    const notiz = await this.notizRepository.findById(notizIdResult.value as NotizId, _tx);
    if (!notiz) {
      return Result.fail<NotizResponseDto>(NOTIZ_ERROR_CODES.NOT_FOUND);
    }

    // 2a. Story 8.2: Validiere kategorieId wenn gesetzt (Cross-Einsatz Validierung)
    if (command.kategorieId) {
      const prismaTx = _tx as Prisma.TransactionClient;
      const kategorie = await prismaTx.kategorie.findUnique({
        where: { id: command.kategorieId },
        select: { id: true, einsatzId: true, geloeschtAm: true },
      });

      if (!kategorie || kategorie.geloeschtAm) {
        return Result.fail<NotizResponseDto>(NOTIZ_ERROR_CODES.KATEGORIE_NOT_FOUND);
      }

      // Prüfe ob Kategorie zum selben Einsatz gehört wie die Notiz
      if (kategorie.einsatzId !== notiz.einsatzId) {
        return Result.fail<NotizResponseDto>(NOTIZ_ERROR_CODES.KATEGORIE_WRONG_EINSATZ);
      }
    }

    // 3. Update durchfuehren (Domain-Validierung in Entity)
    const updateResult = notiz.update({
      titel: command.titel,
      inhalt: command.inhalt,
      kategorie: command.kategorie,
      kategorieId: command.kategorieId,
      istTeamsichtbar: command.istTeamsichtbar,
      aktualisiertVon: command.aktualisiertVon,
    });

    if (updateResult.isFailure) {
      return Result.fail<NotizResponseDto>(updateResult.error ?? NOTIZ_ERROR_CODES.UPDATE_FAILED);
    }

    // 4. Persistieren (Transaction Context weitergeben!)
    await this.notizRepository.save(notiz, _tx);

    this.logger.log(`Notiz aktualisiert (id: ${notiz.id.toString()}, titel: "${notiz.titel.value}")`, 'UpdateNotizHandler');

    // 5. Events sammeln
    const events = notiz.getDomainEvents();
    notiz.clearDomainEvents();

    // 6. Story 8.2: Kategorie-Daten laden wenn kategorieId vorhanden
    let kategorieData: { name: string; farbe: string } | null = null;
    if (notiz.kategorieId) {
      const kategorieIdResult = KategorieId.create(notiz.kategorieId);
      if (kategorieIdResult.isSuccess && kategorieIdResult.value) {
        const kategorie = await this.kategorieRepository.findById(kategorieIdResult.value, _tx);
        if (kategorie) {
          kategorieData = {
            name: kategorie.name.value,
            farbe: kategorie.farbe.value,
          };
        }
      }
    }

    // 7. Response erstellen
    const responseDto = await this.responseFactory.create(notiz, kategorieData);

    return {
      result: responseDto,
      events,
    };
  }
}
