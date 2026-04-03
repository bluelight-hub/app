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
import { PersonVonEinheitEntferntEvent } from '@domain/kraefte/events/person-von-einheit-entfernt.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { RemovePersonFromEinheitCommand } from './remove-person-from-einheit.command';

/**
 * Handler für RemovePersonFromEinheitCommand.
 *
 * Entfernt eine EinsatzPerson von einer taktischen Einheit.
 * Falls die Person Einheitenführer ist, wird der Führerstatus automatisch entfernt.
 * Erstellt das PersonVonEinheitEntferntEvent manuell (Junction-Table-Operation).
 *
 * **Return:** void (kein DTO, nur Seiteneffekt)
 */
@Injectable()
export class RemovePersonFromEinheitHandler extends TransactionalCommandHandler<RemovePersonFromEinheitCommand, void> {
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
   * Entfernt eine Person von einer Einheit innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit laden und einsatzId prüfen
   * 2. Prüfen ob Person der Einheit zugewiesen ist
   * 3. Falls Person Einheitenführer: Führerstatus entfernen
   * 4. Zuordnung entfernen
   * 5. Event manuell erstellen
   *
   * @param command - RemovePersonFromEinheitCommand
   * @param tx - Transaction Context
   * @returns void oder Fehler
   */
  protected async executeInTransaction(command: RemovePersonFromEinheitCommand, tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
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

    // 3. Prüfen ob Person der Einheit zugewiesen ist
    const isAssigned = await this.einsatzEinheitRepository.existsPersonenZuordnung(command.personId, command.einheitId, tx);
    if (!isAssigned) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND, `Person mit ID '${command.personId}' ist dieser Einheit nicht zugewiesen`));
    }

    // 4. Falls Person Einheitenführer: Führerstatus entfernen
    if (einheit.einheitenfuehrerId === command.personId) {
      const fuehrerResult = einheit.setEinheitenfuehrer(null, command.updatedBy);
      if (fuehrerResult.isFailure) {
        return Result.fail(fuehrerResult.error ?? 'Fehler beim Entfernen des Einheitenführers');
      }
      // Einheit speichern (Führerstatus-Änderung)
      const saveResult = await this.einsatzEinheitRepository.save(einheit, tx);
      if (saveResult.isFailure) {
        return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Einheit');
      }
      this.logger.log(`Einheitenführer automatisch entfernt: Einheit ${command.einheitId}, Person ${command.personId}`);
    }

    // 5. Zuordnung entfernen
    const removeResult = await this.einsatzEinheitRepository.removePersonenZuordnung(command.personId, command.einheitId, tx);
    if (removeResult.isFailure) {
      return Result.fail(removeResult.error ?? 'Fehler beim Entfernen der Person');
    }

    // 6. Person laden für Event (Rich Data Pattern)
    const personIdResult = EinsatzPersonId.create(command.personId);
    let personVorname = 'Unbekannt';
    let personNachname = '';
    if (personIdResult.isSuccess && personIdResult.value) {
      const personResult = await this.einsatzPersonRepository.findById(personIdResult.value, tx);
      if (personResult.isSuccess && personResult.value) {
        personVorname = personResult.value.vorname;
        personNachname = personResult.value.nachname;
      }
    }

    // 7. Event manuell erstellen
    const event = new PersonVonEinheitEntferntEvent(command.einsatzId, einheit.id.value, einheit.name, command.personId, personVorname, personNachname, command.updatedBy);

    this.logger.log(`Person ${personVorname} ${personNachname} von Einheit ${einheit.name} entfernt`);

    return { result: undefined, events: [event] };
  }
}
