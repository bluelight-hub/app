import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNGSVORLAGE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { ErinnerungsvorlageResponseFactory } from '../../dto/erinnerungsvorlage-response.factory';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../errors/erinnerungsvorlage-error.codes';
import type { ErinnerungsvorlageResponseDto } from '../../dto/erinnerungsvorlage-response.dto';
import type { UpdateErinnerungsvorlageCommand } from './update-erinnerungsvorlage.command';

/**
 * Handler zum Aktualisieren einer Erinnerungsvorlage.
 * Nutzt TransactionalCommandHandler für atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class UpdateErinnerungsvorlageHandler extends TransactionalCommandHandler<UpdateErinnerungsvorlageCommand, ErinnerungsvorlageResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(ERINNERUNGSVORLAGE_REPOSITORY)
    private readonly vorlageRepository: IErinnerungsvorlageRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly responseFactory: ErinnerungsvorlageResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: UpdateErinnerungsvorlageCommand,
    _tx: TransactionContext,
  ): Promise<Result<ErinnerungsvorlageResponseDto> | { result: ErinnerungsvorlageResponseDto; events: DomainEvent[] }> {
    // 1. Vorlage laden
    const vorlageIdResult = ErinnerungsvorlageId.create(command.vorlageId);
    if (vorlageIdResult.isFailure || !vorlageIdResult.value) {
      return Result.fail<ErinnerungsvorlageResponseDto>(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    }

    const vorlage = await this.vorlageRepository.findById(vorlageIdResult.value as ErinnerungsvorlageId);
    if (!vorlage) {
      return Result.fail<ErinnerungsvorlageResponseDto>(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    }

    // 2. Update durchführen (Domain-Validierung in Entity)
    const updateResult = vorlage.update({
      titel: command.titel,
      minuten: command.minuten,
      beschreibung: command.beschreibung,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      return Result.fail<ErinnerungsvorlageResponseDto>(updateResult.error ?? ERINNERUNGSVORLAGE_ERROR_CODES.UPDATE_FAILED);
    }

    // 3. Persistieren
    await this.vorlageRepository.save(vorlage);

    this.logger.log(`Erinnerungsvorlage aktualisiert (id: ${vorlage.id.toString()}, titel: "${vorlage.titel.value}")`, 'UpdateErinnerungsvorlageHandler');

    // 4. Events sammeln
    const events = vorlage.getDomainEvents();
    vorlage.clearDomainEvents();

    // 5. Response erstellen
    const responseDto = this.responseFactory.create(vorlage);

    return {
      result: responseDto,
      events,
    };
  }
}
