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
import type { UpdateEinheitCommand } from './update-einheit.command';

/**
 * Handler für UpdateEinheitCommand.
 *
 * Aktualisiert die Details einer bestehenden taktischen Einheit.
 * Delegiert die Validierung an einheit.updateDetails() (Domain Layer).
 *
 * **Return:** EinsatzEinheitDto mit aktualisierten Daten
 */
@Injectable()
export class UpdateEinheitHandler extends TransactionalCommandHandler<UpdateEinheitCommand, EinsatzEinheitDto> {
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
   * Aktualisiert eine EinsatzEinheit innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit aus Repository laden
   * 2. einsatzId-Zugehörigkeit prüfen
   * 3. einheit.updateDetails() aufrufen
   * 4. Aggregate speichern
   *
   * @param command - UpdateEinheitCommand
   * @param tx - Transaction Context
   * @returns EinsatzEinheitDto oder Fehler
   */
  protected async executeInTransaction(command: UpdateEinheitCommand, tx: TransactionContext): Promise<Result<EinsatzEinheitDto> | { result: EinsatzEinheitDto; events: DomainEvent[] }> {
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

    // 3. Details aktualisieren (Domain Validation)
    const updateResult = einheit.updateDetails({
      name: command.name,
      typ: command.typ as 'TRUPP' | 'STAFFEL' | 'GRUPPE' | 'ZUG' | 'ABSCHNITT' | undefined,
      funktion: command.funktion,
      sollStaerke: command.sollStaerke,
      auftrag: command.auftrag,
      einsatzort: command.einsatzort,
      updatedBy: command.updatedBy,
    });
    if (updateResult.isFailure) {
      return Result.fail(updateResult.error ?? 'Fehler beim Aktualisieren der Einheit');
    }

    // 4. Aggregate speichern
    // HINWEIS: parentId-Änderung nur über den dedizierten /parent Endpoint
    // (MoveEinheitHandler mit Circular-Hierarchy-Check)
    const saveResult = await this.einsatzEinheitRepository.save(einheit, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Einheit');
    }

    this.logger.log(`EinsatzEinheit aktualisiert: ${einheit.id.value} (${einheit.name})`);

    const dto = mapEinheitToDto(einheit);
    return { result: dto, events: [] };
  }
}
