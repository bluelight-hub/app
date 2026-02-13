import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { RollenDefinitionDto } from '../../dto/rollen-definition.dto';
import { RollenDefinitionQueryMapper } from '../../queries/rollen-definition-query.mapper';
import { ROLLE_ERROR_CODES, RolleError } from '@domain/kraefte/common/rolle-error-codes';
import type { UpdateRollenDefinitionCommand } from './update-rollen-definition.command';

/**
 * Handler für UpdateRollenDefinitionCommand.
 *
 * Aktualisiert eine bestehende RollenDefinition mit optionalem Uniqueness-Check
 * für geänderten Name. updatedBy wird automatisch gesetzt.
 *
 * **M:N Relationship Update (erforderlicheQualifikationen):**
 * - Aggregate.update() handled interne State-Änderungen (JSON-Array im Aggregate)
 * - Repository.save() persistiert Aggregate (inkl. embedded erforderlicheQualifikationen)
 * - Repository.deleteQualifikationen() + saveQualifikationen() synchronisiert Junction Table
 * - REPLACE Semantik: Bestehende Verknüpfungen werden vollständig ersetzt (nicht gemergt)
 * - Qualifikations-IDs werden vor Update validiert (verhindert FK-Violations)
 */
@Injectable()
export class UpdateRollenDefinitionHandler extends TransactionalCommandHandler<UpdateRollenDefinitionCommand, RollenDefinitionDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly repository: IRollenDefinitionRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Empty-Update Check:**
   * - Aggregate.update() validiert, dass mindestens ein Feld geändert wurde
   * - Vermeidet unnötige DB-Writes bei leeren Updates
   *
   * **erforderlicheQualifikationen Update:**
   * 1. Validiert dass alle Qualifikations-IDs existieren (vor Update)
   * 2. Aggregate.update() aktualisiert internes JSON-Array
   * 3. Repository.save() persistiert Aggregate mit embedded JSON
   * 4. Repository.deleteQualifikationen() löscht bestehende Junction-Einträge
   * 5. Repository.saveQualifikationen() erstellt neue Junction-Einträge
   * 6. REPLACE Semantik: Alte Verknüpfungen werden komplett ersetzt
   */
  protected async executeInTransaction(command: UpdateRollenDefinitionCommand, tx: TransactionContext): Promise<Result<RollenDefinitionDto> | { result: RollenDefinitionDto; events: DomainEvent[] }> {
    // 1. Validate ID format
    const idResult = RolleId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('RolleId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const rolleId = idResult.value;
    if (!rolleId) {
      this.logger.error('RolleId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing RollenDefinition
    const existingResult = await this.repository.findById(rolleId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(RolleError.format(ROLLE_ERROR_CODES.NOT_FOUND, `RollenDefinition mit ID '${command.id}' nicht gefunden`));
    }

    const rollenDefinition = existingResult.value;

    // 3. Check Uniqueness: Name (wenn geändert)
    // HINWEIS: TOCTOU Race Condition akzeptiert (siehe Fahrzeugtyp Pattern)
    // - Pre-Check (findByName) und save() sind nicht atomar
    // - Prisma Unique Constraint (P2002) fängt Race Condition ab
    // - Pre-Check verbessert nur UX (sofortiges Feedback)
    if (command.name && command.name !== rollenDefinition.name) {
      const duplicateResult = await this.repository.findByName(command.name, tx);
      if (duplicateResult.isFailure) {
        if (!duplicateResult.error) {
          this.logger.error('Repository.findByName returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository returned failure without error message');
        }
        return Result.fail(duplicateResult.error);
      }
      if (duplicateResult.value) {
        return Result.fail(RolleError.format(ROLLE_ERROR_CODES.NAME_DUPLICATE, `Name '${command.name}' ist bereits vergeben`));
      }
    }

    // 3b. Validate qualifikationIds existence (N+1 Fix: Batch-Check statt Individual Queries)
    // WICHTIG: Nutze existsMany() für Single DB-Query statt Loop mit einzelnen exists() Calls.
    // Verhindert N+1 Problem: 1 Query statt N Queries für N Qualifikationen.
    if (command.erforderlicheQualifikationen !== undefined && command.erforderlicheQualifikationen.length > 0) {
      // Konvertiere Command-IDs zu QualifikationId Value Objects
      const qualifikationIds: QualifikationId[] = [];
      for (const qualifikation of command.erforderlicheQualifikationen) {
        const qId = qualifikation.qualifikationId;
        const qIdResult = QualifikationId.create(qId);
        if (qIdResult.isFailure) {
          if (!qIdResult.error) {
            this.logger.error('QualifikationId.create returned isFailure=true but error is null - this is a bug!');
            throw new Error('QualifikationId validation returned failure without error message');
          }
          return Result.fail(`Ungültige Qualifikation ID: ${qId} - ${qIdResult.error}`);
        }
        const qualifikationId = qIdResult.value;
        if (!qualifikationId) {
          this.logger.error('QualifikationId.create returned isSuccess=true but value is null - this is a bug!');
          throw new Error('QualifikationId validation succeeded but value is null');
        }
        qualifikationIds.push(qualifikationId);
      }

      // Batch-Check: Single DB-Query prüft alle IDs gleichzeitig
      const existsManyResult = await this.qualifikationRepository.existsMany(qualifikationIds, tx);
      if (existsManyResult.isFailure) {
        if (!existsManyResult.error) {
          this.logger.error('QualifikationRepository.existsMany returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository batch check returned failure without error message');
        }
        return Result.fail(existsManyResult.error);
      }

      // Null-check für TypeScript (Result.value kann undefined sein wenn isSuccess aber value nicht gesetzt)
      if (!existsManyResult.value) {
        this.logger.error('QualifikationRepository.existsMany returned isSuccess=true but value is null - this is a bug!');
        throw new Error('Repository batch check succeeded but value is null');
      }

      // Wenn nicht alle Qualifikationen existieren: Fehler mit fehlenden IDs
      const { allExist, missing } = existsManyResult.value;
      if (!allExist) {
        return Result.fail(`Folgende Qualifikationen existieren nicht: ${missing.join(', ')}`);
      }
    }

    // 4. Update Aggregate (updatedBy wird automatisch gesetzt)
    const updateResult = rollenDefinition.update({
      name: command.name,
      funkrufname: command.funkrufname,
      beschreibung: command.beschreibung,
      istAktiv: command.istAktiv,
      sortOrder: command.sortOrder,
      erforderlicheQualifikationen: command.erforderlicheQualifikationen,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      if (!updateResult.error) {
        this.logger.error('RollenDefinition.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate update returned failure without error message');
      }
      return Result.fail(updateResult.error);
    }

    // 5. Save Aggregate in Transaction
    // WICHTIG: Aggregate speichert erforderlicheQualifikationen als embedded JSON-Array
    // Repository.save() persistiert komplettes Aggregate inkl. Qualifikationen atomar
    const saveResult = await this.repository.save(rollenDefinition, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 5b. Synchronize Junction Table: RolleQualifikation (Issue 1 CRITICAL Fix)
    // REPLACE-Semantik: Bestehende Verknüpfungen werden vollständig ersetzt
    // Nur wenn erforderlicheQualifikationen im Command gesetzt wurde (undefined = nicht ändern)
    if (command.erforderlicheQualifikationen !== undefined) {
      // Schritt 1: Lösche alle bestehenden Qualifikations-Verknüpfungen
      const deleteResult = await this.repository.deleteQualifikationen(rolleId, tx);
      if (deleteResult.isFailure) {
        if (!deleteResult.error) {
          this.logger.error('Repository.deleteQualifikationen returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository deleteQualifikationen returned failure without error message');
        }
        return Result.fail(deleteResult.error);
      }

      // Schritt 2: Erstelle neue Qualifikations-Verknüpfungen (wenn vorhanden)
      if (command.erforderlicheQualifikationen.length > 0) {
        // Extrahiere nur die qualifikationIds aus den ErforderlicheQualifikation Objekten
        const qualifikationIds = command.erforderlicheQualifikationen.map((q) => q.qualifikationId);
        const saveQualifikationenResult = await this.repository.saveQualifikationen(rolleId, qualifikationIds, command.updatedBy, tx);
        if (saveQualifikationenResult.isFailure) {
          if (!saveQualifikationenResult.error) {
            this.logger.error('Repository.saveQualifikationen returned isFailure=true but error is null - this is a bug!');
            throw new Error('Repository saveQualifikationen returned failure without error message');
          }
          return Result.fail(saveQualifikationenResult.error);
        }
      }
    }

    // 6. Extract Domain Events
    const events = rollenDefinition.getDomainEvents();
    rollenDefinition.clearDomainEvents();

    this.logger.log(`RollenDefinition updated: ${rollenDefinition.id.value}`);

    // 7. Map to DTO and return
    const dto = RollenDefinitionQueryMapper.toDto(rollenDefinition);
    return { result: dto, events };
  }
}
