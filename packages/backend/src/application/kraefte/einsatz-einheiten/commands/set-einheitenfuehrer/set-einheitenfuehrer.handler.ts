import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzEinheitDto } from '../../dto';
import { mapEinheitToDto } from '../../einsatz-einheit-mapper';
import type { SetEinheitenfuehrerCommand } from './set-einheitenfuehrer.command';

/**
 * Handler für SetEinheitenfuehrerCommand.
 *
 * Setzt den Einheitenführer einer taktischen Einheit.
 * Prüft ob die referenzierte Person existiert und weist sie automatisch
 * der Einheit zu falls noch nicht geschehen.
 *
 * **Return:** EinsatzEinheitDto mit aktualisiertem Einheitenführer
 */
@Injectable()
export class SetEinheitenfuehrerHandler extends TransactionalCommandHandler<SetEinheitenfuehrerCommand, EinsatzEinheitDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Setzt den Einheitenführer innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit laden und einsatzId prüfen
   * 2. Falls fuehrerId gesetzt: Person-Existenz prüfen
   * 3. Falls Person nicht bereits zugewiesen: automatisch zuweisen
   * 4. einheit.setEinheitenfuehrer() aufrufen
   * 5. Aggregate speichern
   *
   * @param command - SetEinheitenfuehrerCommand
   * @param tx - Transaction Context
   * @returns EinsatzEinheitDto oder Fehler
   */
  protected async executeInTransaction(command: SetEinheitenfuehrerCommand, tx: TransactionContext): Promise<Result<EinsatzEinheitDto> | { result: EinsatzEinheitDto; events: DomainEvent[] }> {
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

    // 3. Falls fuehrerId gesetzt: Person-Existenz prüfen
    if (command.fuehrerId) {
      const personIdResult = EinsatzPersonId.create(command.fuehrerId);
      if (personIdResult.isFailure || !personIdResult.value) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.FUEHRER_NOT_FOUND, `Ungültige Person-ID: ${command.fuehrerId}`));
      }

      const personResult = await this.einsatzPersonRepository.findById(personIdResult.value, tx);
      if (personResult.isFailure || !personResult.value) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.FUEHRER_NOT_FOUND, `Person mit ID '${command.fuehrerId}' nicht gefunden`));
      }

      // 4. Auto-Assign: Falls Person nicht bereits zugewiesen, automatisch zuweisen
      const isAssigned = await this.einsatzEinheitRepository.existsPersonenZuordnung(command.fuehrerId, command.einheitId, tx);
      if (!isAssigned) {
        const assignResult = await this.einsatzEinheitRepository.savePersonenZuordnung(command.fuehrerId, command.einheitId, command.updatedBy, tx);
        if (assignResult.isFailure) {
          return Result.fail(assignResult.error ?? 'Fehler beim automatischen Zuweisen der Person');
        }
        this.logger.log(`Person ${command.fuehrerId} automatisch der Einheit ${command.einheitId} zugewiesen (Einheitenführer)`);
      }
    }

    // 5. Einheitenführer setzen (Domain)
    const fuehrerResult = einheit.setEinheitenfuehrer(command.fuehrerId, command.updatedBy);
    if (fuehrerResult.isFailure) {
      return Result.fail(fuehrerResult.error ?? 'Fehler beim Setzen des Einheitenführers');
    }

    // 6. Aggregate speichern
    const saveResult = await this.einsatzEinheitRepository.save(einheit, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Einheit');
    }

    this.logger.log(`Einheitenführer gesetzt: Einheit ${einheit.id.value} → Führer ${command.fuehrerId ?? 'entfernt'}`);

    const dto = mapEinheitToDto(einheit);
    return { result: dto, events: [] };
  }
}
