import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { UserId } from '@domain/value-objects/user-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNGSVORLAGE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { ErinnerungsvorlageResponseFactory } from '@application/erinnerungsvorlage/dto';
import type { CreateErinnerungsvorlageCommand } from './create-erinnerungsvorlage.command';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../errors/erinnerungsvorlage-error.codes';
import type { ErinnerungsvorlageResponseDto } from '@application/erinnerungsvorlage/dto';

/**
 * Handler zum Erstellen einer neuen Erinnerungsvorlage.
 * Nutzt TransactionalCommandHandler für atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class CreateErinnerungsvorlageHandler extends TransactionalCommandHandler<CreateErinnerungsvorlageCommand, ErinnerungsvorlageResponseDto> {
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
    command: CreateErinnerungsvorlageCommand,
    _tx: TransactionContext,
  ): Promise<Result<ErinnerungsvorlageResponseDto> | { result: ErinnerungsvorlageResponseDto; events: DomainEvent[] }> {
    // 1. Value Objects erstellen
    const userIdResult = UserId.create(command.createdBy);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<ErinnerungsvorlageResponseDto>(userIdResult.error ?? ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    }

    // 2. Aggregate erstellen
    const vorlageResult = Erinnerungsvorlage.create({
      titel: command.titel,
      minuten: command.minuten,
      beschreibung: command.beschreibung,
      createdBy: userIdResult.value,
    });

    if (vorlageResult.isFailure || !vorlageResult.value) {
      return Result.fail<ErinnerungsvorlageResponseDto>(vorlageResult.error ?? ERINNERUNGSVORLAGE_ERROR_CODES.CREATION_FAILED);
    }

    const vorlage = vorlageResult.value;

    // 3. Persistieren
    await this.vorlageRepository.save(vorlage);

    this.logger.log(`Erinnerungsvorlage erstellt (id: ${vorlage.id.toString()}, titel: "${vorlage.titel.value}", minuten: ${vorlage.minuten})`, 'CreateErinnerungsvorlageHandler');

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
