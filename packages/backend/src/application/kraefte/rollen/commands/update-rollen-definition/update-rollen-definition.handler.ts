import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-rollen-definition.repository';
// biome-ignore lint/style/useImportType: IRollenDefinitionRepository needed for DI at runtime
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
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
 * - Aggregate.update() handled interne State-Änderungen
 * - Repository.save() persistiert Aggregate (inkl. embedded erforderlicheQualifikationen)
 * - REPLACE Semantik: Aggregate speichert komplettes Array (keine separate Junction Table)
 */
@Injectable()
export class UpdateRollenDefinitionHandler extends TransactionalCommandHandler<UpdateRollenDefinitionCommand, RollenDefinitionDto> {
  protected readonly logger = new Logger(UpdateRollenDefinitionHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly repository: IRollenDefinitionRepository,
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
   * - Wird direkt an Aggregate.update() übergeben
   * - Aggregate verwendet REPLACE Semantik (ersetzt bestehende Qualifikationen)
   * - Repository persistiert embedded JSON-Array atomar
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

    // 6. Extract Domain Events
    const events = rollenDefinition.getDomainEvents();
    rollenDefinition.clearDomainEvents();

    this.logger.log(`RollenDefinition updated: ${rollenDefinition.id.value}`);

    // 7. Map to DTO and return
    const dto = RollenDefinitionQueryMapper.toDto(rollenDefinition);
    return Result.ok({ result: dto, events });
  }
}
