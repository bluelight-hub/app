import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import type { IDefaultZeichenRepository } from '@domain/taktische-zeichen/ports/idefault-zeichen.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, DEFAULT_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { DefaultZeichenResponseDto } from '../../dtos/default-zeichen-response.dto';
import type { SetzeDefaultZeichenCommand } from './setze-default-zeichen.command';

/**
 * Handler zum Setzen eines Default-Zeichens für einen Fahrzeug- oder Einheitentyp.
 *
 * Verwendet TransactionalCommandHandler für konsistente Architektur,
 * produziert aber keine Domain-Events (Admin-Konfiguration, keine Business-Events).
 */
@Injectable()
export class SetzeDefaultZeichenHandler extends TransactionalCommandHandler<SetzeDefaultZeichenCommand, DefaultZeichenResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(DEFAULT_ZEICHEN_REPOSITORY)
    private readonly defaultZeichenRepository: IDefaultZeichenRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: SetzeDefaultZeichenCommand,
    tx: TransactionContext,
  ): Promise<Result<DefaultZeichenResponseDto> | { result: DefaultZeichenResponseDto; events: DomainEvent[] }> {
    // 1. ZeichenDefinition Value Object erstellen (Domain-Validierung)
    const definitionResult = ZeichenDefinition.create(command.zeichenDefinition);
    if (definitionResult.isFailure || !definitionResult.value) {
      return Result.fail(definitionResult.error ?? 'GRUNDZEICHEN_REQUIRED');
    }

    // 2. Upsert je nach Entitätstyp
    const saveResult =
      command.entityTyp === 'fahrzeugtyp'
        ? await this.defaultZeichenRepository.saveFahrzeugtypDefault(command.referenzId, definitionResult.value, tx)
        : await this.defaultZeichenRepository.saveEinheitentypDefault(command.referenzId, definitionResult.value, tx);

    if (saveResult.isFailure || !saveResult.value) {
      return Result.fail(saveResult.error ?? 'DEFAULT_ZEICHEN_SAVE_FAILED');
    }

    // 3. Response DTO erstellen
    const entry = saveResult.value;
    const dto = new DefaultZeichenResponseDto();
    dto.referenzId = entry.referenzId;
    dto.typBezeichnung = entry.typBezeichnung;
    dto.zeichenDefinition = entry.zeichenDefinition.toJson();

    // Keine Domain-Events (Admin-Konfiguration)
    return { result: dto, events: [] };
  }
}
