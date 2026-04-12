import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, LOGGER, TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { AktualisiereZeichenCommand } from './aktualisiere-zeichen.command';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';

/**
 * Handler zum Aktualisieren eines taktischen Zeichens (Definition, Label, Notiz).
 */
@Injectable()
export class AktualisiereZeichenHandler extends TransactionalCommandHandler<AktualisiereZeichenCommand, TaktischesZeichenResponseDto> {
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
    command: AktualisiereZeichenCommand,
    tx: TransactionContext,
  ): Promise<Result<TaktischesZeichenResponseDto> | { result: TaktischesZeichenResponseDto; events: DomainEvent[] }> {
    // 1. Zeichen laden
    const findResult = await this.taktischeZeichenRepository.findById(command.zeichenId);
    if (findResult.isFailure || !findResult.value) {
      return Result.fail<TaktischesZeichenResponseDto>(findResult.error ?? 'ZEICHEN_NOT_FOUND');
    }

    const zeichen = findResult.value;

    // 2. Neue ZeichenDefinition erstellen wenn vorhanden
    let neueZeichenDefinition: ZeichenDefinition | undefined;
    if (command.zeichenDefinition !== undefined) {
      const definitionResult = ZeichenDefinition.create(command.zeichenDefinition);
      if (definitionResult.isFailure || !definitionResult.value) {
        return Result.fail<TaktischesZeichenResponseDto>(definitionResult.error ?? 'GRUNDZEICHEN_REQUIRED');
      }
      neueZeichenDefinition = definitionResult.value;
    }

    // 3. Zeichen aktualisieren
    const aktualisiereResult = zeichen.aktualisiere({
      zeichenDefinition: neueZeichenDefinition,
      label: command.label,
      notiz: command.notiz,
      updatedBy: command.aktualisiertVon,
    });

    if (aktualisiereResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto>(aktualisiereResult.error ?? 'ZEICHEN_AKTUALISIEREN_FAILED');
    }

    // 4. Persistieren
    const saveResult = await this.taktischeZeichenRepository.save(zeichen, tx);
    if (saveResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto>(saveResult.error ?? 'ZEICHEN_SAVE_FAILED');
    }

    this.logger.log(`Taktisches Zeichen aktualisiert (id: ${zeichen.id.value})`, 'AktualisiereZeichenHandler');

    // 5. Events sammeln (aktualisiere() emittiert kein Event, leere Liste)
    const events = zeichen.getDomainEvents();
    zeichen.clearDomainEvents();

    // 6. Response erstellen
    const responseDto = this.responseFactory.create(zeichen);

    return { result: responseDto, events };
  }
}
