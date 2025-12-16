import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { StammPersonDto } from '../../dto';
import { StammPersonQueryMapper } from '../../queries/stamm-person-query.mapper';
import { STAMM_PERSON_ERROR_CODES, StammPersonError } from '@domain/kraefte/common/stamm-person-error-codes';
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '@domain/kraefte/common/error-codes';
import type { UpdateStammPersonCommand } from './update-stamm-person.command';

/**
 * Handler für UpdateStammPersonCommand.
 *
 * Aktualisiert eine bestehende Stamm-Person mit Validierung für:
 * - Archivierungsstatus (AC9: Änderung an archivierten Personen nicht erlaubt)
 * - Qualifikationen-Existenz (wenn qualifikationIds gesetzt)
 *
 * **Personalnummer Immutability:**
 * - personalnummer kann NICHT geändert werden (UpdateStammPersonCommand enthält es nicht)
 * - Aggregate.update() würde Änderungsversuch ablehnen
 * - Bei Personalnummer-Änderung muss neue StammPerson erstellt werden
 *
 * **Qualifikationen-Sync (vollständiger Ersatz):**
 * - qualifikationIds wird komplett ersetzt, nicht gemerged (kein Delta)
 * - Handler prüft Existenz ALLER Qualifikationen VOR save()
 * - M:N Junction Table wird im Repository komplett neu synchronisiert
 *
 * **Response DTO Mapping:**
 * - StammPersonDto benötigt QualifikationDto[] (nested relation)
 * - Handler lädt Qualifikationen aus DB für Response-Mapping
 */
@Injectable()
export class UpdateStammPersonHandler extends TransactionalCommandHandler<UpdateStammPersonCommand, StammPersonDto> {
  protected readonly logger = new Logger(UpdateStammPersonHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
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
   * **AC9: Archivierte Personen dürfen NICHT modifiziert werden:**
   * - Handler prüft isArchived VOR Aggregate.update()
   * - Result.fail(ARCHIVED_PERSON_MODIFICATION) wenn archiviert
   * - Business Rule: Archivierte Daten sind "frozen" (nur restore möglich)
   *
   * **Qualifikationen-Validation (wenn gesetzt):**
   * - Handler prüft ob ALLE qualifikationIds existieren (Batch-Check per existsMany)
   * - Verhindert Foreign Key Constraint Violations mit frühem Feedback
   * - Nutzt IQualifikationRepository.existsMany() für Performance (single DB query)
   *
   * **Response DTO Mapping:**
   * - StammPersonDto benötigt QualifikationDto[] (nested relation)
   * - Handler lädt alle Qualifikationen in gleicher Transaction für konsistente Daten
   * - StammPersonQueryMapper.toDto(aggregate, qualifikationen) mapped beide
   */
  protected async executeInTransaction(command: UpdateStammPersonCommand, tx: TransactionContext): Promise<Result<{ result: StammPersonDto; events: DomainEvent[] }>> {
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

    // 3. AC9: Check if archived (KRITISCH - archivierte Personen dürfen NICHT modifiziert werden)
    if (stammPerson.isArchived) {
      return Result.fail(
        StammPersonError.format(STAMM_PERSON_ERROR_CODES.ARCHIVED_PERSON_MODIFICATION, `StammPerson '${stammPerson.vorname} ${stammPerson.nachname}' ist archiviert und kann nicht bearbeitet werden`),
      );
    }

    // 4. Validate Qualifikationen (wenn gesetzt)
    const qualifikationen: import('@domain/kraefte/aggregates/qualifikation.aggregate').Qualifikation[] = [];
    if (command.qualifikationIds !== undefined) {
      if (command.qualifikationIds.length > 0) {
        // Convert string IDs to QualifikationId Value Objects
        const qualifikationIdResults = command.qualifikationIds.map((id) => QualifikationId.create(id));

        // Check if any ID conversion failed
        for (const result of qualifikationIdResults) {
          if (result.isFailure) {
            if (!result.error) {
              this.logger.error('QualifikationId.create returned isFailure=true but error is null - this is a bug!');
              throw new Error('QualifikationId validation returned failure without error message');
            }
            return Result.fail(result.error);
          }
        }

        const qualifikationIds = qualifikationIdResults.map((r) => r.value!);

        // Batch-Check: Existieren ALLE Qualifikationen?
        const existsResult = await this.qualifikationRepository.existsMany(qualifikationIds, tx);
        if (existsResult.isFailure) {
          if (!existsResult.error) {
            this.logger.error('QualifikationRepository.existsMany returned isFailure=true but error is null - this is a bug!');
            throw new Error('QualifikationRepository.existsMany returned failure without error message');
          }
          return Result.fail(existsResult.error);
        }

        const { allExist, missing } = existsResult.value!;
        if (!allExist) {
          return Result.fail(QualifikationError.format(QUALIFIKATION_ERROR_CODES.NOT_FOUND, `Die folgenden Qualifikationen existieren nicht: ${missing.join(', ')}`));
        }

        // Lade alle Qualifikationen für DTO Mapping (nested relation)
        for (const id of qualifikationIds) {
          const qualifikationResult = await this.qualifikationRepository.findById(id, tx);
          if (qualifikationResult.isFailure) {
            if (!qualifikationResult.error) {
              this.logger.error('QualifikationRepository.findById returned isFailure=true but error is null - this is a bug!');
              throw new Error('QualifikationRepository.findById returned failure without error message');
            }
            return Result.fail(qualifikationResult.error);
          }
          if (!qualifikationResult.value) {
            return Result.fail(QualifikationError.format(QUALIFIKATION_ERROR_CODES.NOT_FOUND, `Qualifikation mit ID '${id.value}' wurde nicht gefunden`));
          }
          qualifikationen.push(qualifikationResult.value);
        }
      }
      // Falls qualifikationIds === [], dann qualifikationen bleibt leeres Array
    } else {
      // qualifikationIds === undefined → nicht ändern, lade aktuelle Qualifikationen
      // Lade aktuelle Qualifikationen aus Aggregate
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
    }

    // 5. Update Aggregate (updatedBy wird automatisch gesetzt)
    const updateResult = stammPerson.update({
      vorname: command.vorname,
      nachname: command.nachname,
      funkkenungBOS: command.funkkenungBOS,
      qualifikationIds: command.qualifikationIds,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      if (!updateResult.error) {
        this.logger.error('StammPerson.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate update returned failure without error message');
      }
      return Result.fail(updateResult.error);
    }

    // 6. Save Aggregate in Transaction
    const saveResult = await this.stammPersonRepository.save(stammPerson, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('StammPersonRepository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 7. Extract Domain Events
    const events = stammPerson.getDomainEvents();
    stammPerson.clearDomainEvents();

    this.logger.log(`StammPerson updated: ${stammPerson.id.value} (${stammPerson.vorname} ${stammPerson.nachname})`);

    // 8. Map to DTO and return (inkl. Qualifikationen für nested DTO)
    const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationen);
    return Result.ok({ result: dto, events });
  }
}
