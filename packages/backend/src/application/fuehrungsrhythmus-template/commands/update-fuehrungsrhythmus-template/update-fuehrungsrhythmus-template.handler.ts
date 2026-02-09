import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { UserId } from '@domain/value-objects/user-id';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { FuehrungsrhythmusTemplateResponseFactory } from '../../dto/fuehrungsrhythmus-template-response.factory';
import type { UpdateFuehrungsrhythmusTemplateCommand } from './update-fuehrungsrhythmus-template.command';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';
import type { FuehrungsrhythmusTemplateResponseDto } from '../../dto/fuehrungsrhythmus-template-response.dto';

/**
 * Handler zum Aktualisieren eines Fuehrungsrhythmus-Templates (Story 6.8).
 */
@Injectable()
export class UpdateFuehrungsrhythmusTemplateHandler extends TransactionalCommandHandler<UpdateFuehrungsrhythmusTemplateCommand, FuehrungsrhythmusTemplateResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY)
    private readonly templateRepository: IFuehrungsrhythmusTemplateRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly responseFactory: FuehrungsrhythmusTemplateResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: UpdateFuehrungsrhythmusTemplateCommand,
    tx: TransactionContext,
  ): Promise<Result<FuehrungsrhythmusTemplateResponseDto> | { result: FuehrungsrhythmusTemplateResponseDto; events: DomainEvent[] }> {
    // 1. Template ID erstellen
    const templateIdResult = FuehrungsrhythmusTemplateId.create(command.templateId);
    if (templateIdResult.isFailure || !templateIdResult.value) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }

    // 2. Template laden
    const template = await this.templateRepository.findById(templateIdResult.value as FuehrungsrhythmusTemplateId, tx);
    if (!template) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND);
    }

    if (template.isDeleted) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);
    }

    // 3. Eintraege erstellen
    const eintraege: FuehrungsrhythmusEintrag[] = [];
    for (let i = 0; i < command.eintraege.length; i++) {
      const eintragProps = command.eintraege[i]!;
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: eintragProps.titel,
        intervallMinuten: eintragProps.intervallMinuten,
        offsetMinuten: eintragProps.offsetMinuten ?? 0,
        sortOrder: i,
      });
      if (eintragResult.isFailure || !eintragResult.value) {
        return Result.fail<FuehrungsrhythmusTemplateResponseDto>(eintragResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINTRAG_INVALID);
      }
      eintraege.push(eintragResult.value);
    }

    // 4. UserId erstellen
    const userIdResult = UserId.create(command.aktualisiertVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    // 5. Entity aktualisieren
    const updateResult = template.update({
      name: command.name,
      beschreibung: command.beschreibung ?? null,
      eintraege,
      aktualisiertVon: userIdResult.value,
    });
    if (updateResult.isFailure) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(updateResult.error ?? 'UPDATE_FAILED');
    }

    // 6. Persistieren
    await this.templateRepository.save(template, tx);

    this.logger.log(`FuehrungsrhythmusTemplate aktualisiert (id: ${template.id.toString()}, name: "${template.name.value}")`, 'UpdateFuehrungsrhythmusTemplateHandler');

    // 7. Events sammeln
    const events = template.getDomainEvents();
    template.clearDomainEvents();

    // 8. Response erstellen
    const responseDto = this.responseFactory.create(template);

    return {
      result: responseDto,
      events,
    };
  }
}
