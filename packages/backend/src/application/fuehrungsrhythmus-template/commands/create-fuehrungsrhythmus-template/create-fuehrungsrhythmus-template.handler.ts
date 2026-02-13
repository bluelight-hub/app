import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { FuehrungsrhythmusTemplateResponseFactory } from '../../dto/fuehrungsrhythmus-template-response.factory';
import type { CreateFuehrungsrhythmusTemplateCommand } from './create-fuehrungsrhythmus-template.command';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';
import type { FuehrungsrhythmusTemplateResponseDto } from '../../dto/fuehrungsrhythmus-template-response.dto';

/**
 * Handler zum Erstellen eines neuen Fuehrungsrhythmus-Templates.
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class CreateFuehrungsrhythmusTemplateHandler extends TransactionalCommandHandler<CreateFuehrungsrhythmusTemplateCommand, FuehrungsrhythmusTemplateResponseDto> {
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
    command: CreateFuehrungsrhythmusTemplateCommand,
    _tx: TransactionContext,
  ): Promise<Result<FuehrungsrhythmusTemplateResponseDto> | { result: FuehrungsrhythmusTemplateResponseDto; events: DomainEvent[] }> {
    // 1. Value Objects erstellen
    const userIdResult = UserId.create(command.createdBy);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(userIdResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATED_BY_REQUIRED);
    }

    // 2. FuehrungsrhythmusEintrag Value Objects erstellen
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

    // Scope bestimmen (default GLOBAL)
    const scope = command.scope === 'EINSATZ' ? FuehrungsrhythmusTemplateScope.EINSATZ : FuehrungsrhythmusTemplateScope.GLOBAL;

    // EinsatzId parsen (optional)
    let einsatzId: EinsatzId | undefined;
    if (command.einsatzId) {
      const einsatzIdResult = EinsatzId.create(command.einsatzId);
      if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
        return Result.fail<FuehrungsrhythmusTemplateResponseDto>(einsatzIdResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
      }
      einsatzId = einsatzIdResult.value;
    }

    // 3. Aggregate erstellen
    const templateResult = FuehrungsrhythmusTemplate.create({
      name: command.name,
      beschreibung: command.beschreibung,
      eintraege,
      createdBy: userIdResult.value,
      scope,
      einsatzId,
    });

    if (templateResult.isFailure || !templateResult.value) {
      return Result.fail<FuehrungsrhythmusTemplateResponseDto>(templateResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATION_FAILED);
    }

    const template = templateResult.value;

    // 4. Persistieren
    await this.templateRepository.save(template);

    this.logger.log(
      `FuehrungsrhythmusTemplate erstellt (id: ${template.id.toString()}, name: "${template.name.value}", eintraege: ${template.eintraege.length})`,
      'CreateFuehrungsrhythmusTemplateHandler',
    );

    // 5. Events sammeln
    const events = template.getDomainEvents();
    template.clearDomainEvents();

    // 6. Response erstellen
    const responseDto = this.responseFactory.create(template);

    return {
      result: responseDto,
      events,
    };
  }
}
