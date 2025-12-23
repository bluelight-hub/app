import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../../queries/qualifikation-query.mapper';
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '@domain/kraefte/common/error-codes';
import type { DeactivateQualifikationCommand } from './deactivate-qualifikation.command';

/**
 * Handler für DeactivateQualifikationCommand.
 *
 * Deaktiviert eine Qualifikation (Soft-Delete Pattern).
 * Deaktivierte Qualifikationen sind nicht mehr in Dropdowns verfügbar.
 */
@Injectable()
export class DeactivateQualifikationHandler extends TransactionalCommandHandler<DeactivateQualifikationCommand, QualifikationDto> {
  protected readonly logger = new Logger(DeactivateQualifikationHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   */
  protected async executeInTransaction(command: DeactivateQualifikationCommand, tx: TransactionContext): Promise<Result<QualifikationDto> | { result: QualifikationDto; events: DomainEvent[] }> {
    // 1. Validate ID format
    const idResult = QualifikationId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('QualifikationId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const qualifikationId = idResult.value;
    if (!qualifikationId) {
      this.logger.error('QualifikationId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing Qualifikation
    const existingResult = await this.repository.findById(qualifikationId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(QualifikationError.format(QUALIFIKATION_ERROR_CODES.NOT_FOUND, `Qualifikation mit ID '${command.id}' nicht gefunden`));
    }

    const qualifikation = existingResult.value;

    // 3. Deactivate Aggregate
    const deactivateResult = qualifikation.deactivate(command.updatedBy);
    if (deactivateResult.isFailure) {
      if (!deactivateResult.error) {
        this.logger.error('Qualifikation.deactivate returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate deactivation returned failure without error message');
      }
      return Result.fail(deactivateResult.error);
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.repository.save(qualifikation, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 5. Extract Domain Events
    const events = qualifikation.getDomainEvents();
    qualifikation.clearDomainEvents();

    this.logger.log(`Qualifikation deactivated: ${qualifikation.id.value}`);

    // 6. Map to DTO and return
    const dto = QualifikationQueryMapper.toDto(qualifikation);
    return { result: dto, events };
  }
}
