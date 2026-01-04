import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { StammPersonId } from '@domain/kraefte/value-objects/stamm-person-id';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { StammPersonDto } from '../../dto';
import { StammPersonQueryMapper } from '../../queries/stamm-person-query.mapper';
import { STAMM_PERSON_ERROR_CODES, StammPersonError } from '@domain/kraefte/common/stamm-person-error-codes';
import type { ArchiveStammPersonCommand } from './archive-stamm-person.command';

/**
 * Handler für ArchiveStammPersonCommand.
 *
 * Archiviert eine Stamm-Person (Soft-Delete Pattern).
 * Archivierte Personen sind nicht mehr in Dropdowns verfügbar.
 *
 * **Idempotenz:**
 * Bereits archiviert → spezifischer Fehler ALREADY_ARCHIVED.
 * Verhindert doppelte Updates und gibt klares Feedback an den Client.
 *
 * **Response DTO Mapping:**
 * - StammPersonDto benötigt QualifikationDto[] (nested relation)
 * - Handler lädt Qualifikationen aus DB für Response-Mapping
 */
@Injectable()
export class ArchiveStammPersonHandler extends TransactionalCommandHandler<ArchiveStammPersonCommand, StammPersonDto> {
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
   */
  protected async executeInTransaction(command: ArchiveStammPersonCommand, tx: TransactionContext): Promise<Result<StammPersonDto> | { result: StammPersonDto; events: DomainEvent[] }> {
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

    // 2. Load existing StammPerson
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

    // 3. Archive Aggregate (Idempotenz: Bereits archiviert → spezifischer Fehler)
    const archiveResult = stammPerson.archive(command.archivedBy);
    if (archiveResult.isFailure) {
      if (!archiveResult.error) {
        this.logger.error('StammPerson.archive returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate archiving returned failure without error message');
      }
      return Result.fail(archiveResult.error);
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

    this.logger.log(`StammPerson archived: ${stammPerson.id.value} (${stammPerson.vorname} ${stammPerson.nachname})`);

    // 6. Load Qualifikationen for DTO Mapping (nested relation)
    const qualifikationen: import('@domain/kraefte/aggregates/qualifikation.aggregate').Qualifikation[] = [];
    const currentQualifikationIds = stammPerson.qualifikationIds
      .map((id) => QualifikationId.create(id))
      .filter((r) => r.isSuccess && r.value)
      // biome-ignore lint/style/noNonNullAssertion: Filtered for isSuccess above, value guaranteed non-null
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
