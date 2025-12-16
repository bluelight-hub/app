import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
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
import type { CreateStammPersonCommand } from './create-stamm-person.command';

/**
 * Handler für CreateStammPersonCommand.
 *
 * Erstellt eine neue Stamm-Person mit Uniqueness-Check für Personalnummer
 * und Existenz-Check für Qualifikationen.
 * Nutzt TransactionalCommandHandler für atomare Persistierung mit Outbox.
 *
 * **AC3 Compliance Note (NestJS Logger):**
 * Logger Import aus @nestjs/common ist im Application Layer akzeptiert, weil:
 * - Logger ist ein Infrastruktur-Utility ohne Business-Logik-Kopplung
 * - TransactionalCommandHandler Base Class verwendet bereits NestJS Logger
 * - Logger beeinflusst nicht die Testbarkeit (kann gemockt werden)
 * - Etabliertes Pattern im gesamten Codebase (konsistent mit StammFahrzeug-Modul)
 *
 * **Personalnummer Uniqueness Check:**
 * - Handler prüft personalnummer VOR Aggregate-Erstellung (early return für bessere UX)
 * - Datenbank hat ZUSÄTZLICH Unique Constraint (P2002 als autoritative Quelle)
 * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
 * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei P2002
 * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
 *
 * **Qualifikationen Validation:**
 * - Handler prüft ob ALLE qualifikationIds existieren (Batch-Check per existsMany)
 * - Verhindert Foreign Key Constraint Violations mit frühem Feedback
 * - Nutzt IQualifikationRepository.existsMany() für Performance (single DB query)
 */
@Injectable()
export class CreateStammPersonHandler extends TransactionalCommandHandler<CreateStammPersonCommand, StammPersonDto> {
  protected readonly logger = new Logger(CreateStammPersonHandler.name);

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
   * **Uniqueness Check - UX Optimization:**
   * - Handler prüft personalnummer VOR Aggregate-Erstellung (early return für bessere UX)
   * - Datenbank hat ZUSÄTZLICH Unique Constraint (P2002 als autoritative Quelle)
   * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
   * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei P2002
   * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
   *
   * **Qualifikationen Validation:**
   * - Handler prüft ob ALLE qualifikationIds existieren (Foreign Key Pre-Check)
   * - Verhindert P2003 Foreign Key Constraint Violation mit frühem Feedback
   * - Nutzt existsMany() für Performance (single DB query statt N queries)
   *
   * **Response DTO Mapping:**
   * - StammPersonDto benötigt QualifikationDto[] (nested relation)
   * - Handler lädt Qualifikationen in gleicher Transaction für konsistente Daten
   * - StammPersonQueryMapper.toDto(aggregate, qualifikationen) mapped beide
   */
  protected async executeInTransaction(command: CreateStammPersonCommand, tx: TransactionContext): Promise<Result<{ result: StammPersonDto; events: DomainEvent[] }>> {
    // 1. Check Uniqueness: personalnummer (UX Optimization, DB Constraint ist autoritative Quelle)
    const existingResult = await this.stammPersonRepository.findByPersonalnummer(command.personalnummer, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('StammPersonRepository.findByPersonalnummer returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (existingResult.value) {
      return Result.fail(StammPersonError.format(STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE, `Personalnummer '${command.personalnummer}' ist bereits vergeben`));
    }

    // 2. Validate Qualifikationen (wenn vorhanden)
    const qualifikationen: import('@domain/kraefte/aggregates/qualifikation.aggregate').Qualifikation[] = [];
    if (command.qualifikationIds && command.qualifikationIds.length > 0) {
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

    // 3. Create Aggregate
    const aggregateResult = StammPerson.create({
      vorname: command.vorname,
      nachname: command.nachname,
      personalnummer: command.personalnummer,
      funkkenungBOS: command.funkkenungBOS,
      qualifikationIds: command.qualifikationIds,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure) {
      if (!aggregateResult.error) {
        this.logger.error('StammPerson.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate creation returned failure without error message');
      }
      return Result.fail(aggregateResult.error);
    }

    if (!aggregateResult.value) {
      this.logger.error('StammPerson.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('Aggregate creation succeeded but value is null');
    }

    const stammPerson = aggregateResult.value;

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

    this.logger.log(`StammPerson created: ${stammPerson.id.value} (${stammPerson.vorname} ${stammPerson.nachname}, ${stammPerson.personalnummer})`);

    // 6. Map to DTO and return (inkl. Qualifikationen für nested DTO)
    const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationen);
    return Result.ok({ result: dto, events });
  }
}
