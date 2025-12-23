import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IStammFahrzeugRepository needed for DI at runtime
import { IStammFahrzeugRepository } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { StammFahrzeugId } from '@domain/kraefte/value-objects/stamm-fahrzeug-id';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { StammFahrzeugDto } from '../../dto';
import { StammFahrzeugQueryMapper } from '../../queries/stamm-fahrzeug-query.mapper';
import { STAMM_FAHRZEUG_ERROR_CODES, StammFahrzeugError } from '@domain/kraefte/common/stamm-fahrzeug-error-codes';
import type { ArchiveStammFahrzeugCommand } from './archive-stamm-fahrzeug.command';

/**
 * Handler für ArchiveStammFahrzeugCommand.
 *
 * Archiviert ein Stamm-Fahrzeug (Soft-Delete Pattern).
 * Archivierte Fahrzeuge sind nicht mehr in Dropdowns verfügbar.
 *
 * **Idempotenz:**
 * Bereits archiviert → spezifischer Fehler ALREADY_ARCHIVED.
 * Verhindert doppelte Updates und gibt klares Feedback an den Client.
 *
 * **Response DTO Mapping:**
 * - StammFahrzeugDto benötigt FahrzeugtypDto (nested relation)
 * - Handler lädt Fahrzeugtyp aus DB für Response-Mapping
 * - Nutzt fahrzeugtypId aus Aggregate (IMMUTABLE, daher konsistent)
 */
@Injectable()
export class ArchiveStammFahrzeugHandler extends TransactionalCommandHandler<ArchiveStammFahrzeugCommand, StammFahrzeugDto> {
  protected readonly logger = new Logger(ArchiveStammFahrzeugHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG)
    private readonly stammFahrzeugRepository: IStammFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   */
  protected async executeInTransaction(command: ArchiveStammFahrzeugCommand, tx: TransactionContext): Promise<Result<StammFahrzeugDto> | { result: StammFahrzeugDto; events: DomainEvent[] }> {
    // 1. Validate ID format
    const idResult = StammFahrzeugId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('StammFahrzeugId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const stammFahrzeugId = idResult.value;
    if (!stammFahrzeugId) {
      this.logger.error('StammFahrzeugId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing StammFahrzeug
    const existingResult = await this.stammFahrzeugRepository.findById(stammFahrzeugId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('StammFahrzeugRepository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(StammFahrzeugError.format(STAMM_FAHRZEUG_ERROR_CODES.NOT_FOUND, `StammFahrzeug mit ID '${command.id}' nicht gefunden`));
    }

    const stammFahrzeug = existingResult.value;

    // 3. Archive Aggregate (Idempotenz: Bereits archiviert → spezifischer Fehler)
    const archiveResult = stammFahrzeug.archive(command.archivedBy);
    if (archiveResult.isFailure) {
      if (!archiveResult.error) {
        this.logger.error('StammFahrzeug.archive returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate archiving returned failure without error message');
      }
      return Result.fail(archiveResult.error);
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.stammFahrzeugRepository.save(stammFahrzeug, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('StammFahrzeugRepository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 5. Extract Domain Events
    const events = stammFahrzeug.getDomainEvents();
    stammFahrzeug.clearDomainEvents();

    this.logger.log(`StammFahrzeug archived: ${stammFahrzeug.id.value}`);

    // 6. Load Fahrzeugtyp for DTO Mapping (fahrzeugtypId ist IMMUTABLE, daher konsistent)
    const fahrzeugtypIdResult = FahrzeugtypId.create(stammFahrzeug.fahrzeugtypId);
    if (fahrzeugtypIdResult.isFailure || !fahrzeugtypIdResult.value) {
      this.logger.error('Invalid fahrzeugtypId in StammFahrzeug aggregate - data corruption?');
      throw new Error('Invalid fahrzeugtypId in aggregate');
    }

    const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypIdResult.value, tx);
    if (fahrzeugtypResult.isFailure || !fahrzeugtypResult.value) {
      // Sollte nicht passieren (Foreign Key Constraint), aber Defense in Depth
      this.logger.error(`Fahrzeugtyp ${stammFahrzeug.fahrzeugtypId} not found for StammFahrzeug ${stammFahrzeug.id.value} - data corruption?`);
      throw new Error('Fahrzeugtyp not found for StammFahrzeug');
    }

    // 7. Map to DTO and return (inkl. Fahrzeugtyp für nested DTO)
    const dto = StammFahrzeugQueryMapper.toDto(stammFahrzeug, fahrzeugtypResult.value);
    return { result: dto, events };
  }
}
