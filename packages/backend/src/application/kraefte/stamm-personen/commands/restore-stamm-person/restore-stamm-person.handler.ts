import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { StammPersonId } from '@domain/kraefte/value-objects/stamm-person-id';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { StammPersonDto } from '../../dto';
import { StammPersonQueryMapper } from '../../queries/stamm-person-query.mapper';
import { STAMM_PERSON_ERROR_CODES, StammPersonError } from '@domain/kraefte/common/stamm-person-error-codes';
import type { RestoreStammPersonCommand } from './restore-stamm-person.command';

/**
 * Handler für RestoreStammPersonCommand.
 *
 * Reaktiviert eine archivierte Stamm-Person.
 * Entfernt archivedAt/archivedBy Felder und macht Person wieder verfügbar.
 *
 * **AC8: Reaktivierung archivierter Personen:**
 * - Prüft ob Person archiviert ist (Result.fail(NOT_ARCHIVED) wenn nicht archiviert)
 * - Entfernt archivedAt/archivedBy Felder
 * - Setzt updatedBy auf restoredBy
 * - Person wird wieder in Dropdowns angezeigt
 *
 * **Idempotenz:**
 * Nicht archiviert → spezifischer Fehler NOT_ARCHIVED.
 * Verhindert doppelte Updates und gibt klares Feedback an den Client.
 *
 * **Response DTO Mapping:**
 * - StammPersonDto benötigt QualifikationDto[] (nested relation)
 * - Handler lädt Qualifikationen aus DB für Response-Mapping
 */
@Injectable()
export class RestoreStammPersonHandler extends TransactionalCommandHandler<RestoreStammPersonCommand, StammPersonDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **AC8: Reaktivierung archivierter Personen:**
   * - Aggregate.restore() prüft ob Person archiviert ist
   * - Result.fail(NOT_ARCHIVED) wenn Person nicht archiviert ist
   * - Entfernt archivedAt/archivedBy Felder wenn archiviert
   * - Emittiert StammPersonUpdatedEvent mit archived=false
   */
  protected async executeInTransaction(command: RestoreStammPersonCommand, tx: TransactionContext): Promise<Result<StammPersonDto> | { result: StammPersonDto; events: DomainEvent[] }> {
    // 1. Validate ID format
    const idResult = StammPersonId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('StammPersonId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const stammPersonId = idResult.value;
    if (!stammPersonId) {
      this.logger.error('StammPersonId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing StammPerson (inkl. archivierte)
    const existingResult = await this.stammPersonRepository.findById(stammPersonId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('StammPersonRepository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(StammPersonError.format(STAMM_PERSON_ERROR_CODES.NOT_FOUND, `StammPerson mit ID '${command.id}' nicht gefunden`));
    }

    const stammPerson = existingResult.value;

    // 3. Restore Aggregate (Idempotenz: Nicht archiviert → spezifischer Fehler)
    const restoreResult = stammPerson.restore(command.restoredBy);
    if (restoreResult.isFailure) {
      if (!restoreResult.error) {
        this.logger.error('StammPerson.restore returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate restore returned failure without error message');
      }
      return Result.fail(restoreResult.error);
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.stammPersonRepository.save(stammPerson, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('StammPersonRepository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 5. Extract Domain Events
    const events = stammPerson.getDomainEvents();
    stammPerson.clearDomainEvents();

    this.logger.log(`StammPerson restored: ${stammPerson.id.value} (${stammPerson.vorname} ${stammPerson.nachname})`);

    // 6. Load Qualifikationen for DTO Mapping (nested relation)
    const qualifikationen: import('@domain/kraefte/aggregates/qualifikation.aggregate').Qualifikation[] = [];
    const currentQualifikationIds = stammPerson.qualifikationIds
      .map((id) => QualifikationId.create(id))
      .filter((r) => r.isSuccess && r.value)
      .map((r) => r.value!);

    for (const id of currentQualifikationIds) {
      const qualifikationResult = await this.qualifikationRepository.findById(id, tx);
      if (qualifikationResult.isSuccess && qualifikationResult.value) {
        qualifikationen.push(qualifikationResult.value);
      }
    }

    // 7. Map to DTO and return (inkl. Qualifikationen für nested DTO)
    const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationen);
    return { result: dto, events };
  }
}
