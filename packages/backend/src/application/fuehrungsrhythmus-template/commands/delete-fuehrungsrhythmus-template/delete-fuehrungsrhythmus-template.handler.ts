import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { UserId } from '@domain/value-objects/user-id';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { DeleteFuehrungsrhythmusTemplateCommand } from './delete-fuehrungsrhythmus-template.command';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';

/**
 * Handler zum Loeschen eines Fuehrungsrhythmus-Templates (Soft-Delete, Story 6.8).
 */
@Injectable()
export class DeleteFuehrungsrhythmusTemplateHandler extends TransactionalCommandHandler<DeleteFuehrungsrhythmusTemplateCommand, { success: boolean }> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY)
    private readonly templateRepository: IFuehrungsrhythmusTemplateRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: DeleteFuehrungsrhythmusTemplateCommand,
    tx: TransactionContext,
  ): Promise<Result<{ success: boolean }> | { result: { success: boolean }; events: DomainEvent[] }> {
    // 1. Template ID erstellen
    const templateIdResult = FuehrungsrhythmusTemplateId.create(command.templateId);
    if (templateIdResult.isFailure || !templateIdResult.value) {
      return Result.fail<{ success: boolean }>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }

    // 2. Template laden
    const template = await this.templateRepository.findById(templateIdResult.value as FuehrungsrhythmusTemplateId, tx);
    if (!template) {
      return Result.fail<{ success: boolean }>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND);
    }

    if (template.isDeleted) {
      return Result.fail<{ success: boolean }>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);
    }

    // 3. UserId erstellen
    const userIdResult = UserId.create(command.geloeschtVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<{ success: boolean }>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    }

    // 4. Soft-Delete
    const deleteResult = template.softDelete(userIdResult.value);
    if (deleteResult.isFailure) {
      return Result.fail<{ success: boolean }>(deleteResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);
    }

    // 5. Persistieren
    await this.templateRepository.save(template, tx);

    this.logger.log(`FuehrungsrhythmusTemplate geloescht (id: ${template.id.toString()}, name: "${template.name.value}")`, 'DeleteFuehrungsrhythmusTemplateHandler');

    // 6. Events sammeln
    const events = template.getDomainEvents();
    template.clearDomainEvents();

    return {
      result: { success: true },
      events,
    };
  }
}
