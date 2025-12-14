import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../../queries/qualifikation-query.mapper';
import type { CreateQualifikationCommand } from './create-qualifikation.command';

/**
 * Handler für CreateQualifikationCommand.
 *
 * Erstellt eine neue Qualifikation mit Uniqueness-Check für Abkürzung.
 * Nutzt TransactionalCommandHandler für atomare Persistierung mit Outbox.
 */
@Injectable()
export class CreateQualifikationHandler extends TransactionalCommandHandler<CreateQualifikationCommand, QualifikationDto> {
  private readonly logger = new Logger(CreateQualifikationHandler.name);

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
   *
   * **Uniqueness Check - UX Optimization:**
   * - Handler prüft Abkürzung VOR Aggregate-Erstellung (early return für bessere UX)
   * - Datenbank hat ZUSÄTZLICH Unique Constraint (P2002 als autoritative Quelle)
   * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
   * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei P2002
   * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
   */
  protected async executeInTransaction(command: CreateQualifikationCommand, tx: TransactionContext): Promise<Result<{ result: QualifikationDto; events: DomainEvent[] }>> {
    // 1. Check Uniqueness: Abkuerzung (UX Optimization, DB Constraint ist autoritative Quelle)
    const existingResult = await this.repository.findByAbkuerzung(command.abkuerzung, tx);
    if (existingResult.isFailure) {
      return Result.fail(existingResult.error ?? 'Fehler bei Uniqueness-Check');
    }
    if (existingResult.value) {
      return Result.fail(`Abkürzung '${command.abkuerzung}' ist bereits vergeben`);
    }

    // 2. Create Aggregate
    const aggregateResult = Qualifikation.create({
      name: command.name,
      abkuerzung: command.abkuerzung,
      kategorie: command.kategorie,
      beschreibung: command.beschreibung,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen der Qualifikation');
    }

    const qualifikation = aggregateResult.value;

    // 3. Save Aggregate in Transaction
    const saveResult = await this.repository.save(qualifikation, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Qualifikation');
    }

    // 4. Extract Domain Events
    const events = qualifikation.getDomainEvents();
    qualifikation.clearDomainEvents();

    this.logger.log(`Qualifikation created: ${qualifikation.id.value} (${qualifikation.abkuerzung})`);

    // 5. Map to DTO and return
    const dto = QualifikationQueryMapper.toDto(qualifikation);
    return Result.ok({ result: dto, events });
  }
}
