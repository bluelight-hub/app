import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { RollenDefinition } from '@domain/kraefte/aggregates/rollen-definition.aggregate';
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { RollenDefinitionDto } from '@application/kraefte/rollen';
import { RollenDefinitionQueryMapper } from '@application/kraefte/rollen';
import { ROLLE_ERROR_CODES, RolleError } from '@domain/kraefte/common/rolle-error-codes';
import type { CreateRollenDefinitionCommand } from '@application/kraefte/rollen';

/**
 * Handler für CreateRollenDefinitionCommand.
 *
 * Erstellt eine neue RollenDefinition mit Uniqueness-Check für Name.
 * Nutzt TransactionalCommandHandler für atomare Persistierung mit Outbox.
 *
 * **Qualifikations-Validierung:**
 * - Handler prüft NICHT die Existenz der Qualifikationen (würde N+1 Query Problem verursachen)
 * - Repository saveQualifikationen() wirft bei Foreign Key Violation (nicht existierende Qualifikation)
 * - Handler fängt diese Violation und returned Result.fail() mit User-Friendly Message
 */
@Injectable()
export class CreateRollenDefinitionHandler extends TransactionalCommandHandler<CreateRollenDefinitionCommand, RollenDefinitionDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly repository: IRollenDefinitionRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Uniqueness Check - UX Optimization:**
   * - Handler prüft Name VOR Aggregate-Erstellung (early return für bessere UX)
   * - Datenbank hat ZUSÄTZLICH Unique Constraint als autoritative Quelle
   * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
   * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei Constraint Violation
   * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
   *
   * **Qualifikations-Verknüpfung:**
   * - Aggregate speichert erforderlicheQualifikationen als Embedded JSON-Array
   * - saveQualifikationen() erstellt M:N Junction-Table-Einträge (RolleQualifikation)
   * - Beide Operationen erfolgen in gleicher Transaktion (atomare Konsistenz)
   */
  protected async executeInTransaction(command: CreateRollenDefinitionCommand, tx: TransactionContext): Promise<Result<RollenDefinitionDto> | { result: RollenDefinitionDto; events: DomainEvent[] }> {
    // 1. Check Uniqueness: Name (UX Optimization, DB Constraint ist autoritative Quelle)
    const existingResult = await this.repository.findByName(command.name, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findByName returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (existingResult.value) {
      return Result.fail(RolleError.format(ROLLE_ERROR_CODES.NAME_DUPLICATE, `Name '${command.name}' ist bereits vergeben`));
    }

    // 2. Convert erforderlicheQualifikationen to Aggregate format
    const erforderlicheQualifikationen = (command.erforderlicheQualifikationen ?? []).map((eq) => ({
      qualifikationId: eq.qualifikationId,
      istPflicht: eq.istPflicht,
    }));

    // 3. Create Aggregate
    const aggregateResult = RollenDefinition.create({
      name: command.name,
      funkrufname: command.funkrufname,
      beschreibung: command.beschreibung,
      erforderlicheQualifikationen,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure) {
      if (!aggregateResult.error) {
        this.logger.error('RollenDefinition.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate creation returned failure without error message');
      }
      return Result.fail(aggregateResult.error);
    }

    if (!aggregateResult.value) {
      this.logger.error('RollenDefinition.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('Aggregate creation succeeded but value is null');
    }

    const rollenDefinition = aggregateResult.value;

    // 4. Apply sortOrder if provided (optional Business Rule)
    if (command.sortOrder !== undefined) {
      const updateResult = rollenDefinition.update({
        sortOrder: command.sortOrder,
        updatedBy: command.createdBy,
      });
      if (updateResult.isFailure) {
        if (!updateResult.error) {
          this.logger.error('RollenDefinition.update returned isFailure=true but error is null - this is a bug!');
          throw new Error('Aggregate update returned failure without error message');
        }
        return Result.fail(updateResult.error);
      }
    }

    // 5. Save Aggregate in Transaction
    const saveResult = await this.repository.save(rollenDefinition, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 6. Save Qualifikationen M:N Relations (in same transaction)
    // Extract qualifikationIds from erforderlicheQualifikationen
    const qualifikationIds = erforderlicheQualifikationen.map((eq) => eq.qualifikationId);
    if (qualifikationIds.length > 0) {
      const saveQualifikationenResult = await this.repository.saveQualifikationen(rollenDefinition.id, qualifikationIds, command.createdBy, tx);
      if (saveQualifikationenResult.isFailure) {
        if (!saveQualifikationenResult.error) {
          this.logger.error('Repository.saveQualifikationen returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository saveQualifikationen returned failure without error message');
        }
        return Result.fail(saveQualifikationenResult.error);
      }
    }

    // 7. Extract Domain Events
    const events = rollenDefinition.getDomainEvents();
    rollenDefinition.clearDomainEvents();

    this.logger.log(`RollenDefinition created: ${rollenDefinition.id.value} (${rollenDefinition.name})`);

    // 8. Map to DTO and return
    const dto = RollenDefinitionQueryMapper.toDto(rollenDefinition);
    return { result: dto, events };
  }
}
