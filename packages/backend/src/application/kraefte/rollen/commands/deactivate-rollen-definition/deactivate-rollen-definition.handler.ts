import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { RollenDefinitionDto } from '@application/kraefte/rollen';
import { RollenDefinitionQueryMapper } from '@application/kraefte/rollen';
import { ROLLE_ERROR_CODES, RolleError } from '@domain/kraefte/common/rolle-error-codes';
import type { DeactivateRollenDefinitionCommand } from '@application/kraefte/rollen';

/**
 * Handler für DeactivateRollenDefinitionCommand.
 *
 * Deaktiviert eine RollenDefinition (Soft-Delete Pattern).
 * Deaktivierte Rollen sind nicht mehr in Dropdowns verfügbar.
 */
@Injectable()
export class DeactivateRollenDefinitionHandler extends TransactionalCommandHandler<DeactivateRollenDefinitionCommand, RollenDefinitionDto> {
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
   */
  protected async executeInTransaction(
    command: DeactivateRollenDefinitionCommand,
    tx: TransactionContext,
  ): Promise<Result<RollenDefinitionDto> | { result: RollenDefinitionDto; events: DomainEvent[] }> {
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

    // 3. Deactivate Aggregate
    const deactivateResult = rollenDefinition.deactivate(command.deactivatedBy);
    if (deactivateResult.isFailure) {
      if (!deactivateResult.error) {
        this.logger.error('RollenDefinition.deactivate returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate deactivation returned failure without error message');
      }
      return Result.fail(deactivateResult.error);
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.repository.save(rollenDefinition, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 5. Extract Domain Events
    const events = rollenDefinition.getDomainEvents();
    rollenDefinition.clearDomainEvents();

    this.logger.log(`RollenDefinition deactivated: ${rollenDefinition.id.value}`);

    // 6. Map to DTO and return
    const dto = RollenDefinitionQueryMapper.toDto(rollenDefinition);
    return { result: dto, events };
  }
}
