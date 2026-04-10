import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from '../../di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { ErstelleZeichenCommand } from './erstelle-zeichen.command';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';

/**
 * Handler zum Erstellen eines neuen taktischen Zeichens.
 * Nutzt TransactionalCommandHandler für atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class ErstelleZeichenHandler extends TransactionalCommandHandler<ErstelleZeichenCommand, TaktischesZeichenResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischeZeichenRepository: ITaktischesZeichenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: ErstelleZeichenCommand,
    tx: TransactionContext,
  ): Promise<Result<TaktischesZeichenResponseDto> | { result: TaktischesZeichenResponseDto; events: DomainEvent[] }> {
    // 1. ZeichenDefinition Value Object erstellen
    const definitionResult = ZeichenDefinition.create(command.zeichenDefinition);
    if (definitionResult.isFailure || !definitionResult.value) {
      return Result.fail<TaktischesZeichenResponseDto>(definitionResult.error ?? 'GRUNDZEICHEN_REQUIRED');
    }

    // 2. Aggregate erstellen
    const zeichenResult = TaktischesZeichen.create({
      einsatzId: command.einsatzId,
      zeichenDefinition: definitionResult.value,
      label: command.label,
      notiz: command.notiz,
      referenzTyp: command.referenzTyp,
      referenzId: command.referenzId,
      istAusKatalog: command.istAusKatalog,
      katalogEintragId: command.katalogEintragId,
      createdBy: command.erstelltVon,
    });

    if (zeichenResult.isFailure || !zeichenResult.value) {
      return Result.fail<TaktischesZeichenResponseDto>(zeichenResult.error ?? 'ZEICHEN_CREATION_FAILED');
    }

    const zeichen = zeichenResult.value;

    // 3. Persistieren
    const saveResult = await this.taktischeZeichenRepository.save(zeichen, tx);
    if (saveResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto>(saveResult.error ?? 'ZEICHEN_SAVE_FAILED');
    }

    this.logger.log(`Taktisches Zeichen erstellt (id: ${zeichen.id.value}, einsatzId: ${zeichen.einsatzId}, grundzeichen: "${zeichen.zeichenDefinition.grundzeichen}")`, 'ErstelleZeichenHandler');

    // 4. Events sammeln
    const events = zeichen.getDomainEvents();
    zeichen.clearDomainEvents();

    // 5. Response erstellen
    const responseDto = this.responseFactory.create(zeichen);

    return { result: responseDto, events };
  }
}
