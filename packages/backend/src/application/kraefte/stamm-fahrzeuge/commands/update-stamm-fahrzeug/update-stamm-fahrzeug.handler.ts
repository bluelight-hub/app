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
import type { UpdateStammFahrzeugCommand } from './update-stamm-fahrzeug.command';

/**
 * Handler für UpdateStammFahrzeugCommand.
 *
 * Aktualisiert ein bestehendes Stamm-Fahrzeug mit optionalem Uniqueness-Check
 * für geänderten Funkrufname. updatedBy wird automatisch gesetzt.
 *
 * **Fahrzeugtyp Immutability:**
 * - fahrzeugtypId kann NICHT geändert werden (UpdateStammFahrzeugCommand enthält es nicht)
 * - Aggregate.update() würde Änderungsversuch ablehnen
 * - Bei Typwechsel muss neues StammFahrzeug erstellt werden
 *
 * **Response DTO Mapping:**
 * - StammFahrzeugDto benötigt FahrzeugtypDto (nested relation)
 * - Handler lädt Fahrzeugtyp aus DB für Response-Mapping
 * - Nutzt fahrzeugtypId aus Aggregate (IMMUTABLE, daher konsistent)
 */
@Injectable()
export class UpdateStammFahrzeugHandler extends TransactionalCommandHandler<UpdateStammFahrzeugCommand, StammFahrzeugDto> {
  protected readonly logger = new Logger(UpdateStammFahrzeugHandler.name);

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
   *
   * **Empty-Update Check:**
   * - Aggregate.update() validiert, dass mindestens ein Feld geändert wurde
   * - Vermeidet unnötige DB-Writes bei leeren Updates
   *
   * **Funkrufname Uniqueness Check (wenn geändert):**
   * - HINWEIS: TOCTOU Race Condition akzeptiert
   * - Pre-Check (findByFunkrufname) und save() sind nicht atomar
   * - Zwischen Check und Save kann ein anderer Request den gleichen Funkrufname erstellen
   * - ABER: Prisma Unique Constraint (P2002) fängt Race Condition ab
   * - save() wird mit Result.fail('Der Funkrufname "..." ist bereits vergeben.') fehlschlagen
   * - Pre-Check verbessert nur UX (sofortiges Feedback statt DB-Roundtrip)
   * - Race Window ist extrem klein (<100ms) in einer Single-Admin-Anwendung
   */
  protected async executeInTransaction(command: UpdateStammFahrzeugCommand, tx: TransactionContext): Promise<Result<{ result: StammFahrzeugDto; events: DomainEvent[] }>> {
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

    // 3. Check Uniqueness: funkrufname (wenn geändert)
    if (command.funkrufname && command.funkrufname !== stammFahrzeug.funkrufname) {
      const duplicateResult = await this.stammFahrzeugRepository.findByFunkrufname(command.funkrufname, tx);
      if (duplicateResult.isFailure) {
        if (!duplicateResult.error) {
          this.logger.error('StammFahrzeugRepository.findByFunkrufname returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository returned failure without error message');
        }
        return Result.fail(duplicateResult.error);
      }
      if (duplicateResult.value) {
        return Result.fail(StammFahrzeugError.format(STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE, `Funkrufname '${command.funkrufname}' ist bereits vergeben`));
      }
    }

    // 4. Update Aggregate (updatedBy wird automatisch gesetzt)
    const updateResult = stammFahrzeug.update({
      rufname: command.rufname,
      funkrufname: command.funkrufname,
      kennzeichen: command.kennzeichen,
      baujahr: command.baujahr,
      funkkenungBOS: command.funkkenungBOS,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      if (!updateResult.error) {
        this.logger.error('StammFahrzeug.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate update returned failure without error message');
      }
      return Result.fail(updateResult.error);
    }

    // 5. Save Aggregate in Transaction
    const saveResult = await this.stammFahrzeugRepository.save(stammFahrzeug, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('StammFahrzeugRepository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 6. Extract Domain Events
    const events = stammFahrzeug.getDomainEvents();
    stammFahrzeug.clearDomainEvents();

    this.logger.log(`StammFahrzeug updated: ${stammFahrzeug.id.value}`);

    // 7. Load Fahrzeugtyp for DTO Mapping (fahrzeugtypId ist IMMUTABLE, daher konsistent)
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

    // 8. Map to DTO and return (inkl. Fahrzeugtyp für nested DTO)
    const dto = StammFahrzeugQueryMapper.toDto(stammFahrzeug, fahrzeugtypResult.value);
    return Result.ok({ result: dto, events });
  }
}
