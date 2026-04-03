import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzEinheitDto } from '../../dto';
import { mapEinheitToDto } from '../../einsatz-einheit-mapper';
import type { ChangeEinheitStatusCommand } from './change-einheit-status.command';

/**
 * Handler für ChangeEinheitStatusCommand.
 *
 * Ändert den Status einer taktischen Einheit. Emittiert EinheitStatusGeaendertEvent
 * und bei AUFGELOEST zusätzlich EinheitAufgeloestEvent.
 *
 * **Return:** EinsatzEinheitDto mit neuem Status
 */
@Injectable()
export class ChangeEinheitStatusHandler extends TransactionalCommandHandler<ChangeEinheitStatusCommand, EinsatzEinheitDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Ändert den Status einer EinsatzEinheit innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit laden
   * 2. einsatzId-Zugehörigkeit prüfen
   * 3. einheit.changeStatus() aufrufen (Domain Events werden emittiert)
   * 4. Aggregate speichern
   * 5. Events extrahieren
   *
   * @param command - ChangeEinheitStatusCommand
   * @param tx - Transaction Context
   * @returns EinsatzEinheitDto oder Fehler
   */
  protected async executeInTransaction(command: ChangeEinheitStatusCommand, tx: TransactionContext): Promise<Result<EinsatzEinheitDto> | { result: EinsatzEinheitDto; events: DomainEvent[] }> {
    // 1. Einheit laden
    const findResult = await this.einsatzEinheitRepository.findById(command.einheitId, tx);
    if (findResult.isFailure) {
      return Result.fail(findResult.error ?? 'Fehler beim Laden der Einheit');
    }
    if (!findResult.value) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, `Einheit mit ID '${command.einheitId}' nicht gefunden`));
    }
    const einheit = findResult.value;

    // 2. einsatzId-Zugehörigkeit prüfen
    if (einheit.einsatzId !== command.einsatzId) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, `Einheit gehört nicht zum angegebenen Einsatz`));
    }

    // 3. Status ändern (Domain Events werden emittiert)
    const statusResult = einheit.changeStatus(command.status, command.updatedBy);
    if (statusResult.isFailure) {
      return Result.fail(statusResult.error ?? 'Fehler beim Ändern des Status');
    }

    // 4. Aggregate speichern
    const saveResult = await this.einsatzEinheitRepository.save(einheit, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Einheit');
    }

    // 5. Events extrahieren
    const events = einheit.getDomainEvents();
    einheit.clearDomainEvents();

    this.logger.log(`EinsatzEinheit Status geändert: ${einheit.id.value} → ${command.status}`);

    const dto = mapEinheitToDto(einheit);
    return { result: dto, events };
  }
}
