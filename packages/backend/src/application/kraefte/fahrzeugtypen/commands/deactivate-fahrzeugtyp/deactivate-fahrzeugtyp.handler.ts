import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { FahrzeugtypDto } from '../../dto/fahrzeugtyp.dto';
import { FahrzeugtypQueryMapper } from '../../queries/fahrzeugtyp-query.mapper';
import { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError } from '@domain/kraefte/common/fahrzeugtyp-error-codes';
import type { DeactivateFahrzeugtypCommand } from './deactivate-fahrzeugtyp.command';

/**
 * Handler für DeactivateFahrzeugtypCommand.
 *
 * Deaktiviert einen Fahrzeugtyp (Soft-Delete Pattern).
 * Deaktivierte Fahrzeugtypen sind nicht mehr in Dropdowns verfügbar.
 *
 * **Idempotenz (Task 8):**
 * Bereits deaktiviert → spezifischer Fehler ALREADY_DEACTIVATED.
 * Verhindert doppelte Updates und gibt klares Feedback an den Client.
 */
@Injectable()
export class DeactivateFahrzeugtypHandler extends TransactionalCommandHandler<DeactivateFahrzeugtypCommand, FahrzeugtypDto> {
  protected readonly logger = new Logger(DeactivateFahrzeugtypHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly repository: IFahrzeugtypRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   */
  protected async executeInTransaction(command: DeactivateFahrzeugtypCommand, tx: TransactionContext): Promise<Result<{ result: FahrzeugtypDto; events: DomainEvent[] }>> {
    // 1. Validate ID format
    const idResult = FahrzeugtypId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('FahrzeugtypId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const fahrzeugtypId = idResult.value;
    if (!fahrzeugtypId) {
      this.logger.error('FahrzeugtypId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing Fahrzeugtyp
    const existingResult = await this.repository.findById(fahrzeugtypId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(FahrzeugtypError.format(FAHRZEUGTYP_ERROR_CODES.NOT_FOUND, `Fahrzeugtyp mit ID '${command.id}' nicht gefunden`));
    }

    const fahrzeugtyp = existingResult.value;

    // 3. Deactivate Aggregate (Idempotenz: Bereits deaktiviert → spezifischer Fehler)
    const deactivateResult = fahrzeugtyp.deactivate(command.updatedBy);
    if (deactivateResult.isFailure) {
      if (!deactivateResult.error) {
        this.logger.error('Fahrzeugtyp.deactivate returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate deactivation returned failure without error message');
      }
      return Result.fail(deactivateResult.error);
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.repository.save(fahrzeugtyp, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 5. Extract Domain Events
    const events = fahrzeugtyp.getDomainEvents();
    fahrzeugtyp.clearDomainEvents();

    this.logger.log(`Fahrzeugtyp deactivated: ${fahrzeugtyp.id.value}`);

    // 6. Map to DTO and return
    const dto = FahrzeugtypQueryMapper.toDto(fahrzeugtyp);
    return Result.ok({ result: dto, events });
  }
}
