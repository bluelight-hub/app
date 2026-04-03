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
import { PersonZuEinheitZugewiesenEvent } from '@domain/kraefte/events/person-zu-einheit-zugewiesen.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { AssignPersonToEinheitCommand } from './assign-person-to-einheit.command';

/**
 * Handler für AssignPersonToEinheitCommand.
 *
 * Weist eine EinsatzPerson einer taktischen Einheit zu (M:N Junction Table).
 * Erstellt das PersonZuEinheitZugewiesenEvent manuell, da es sich um eine
 * Junction-Table-Operation handelt (kein Aggregate-Event).
 *
 * **Return:** void (kein DTO, nur Seiteneffekt)
 */
@Injectable()
export class AssignPersonToEinheitHandler extends TransactionalCommandHandler<AssignPersonToEinheitCommand, void> {
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
   * Weist eine Person einer Einheit zu innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit laden und einsatzId prüfen
   * 2. Person-Existenz prüfen
   * 3. Duplikat-Check (bereits zugewiesen?)
   * 4. Zuordnung speichern
   * 5. Event manuell erstellen (Rich Data Pattern)
   *
   * @param command - AssignPersonToEinheitCommand
   * @param tx - Transaction Context
   * @returns void oder Fehler
   */
  protected async executeInTransaction(command: AssignPersonToEinheitCommand, tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
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

    // 3. Person-Existenz prüfen
    const personIdResult = EinsatzPersonId.create(command.personId);
    if (personIdResult.isFailure || !personIdResult.value) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND, `Ungültige Person-ID: ${command.personId}`));
    }

    const personResult = await this.einsatzPersonRepository.findById(personIdResult.value, tx);
    if (personResult.isFailure || !personResult.value) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND, `Person mit ID '${command.personId}' nicht gefunden`));
    }
    const person = personResult.value;

    // 4. Duplikat-Check
    const isAssigned = await this.einsatzEinheitRepository.existsPersonenZuordnung(command.personId, command.einheitId, tx);
    if (isAssigned) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.PERSON_ALREADY_ASSIGNED, `Person '${person.vorname} ${person.nachname}' ist bereits der Einheit zugewiesen`));
    }

    // 5. Zuordnung speichern
    const saveResult = await this.einsatzEinheitRepository.savePersonenZuordnung(command.personId, command.einheitId, command.createdBy, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Zuweisen der Person');
    }

    // 6. Event manuell erstellen (Rich Data Pattern)
    const event = new PersonZuEinheitZugewiesenEvent(command.einsatzId, einheit.id.value, einheit.name, person.id.value, person.vorname, person.nachname, command.createdBy);

    this.logger.log(`Person ${person.vorname} ${person.nachname} der Einheit ${einheit.name} zugewiesen`);

    return { result: undefined, events: [event] };
  }
}
