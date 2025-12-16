import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-rollen-definition.repository';
// biome-ignore lint/style/useImportType: IRollenDefinitionRepository needed for DI at runtime
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
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
  protected readonly logger = new Logger(UpdateRollenDefinitionHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
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
  protected async executeInTransaction(command: UpdateRollenDefinitionCommand, tx: TransactionContext): Promise<Result<{ result: RollenDefinitionDto; events: DomainEvent[] }>> {
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

    // 3b. Validate qualifikationIds existence (Issue 2 HIGH Fix)
    // Prüfe ob alle neuen Qualifikations-IDs existieren BEVOR Update durchgeführt wird
    // Verhindert FK-Violations in Junction Table und liefert bessere Fehlermeldungen
    if (command.erforderlicheQualifikationen !== undefined && command.erforderlicheQualifikationen.length > 0) {
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

        const existsResult = await this.qualifikationRepository.exists(qualifikationId, tx);
        if (existsResult.isFailure) {
          if (!existsResult.error) {
            this.logger.error('QualifikationRepository.exists returned isFailure=true but error is null - this is a bug!');
            throw new Error('Repository exists check returned failure without error message');
          }
          return Result.fail(existsResult.error);
        }
        if (!existsResult.value) {
          return Result.fail(`Qualifikation mit ID '${qId}' existiert nicht`);
        }
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
    return Result.ok({ result: dto, events });
  }
}
