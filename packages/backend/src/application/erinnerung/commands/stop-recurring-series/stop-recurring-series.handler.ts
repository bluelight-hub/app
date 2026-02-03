import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService is an Injectable class, not just a type - needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNG_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { StopRecurringSeriesCommand } from './stop-recurring-series.command';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { ErinnerungResponseDto } from '../../dto/erinnerung-response.dto';
// biome-ignore lint/style/useImportType: ErinnerungResponseFactory is an Injectable class, needed for DI
import { ErinnerungResponseFactory } from '../../dto/erinnerung-response.factory';

/**
 * Handler zum Stoppen einer wiederkehrenden Erinnerungs-Serie (Story 6.5).
 *
 * **AC1:** Serie beenden — setzt `isRecurring = false`, keine weiteren Instanzen
 * **AC2:** Optional: Aktuelle Kind-Instanz abbrechen (cancelCurrent=true)
 *
 * @see StopRecurringSeriesCommand - Input Validierung
 * @see Erinnerung.stopRecurringSeries() - Domain Methode
 * @see ErinnerungSerieGestopptEvent - Emittiertes Domain Event
 */
@Injectable()
export class StopRecurringSeriesHandler extends TransactionalCommandHandler<StopRecurringSeriesCommand, ErinnerungResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly erinnerungResponseFactory: ErinnerungResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: StopRecurringSeriesCommand, tx: TransactionContext): Promise<Result<ErinnerungResponseDto> | { result: ErinnerungResponseDto; events: DomainEvent[] }> {
    // 1. Value Objects erstellen
    const erinnerungIdResult = ErinnerungId.create(command.erinnerungId);
    if (erinnerungIdResult.isFailure || !erinnerungIdResult.value) {
      return Result.fail<ErinnerungResponseDto>(erinnerungIdResult.error ?? ERINNERUNG_ERROR_CODES.ID_INVALID);
    }

    // 2. Parent-Erinnerung laden
    const findResult = await this.erinnerungRepository.findById(erinnerungIdResult.value, tx);
    if (findResult.isFailure) {
      this.logger.error(`Failed to load Erinnerung: ${findResult.error}`, 'StopRecurringSeriesHandler');
      return Result.fail<ErinnerungResponseDto>(findResult.error ?? ERINNERUNG_ERROR_CODES.NOT_FOUND);
    }

    const parent = findResult.value;
    if (!parent) {
      this.logger.warn(`Erinnerung not found: ${command.erinnerungId}`, 'StopRecurringSeriesHandler');
      return Result.fail<ErinnerungResponseDto>(ERINNERUNG_ERROR_CODES.NOT_FOUND);
    }

    // 3. Serie stoppen (Business Rules in Entity)
    const stopResult = parent.stopRecurringSeries();
    if (stopResult.isFailure) {
      this.logger.warn(`Stop recurring series failed: ${stopResult.error} (id: ${command.erinnerungId})`, 'StopRecurringSeriesHandler');
      return Result.fail<ErinnerungResponseDto>(stopResult.error ?? ERINNERUNG_ERROR_CODES.NOT_RECURRING);
    }

    // 4. Events sammeln (VOR save)
    const events: DomainEvent[] = [...parent.getDomainEvents()];
    parent.clearDomainEvents();

    // 5. AC2: Optional aktuelle aktive Instanz abbrechen
    if (command.cancelCurrent) {
      let cancelled = false;

      // Fall 1: Aktive Kind-Instanz suchen und abbrechen
      const childResult = await this.erinnerungRepository.findActiveChildByParentId(erinnerungIdResult.value, tx);
      if (childResult.isSuccess && childResult.value) {
        const child = childResult.value;
        const deleteResult = child.delete(parent.erstelltVon);
        if (deleteResult.isSuccess) {
          events.push(...child.getDomainEvents());
          child.clearDomainEvents();
          await this.erinnerungRepository.save(child, tx);
          this.logger.log(`Active child instance cancelled: ${child.id.toString()}`, 'StopRecurringSeriesHandler');
          cancelled = true;
        }
      }

      // Fall 2: Kein aktives Kind gefunden — Parent selbst ist die aktive Instanz
      // (Tritt auf bei der ersten Wiederholung, wenn der Parent noch nicht erledigt wurde)
      if (!cancelled && parent.status.isActive()) {
        const deleteResult = parent.delete(parent.erstelltVon);
        if (deleteResult.isSuccess) {
          events.push(...parent.getDomainEvents());
          parent.clearDomainEvents();
          this.logger.log(`Active parent instance cancelled: ${parent.id.toString()}`, 'StopRecurringSeriesHandler');
        }
      }
    }

    // 6. Parent persistieren
    const saveResult = await this.erinnerungRepository.save(parent, tx);
    if (saveResult.isFailure) {
      this.logger.error(`Failed to save stopped Erinnerung: ${saveResult.error}`, 'StopRecurringSeriesHandler');
      return Result.fail<ErinnerungResponseDto>(saveResult.error ?? ERINNERUNG_ERROR_CODES.SAVE_FAILED);
    }

    this.logger.log(`Recurring series stopped (id: ${parent.id.toString()}, titel: "${parent.titel.value}", instances: ${parent.recurringCurrentCount})`, 'StopRecurringSeriesHandler');

    // 7. Response DTO
    const responseDto = await this.erinnerungResponseFactory.create(parent);

    return {
      result: responseDto,
      events,
    };
  }
}
