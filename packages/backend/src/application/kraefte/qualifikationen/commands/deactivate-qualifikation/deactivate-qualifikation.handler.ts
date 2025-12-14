import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../../queries/qualifikation-query.mapper';
import type { DeactivateQualifikationCommand } from './deactivate-qualifikation.command';

/**
 * Handler für DeactivateQualifikationCommand.
 *
 * Deaktiviert eine Qualifikation (Soft-Delete Pattern).
 * Deaktivierte Qualifikationen sind nicht mehr in Dropdowns verfügbar.
 */
@Injectable()
export class DeactivateQualifikationHandler extends TransactionalCommandHandler<DeactivateQualifikationCommand, QualifikationDto> {
  private readonly logger = new Logger(DeactivateQualifikationHandler.name);

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
  protected async executeInTransaction(command: DeactivateQualifikationCommand, tx: TransactionContext): Promise<Result<{ result: QualifikationDto; events: DomainEvent[] }>> {
    // 1. Validate ID format
    const idResult = QualifikationId.create(command.id);
    if (idResult.isFailure) {
      return Result.fail(idResult.error ?? 'Ungültige ID');
    }
    const qualifikationId = idResult.value;
    if (!qualifikationId) {
      return Result.fail('Ungültige ID');
    }

    // 2. Load existing Qualifikation
    const existingResult = await this.repository.findById(qualifikationId, tx);
    if (existingResult.isFailure) {
      return Result.fail(existingResult.error ?? 'Fehler beim Laden der Qualifikation');
    }
    if (!existingResult.value) {
      return Result.fail(`Qualifikation mit ID '${command.id}' nicht gefunden`);
    }

    const qualifikation = existingResult.value;

    // 3. Deactivate Aggregate
    const deactivateResult = qualifikation.deactivate(command.updatedBy);
    if (deactivateResult.isFailure) {
      return Result.fail(deactivateResult.error ?? 'Fehler beim Deaktivieren der Qualifikation');
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.repository.save(qualifikation, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Qualifikation');
    }

    // 5. Extract Domain Events
    const events = qualifikation.getDomainEvents();
    qualifikation.clearDomainEvents();

    this.logger.log(`Qualifikation deactivated: ${qualifikation.id.value}`);

    // 6. Map to DTO and return
    const dto = QualifikationQueryMapper.toDto(qualifikation);
    return Result.ok({ result: dto, events });
  }
}
