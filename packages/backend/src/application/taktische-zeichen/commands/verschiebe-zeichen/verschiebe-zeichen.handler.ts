import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from '../../di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { VerschiebeZeichenCommand } from './verschiebe-zeichen.command';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';

/**
 * Handler zum Verschieben eines bereits platzierten taktischen Zeichens.
 */
@Injectable()
export class VerschiebeZeichenHandler extends TransactionalCommandHandler<VerschiebeZeichenCommand, TaktischesZeichenResponseDto> {
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
    command: VerschiebeZeichenCommand,
    tx: TransactionContext,
  ): Promise<Result<TaktischesZeichenResponseDto> | { result: TaktischesZeichenResponseDto; events: DomainEvent[] }> {
    // 1. Zeichen laden
    const findResult = await this.taktischeZeichenRepository.findById(command.zeichenId);
    if (findResult.isFailure || !findResult.value) {
      return Result.fail<TaktischesZeichenResponseDto>(findResult.error ?? 'ZEICHEN_NOT_FOUND');
    }

    const zeichen = findResult.value;

    // 2. Zeichen verschieben
    const verschiebeResult = zeichen.verschiebe(command.lat, command.lng, command.mgrs);
    if (verschiebeResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto>(verschiebeResult.error ?? 'ZEICHEN_VERSCHIEBEN_FAILED');
    }

    // 3. Persistieren
    const saveResult = await this.taktischeZeichenRepository.save(zeichen, tx);
    if (saveResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto>(saveResult.error ?? 'ZEICHEN_SAVE_FAILED');
    }

    this.logger.log(`Taktisches Zeichen verschoben (id: ${zeichen.id.value}, lat: ${command.lat}, lng: ${command.lng})`, 'VerschiebeZeichenHandler');

    // 4. Events sammeln
    const events = zeichen.getDomainEvents();
    zeichen.clearDomainEvents();

    // 5. Response erstellen
    const responseDto = this.responseFactory.create(zeichen);

    return { result: responseDto, events };
  }
}
