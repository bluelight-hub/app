import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { Notiz } from '@domain/notiz/entities/notiz.entity';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { UserId } from '@domain/value-objects/user-id';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { NOTIZ_REPOSITORY, KATEGORIE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { NotizResponseFactory } from '../../dto/notiz-response.factory';
import type { CreateNotizCommand } from './create-notiz.command';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';
import type { NotizResponseDto } from '../../dto/notiz-response.dto';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Handler zum Erstellen einer neuen Notiz.
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class CreateNotizHandler extends TransactionalCommandHandler<CreateNotizCommand, NotizResponseDto> {
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

  protected async executeInTransaction(command: CreateNotizCommand, _tx: TransactionContext): Promise<Result<NotizResponseDto> | { result: NotizResponseDto; events: DomainEvent[] }> {
    // 1. Value Objects erstellen
    const userIdResult = UserId.create(command.erstelltVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<NotizResponseDto>(userIdResult.error ?? NOTIZ_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    // 1a. Story 8.2: Validiere kategorieId wenn gesetzt
    if (command.kategorieId) {
      const prismaTx = _tx as Prisma.TransactionClient;
      const kategorie = await prismaTx.kategorie.findUnique({
        where: { id: command.kategorieId },
        select: { id: true, einsatzId: true, geloeschtAm: true },
      });

      if (!kategorie || kategorie.geloeschtAm) {
        return Result.fail<NotizResponseDto>(NOTIZ_ERROR_CODES.KATEGORIE_NOT_FOUND);
      }

      if (kategorie.einsatzId !== command.einsatzId) {
        return Result.fail<NotizResponseDto>(NOTIZ_ERROR_CODES.KATEGORIE_WRONG_EINSATZ);
      }
    }

    // 2. Aggregate erstellen
    const notizResult = Notiz.create({
      einsatzId: command.einsatzId,
      titel: command.titel,
      inhalt: command.inhalt,
      kategorie: command.kategorie,
      kategorieId: command.kategorieId,
      istTeamsichtbar: command.istTeamsichtbar,
      erstelltVon: userIdResult.value,
    });

    if (notizResult.isFailure || !notizResult.value) {
      return Result.fail<NotizResponseDto>(notizResult.error ?? NOTIZ_ERROR_CODES.CREATION_FAILED);
    }

    const notiz = notizResult.value;

    // 3. Persistieren (Transaction Context weitergeben!)
    await this.notizRepository.save(notiz, _tx);

    this.logger.log(`Notiz erstellt (id: ${notiz.id.toString()}, einsatzId: ${notiz.einsatzId}, titel: "${notiz.titel.value}")`, 'CreateNotizHandler');

    // 4. Events sammeln
    const events = notiz.getDomainEvents();
    notiz.clearDomainEvents();

    // 5. Story 8.2: Kategorie-Daten laden wenn kategorieId vorhanden
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

    // 6. Response erstellen
    const responseDto = await this.responseFactory.create(notiz, kategorieData);

    return {
      result: responseDto,
      events,
    };
  }
}
