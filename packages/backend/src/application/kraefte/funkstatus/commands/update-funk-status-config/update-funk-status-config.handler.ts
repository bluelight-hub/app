import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import { IFunkStatusConfigRepository } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { FunkStatusConfigDto } from '../../dto/funk-status-config.dto';
import { FUNKSTATUS_ERROR_CODES, FunkStatusError } from '@domain/kraefte/common/error-codes';
import type { UpdateFunkStatusConfigCommand } from './update-funk-status-config.command';

/**
 * Handler für UpdateFunkStatusConfigCommand.
 *
 * Aktualisiert eine bestehende FunkStatusConfig (nur editierbare Codes 7-9).
 *
 * **Config-Only Pattern:**
 * - KEIN CreateHandler - FunkStatusConfig wird NICHT neu erstellt
 * - NUR UpdateHandler für Änderungen an bestehenden Einträgen
 * - Lookup via code (Business Key), nicht ID
 *
 * **Business Rules:**
 * - Nur Status 7-9 sind editierbar (Aggregate prüft `isEditable`)
 * - Status 0-6 sind system-definiert und werfen Error bei Update-Versuch
 * - customLabel überschreibt standardLabel in UI (leerer String → undefined → Fallback)
 *
 * **Result Pattern (AC4):**
 * - Alle Fehler via Result.fail() (NOT_FOUND, CODE_READ_ONLY, Validierung)
 * - KEINE Exceptions für erwartete Business-Fehler
 */
@Injectable()
export class UpdateFunkStatusConfigHandler extends TransactionalCommandHandler<UpdateFunkStatusConfigCommand, FunkStatusConfigDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG)
    private readonly repository: IFunkStatusConfigRepository,
    @Inject(LOGGER)
    protected readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Flow:**
   * 1. Load FunkStatusConfig by code (NOT by ID)
   * 2. Check if exists (NOT_FOUND Error)
   * 3. Call entity.update() - Aggregate validates isEditable + Business Rules
   * 4. Save via repository.update()
   * 5. Extract events
   * 6. Map to DTO
   *
   * **Warum Lookup via code statt ID?**
   * - code ist der Business Key (Admin kennt "Status 7", nicht CUID2)
   * - API-Endpunkt: PATCH /api/admin/kraefte/funkstatus/:code
   * - Mapping von code → ID passiert in Repository
   */
  protected async executeInTransaction(command: UpdateFunkStatusConfigCommand, tx: TransactionContext): Promise<Result<FunkStatusConfigDto> | { result: FunkStatusConfigDto; events: DomainEvent[] }> {
    // 1. Load existing FunkStatusConfig by code
    const existingResult = await this.repository.findByCode(command.code, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findByCode returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }

    if (!existingResult.value) {
      return Result.fail(FunkStatusError.format(FUNKSTATUS_ERROR_CODES.NOT_FOUND, `FunkStatusConfig mit Code '${command.code}' nicht gefunden`));
    }

    const funkStatusConfig = existingResult.value;

    // 2. Update Aggregate (validates isEditable + Business Rules)
    const updateResult = funkStatusConfig.update({
      customLabel: command.props.customLabel,
      farbe: command.props.farbe,
      istAlarmierbar: command.props.istAlarmierbar,
      beschreibung: command.props.beschreibung,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      if (!updateResult.error) {
        this.logger.error('FunkStatusConfig.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate update returned failure without error message');
      }
      return Result.fail(updateResult.error);
    }

    // 3. Save Aggregate in Transaction (via update, nicht save)
    const saveResult = await this.repository.update(funkStatusConfig, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 4. Extract Domain Events
    const events = funkStatusConfig.getDomainEvents();
    funkStatusConfig.clearDomainEvents();

    this.logger.log(`FunkStatusConfig updated: Code ${funkStatusConfig.code}`);

    // 5. Map to DTO and return
    const dto = this.mapToDto(funkStatusConfig);
    return { result: dto, events };
  }

  /**
   * Mappt FunkStatusConfig Aggregate zu FunkStatusConfigDto.
   *
   * **WARUM kein separater Mapper wie QualifikationQueryMapper?**
   * - FunkStatusConfig hat nur einen Handler (Update), keine Queries
   * - Mapping-Logic ist simpel (keine komplexen Transformationen)
   * - Bei Bedarf (z.B. Query Handlers) kann Mapper extrahiert werden
   */
  private mapToDto(aggregate: ReturnType<IFunkStatusConfigRepository['findByCode']> extends Promise<Result<infer T>> ? NonNullable<T> : never): FunkStatusConfigDto {
    return {
      id: aggregate.id.value,
      code: aggregate.code,
      standardLabel: aggregate.standardLabel,
      customLabel: aggregate.customLabel,
      displayLabel: aggregate.displayLabel,
      farbe: aggregate.farbe,
      istAlarmierbar: aggregate.istAlarmierbar,
      beschreibung: aggregate.beschreibung,
      isEditable: aggregate.isEditable,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
    };
  }
}
