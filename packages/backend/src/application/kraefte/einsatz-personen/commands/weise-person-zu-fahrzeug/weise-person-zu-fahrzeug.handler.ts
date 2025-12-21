import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';
import { Result } from '@domain/common/result';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import type { WeisePersonZuFahrzeugZuCommand } from './weise-person-zu-fahrzeug.command';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';

/**
 * Handler zum Zuweisen einer Person zu einem Fahrzeug.
 *
 * Business Rules:
 * - Fahrzeug MUSS im gleichen Einsatz sein wie die Person
 * - Person MUSS existieren
 * - Fahrzeug MUSS existieren
 * - Idempotent: Bereits zugewiesen → Success ohne Event
 */
@Injectable()
export class WeisePersonZuFahrzeugZuHandler extends TransactionalCommandHandler<WeisePersonZuFahrzeugZuCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly personRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * @param command - WeisePersonZuFahrzeugZuCommand mit Person- und Fahrzeug-IDs
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result mit undefined und Domain Events
   */
  protected async executeInTransaction(command: WeisePersonZuFahrzeugZuCommand, tx: TransactionContext): Promise<Result<{ result: undefined; events: DomainEvent[] }>> {
    // 1. Person laden
    const personIdResult = EinsatzPersonId.create(command.personId);
    if (personIdResult.isFailure || !personIdResult.value) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND, `Ungültige Person-ID: ${command.personId}`));
    }

    const personResult = await this.personRepository.findById(personIdResult.value, tx);
    if (personResult.isFailure || !personResult.value) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND, `Person ${command.personId} nicht gefunden`));
    }
    const person = personResult.value;

    // 2. Fahrzeug laden
    const fahrzeugIdResult = EinsatzFahrzeugId.create(command.fahrzeugId);
    if (fahrzeugIdResult.isFailure || !fahrzeugIdResult.value) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND, `Ungültige Fahrzeug-ID: ${command.fahrzeugId}`));
    }

    const fahrzeugResult = await this.fahrzeugRepository.findById(fahrzeugIdResult.value, tx);
    if (fahrzeugResult.isFailure || !fahrzeugResult.value) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND, `Fahrzeug ${command.fahrzeugId} nicht gefunden`));
    }
    const fahrzeug = fahrzeugResult.value;

    // 3. Validierung: Fahrzeug MUSS im gleichen Einsatz sein
    if (fahrzeug.einsatzId !== person.einsatzId) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_IN_SAME_EINSATZ, `Fahrzeug ${command.fahrzeugId} gehört nicht zum Einsatz ${command.einsatzId}`));
    }

    // 4. Person zu Fahrzeug zuweisen (Domain Logic)
    const assignResult = person.assignToFahrzeug(fahrzeug.id.value, fahrzeug.funkrufname, command.updatedBy);

    if (assignResult.isFailure) {
      return Result.fail(assignResult.error ?? 'Fehler beim Zuweisen der Person');
    }

    // 5. Speichern
    const saveResult = await this.personRepository.save(person, tx);
    if (saveResult.isFailure) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED, `Person speichern fehlgeschlagen: ${saveResult.error}`));
    }

    // 6. Events extrahieren (für Outbox)
    const events = person.getDomainEvents();
    person.clearDomainEvents();

    // Logging ohne PII (GDPR)
    this.logger.log(`Person ${person.id.value} zu Fahrzeug ${fahrzeug.id.value} zugewiesen`, 'WeisePersonZuFahrzeugZuHandler');

    return Result.ok({ result: undefined, events });
  }
}
