import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { Erinnerung } from '@domain/entities/erinnerung.entity';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import { FuehrungsrhythmusAktiviertEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-aktiviert.event';
import { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNG_REPOSITORY, FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { ErinnerungResponseFactory } from '@application/erinnerung/dto/erinnerung-response.factory';
import type { ActivateFuehrungsrhythmusTemplateCommand } from './activate-fuehrungsrhythmus-template.command';
import type { ActivateFuehrungsrhythmusTemplateResponseDto } from '../../dto/activate-response.dto';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';

/**
 * Handler zum Aktivieren eines Fuehrungsrhythmus-Templates fuer einen Einsatz.
 *
 * Erstellt fuer jeden Template-Eintrag eine wiederkehrende Erinnerung
 * und persistiert alles atomar via TransactionalCommandHandler.
 */
@Injectable()
export class ActivateFuehrungsrhythmusTemplateHandler extends TransactionalCommandHandler<ActivateFuehrungsrhythmusTemplateCommand, ActivateFuehrungsrhythmusTemplateResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY)
    private readonly templateRepository: IFuehrungsrhythmusTemplateRepository,
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    private readonly erinnerungResponseFactory: ErinnerungResponseFactory,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: ActivateFuehrungsrhythmusTemplateCommand,
    tx: TransactionContext,
  ): Promise<Result<ActivateFuehrungsrhythmusTemplateResponseDto> | { result: ActivateFuehrungsrhythmusTemplateResponseDto; events: DomainEvent[] }> {
    // 1. Template-ID validieren
    const templateIdResult = FuehrungsrhythmusTemplateId.create(command.templateId);
    if (templateIdResult.isFailure || !templateIdResult.value) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(templateIdResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }

    // 2. Template laden
    const template = await this.templateRepository.findById(templateIdResult.value, tx);

    // 3. Pruefen: Template nicht gefunden
    if (!template) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND);
    }

    // 4. Pruefen: Template bereits geloescht
    if (template.isDeleted) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);
    }

    // 4a. Scope-Validierung: EINSATZ-Templates nur fuer ihren eigenen Einsatz aktivierbar
    if (template.scope === FuehrungsrhythmusTemplateScope.EINSATZ && template.einsatzId?.toString() !== command.einsatzId) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_TEMPLATE_WRONG_EINSATZ);
    }

    // 5. Value Objects erstellen
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(einsatzIdResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    const userIdResult = UserId.create(command.aktiviertVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(userIdResult.error ?? FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTIVIERT_VON_REQUIRED);
    }

    const einsatzId = einsatzIdResult.value;
    const erstelltVon = userIdResult.value;

    // 6. Eintraege nach sortOrder sortieren
    const sortierteEintraege = [...template.eintraege].sort((a, b) => a.sortOrder - b.sortOrder);

    // 7. Fuer jeden Eintrag eine wiederkehrende Erinnerung erstellen
    const erstellteErinnerungen: Erinnerung[] = [];
    const allEvents: DomainEvent[] = [];

    for (const eintrag of sortierteEintraege) {
      // a. faelligAm berechnen
      const offsetMs = eintrag.offsetMinuten * 60_000;
      const faelligAm =
        offsetMs === 0
          ? new Date(Date.now() + 1000) // 1 Sekunde in der Zukunft (Erinnerung.create() prueft faelligAm > now)
          : new Date(Date.now() + offsetMs);

      // b. Erinnerung erstellen
      const erinnerungResult = Erinnerung.create({
        einsatzId,
        titel: eintrag.titel,
        faelligAm,
        erstelltVon,
        isRecurring: true,
        recurringIntervalMinutes: eintrag.intervallMinuten,
      });

      if (erinnerungResult.isFailure || !erinnerungResult.value) {
        return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(erinnerungResult.error ?? 'ERINNERUNG_CREATION_FAILED');
      }

      const erinnerung = erinnerungResult.value;

      // c. Erinnerung persistieren
      const saveResult = await this.erinnerungRepository.save(erinnerung, tx);
      if (saveResult.isFailure) {
        return Result.fail<ActivateFuehrungsrhythmusTemplateResponseDto>(saveResult.error ?? 'ERINNERUNG_SAVE_FAILED');
      }

      // d. Events sammeln
      allEvents.push(...erinnerung.getDomainEvents());
      erinnerung.clearDomainEvents();

      erstellteErinnerungen.push(erinnerung);
    }

    // 8. FuehrungsrhythmusAktiviertEvent erstellen
    const erstellteErinnerungIds: ErinnerungId[] = erstellteErinnerungen.map((e) => e.id);
    const aktiviertEvent = new FuehrungsrhythmusAktiviertEvent(template.id, template.name.value, einsatzId, erstellteErinnerungIds, erstelltVon, template.id.toString());
    allEvents.push(aktiviertEvent);

    this.logger.log(
      `Fuehrungsrhythmus-Template aktiviert (templateId: ${template.id.toString()}, einsatzId: ${einsatzId.toString()}, erinnerungen: ${erstellteErinnerungen.length})`,
      'ActivateFuehrungsrhythmusTemplateHandler',
    );

    // 9. Response DTO bauen
    const erinnerungDtos = await Promise.all(erstellteErinnerungen.map((e) => this.erinnerungResponseFactory.create(e)));

    const responseDto: ActivateFuehrungsrhythmusTemplateResponseDto = {
      templateId: template.id.toString(),
      templateName: template.name.value,
      erstellteErinnerungen: erinnerungDtos,
    };

    return {
      result: responseDto,
      events: allEvents,
    };
  }
}
