import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { UserId } from '@domain/value-objects/user-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KATEGORIE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { KategorieResponseFactory } from '../../dto/kategorie-response.factory';
import type { CreateKategorieCommand } from './create-kategorie.command';
import { KATEGORIE_ERROR_CODES } from '../../errors/kategorie-error.codes';
import type { KategorieResponseDto } from '../../dto/kategorie-response.dto';

/**
 * Handler zum Erstellen einer neuen Kategorie.
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class CreateKategorieHandler extends TransactionalCommandHandler<CreateKategorieCommand, KategorieResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KATEGORIE_REPOSITORY)
    private readonly kategorieRepository: IKategorieRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly responseFactory: KategorieResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateKategorieCommand, _tx: TransactionContext): Promise<Result<KategorieResponseDto> | { result: KategorieResponseDto; events: DomainEvent[] }> {
    // 1. Value Objects erstellen
    const userIdResult = UserId.create(command.erstelltVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<KategorieResponseDto>(userIdResult.error ?? KATEGORIE_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    // 2. Duplikat-Check: Name muss unique pro Einsatz sein
    const exists = await this.kategorieRepository.existsByNameAndEinsatzId(command.name, command.einsatzId);
    if (exists) {
      return Result.fail<KategorieResponseDto>(KATEGORIE_ERROR_CODES.NAME_DUPLICATE);
    }

    // 3. Aggregate erstellen
    const kategorieResult = Kategorie.create({
      einsatzId: command.einsatzId,
      name: command.name,
      farbe: command.farbe,
      erstelltVon: userIdResult.value,
    });

    if (kategorieResult.isFailure || !kategorieResult.value) {
      return Result.fail<KategorieResponseDto>(kategorieResult.error ?? KATEGORIE_ERROR_CODES.CREATION_FAILED);
    }

    const kategorie = kategorieResult.value;

    // 4. Persistieren (Transaction Context weitergeben!)
    await this.kategorieRepository.save(kategorie, _tx);

    this.logger.log(`Kategorie erstellt (id: ${kategorie.id.toString()}, einsatzId: ${kategorie.einsatzId}, name: "${kategorie.name.value}")`, 'CreateKategorieHandler');

    // 5. Events sammeln
    const events = kategorie.getDomainEvents();
    kategorie.clearDomainEvents();

    // 6. Response erstellen
    const responseDto = await this.responseFactory.create(kategorie);

    return {
      result: responseDto,
      events,
    };
  }
}
