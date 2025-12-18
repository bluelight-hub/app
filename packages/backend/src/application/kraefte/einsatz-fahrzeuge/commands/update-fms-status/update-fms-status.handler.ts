import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IEinsatzFahrzeugRepository needed for DI at runtime
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzFahrzeugDto } from '../../dto';
import { EinsatzFahrzeugQueryMapper } from '../../queries/einsatz-fahrzeug-query.mapper';
import type { UpdateFmsStatusCommand } from './update-fms-status.command';

/**
 * Command Handler für FMS-Status Update eines EinsatzFahrzeugs.
 *
 * **AC2 - Status ändern emittiert Domain Event:**
 * - Status wird im Aggregate aktualisiert
 * - FmsStatusGeaendertEvent wird emittiert
 * - ETB-Eintrag wird automatisch erstellt (via Event Handler)
 *
 * **AC3 - Atomare Persistierung (Outbox Pattern):**
 * - EinsatzFahrzeug und Event werden in gleicher Transaction gespeichert
 * - Bei Fehler → gesamte Transaction Rollback
 *
 * **AC4 - Validierung:**
 * - FMS-Status muss zwischen 0-9 liegen
 * - Bei ungültigem Status → INVALID_FMS_STATUS Error
 *
 * **AC5 - Position Update:**
 * - Optional kann Position zusammen mit Status aktualisiert werden
 */
@Injectable()
export class UpdateFmsStatusHandler extends TransactionalCommandHandler<UpdateFmsStatusCommand, EinsatzFahrzeugDto> {
  protected readonly logger = new Logger(UpdateFmsStatusHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Führt das FMS-Status Update innerhalb einer Transaction aus.
   *
   * **Ablauf:**
   * 1. EinsatzFahrzeug Aggregate laden
   * 2. Verify Einsatz-ID matches (Security)
   * 3. Domain Logic ausführen (emittiert FmsStatusGeaendertEvent)
   * 4. Aggregate speichern
   * 5. Fahrzeugtyp laden für Response DTO
   * 6. Domain Events extrahieren für Outbox
   *
   * @param command - UpdateFmsStatusCommand mit FMS-Status und optionaler Position
   * @param tx - TransactionContext für atomare Persistierung (DB Transaction)
   * @returns Result<{ result: EinsatzFahrzeugDto; events: DomainEvent[] }> - Success mit DTO und Events oder Failure mit Fehlermeldung
   */
  protected async executeInTransaction(command: UpdateFmsStatusCommand, tx: TransactionContext): Promise<Result<{ result: EinsatzFahrzeugDto; events: DomainEvent[] }>> {
    // 1. Validate EinsatzFahrzeugId format
    const fahrzeugIdResult = EinsatzFahrzeugId.create(command.fahrzeugId);
    if (fahrzeugIdResult.isFailure) {
      return Result.fail(fahrzeugIdResult.error ?? 'Ungültige EinsatzFahrzeug ID');
    }
    const einsatzFahrzeugId = fahrzeugIdResult.value;
    if (!einsatzFahrzeugId) {
      this.logger.error('EinsatzFahrzeugId.create returned success but value is null');
      throw new Error('EinsatzFahrzeug ID validation succeeded but value is null');
    }

    // 2. Load EinsatzFahrzeug Aggregate
    const fahrzeugResult = await this.einsatzFahrzeugRepository.findById(einsatzFahrzeugId, tx);
    if (fahrzeugResult.isFailure) {
      return Result.fail(fahrzeugResult.error ?? 'Fehler beim Laden des EinsatzFahrzeugs');
    }
    if (!fahrzeugResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, `EinsatzFahrzeug mit ID '${command.fahrzeugId}' nicht gefunden`));
    }
    const fahrzeug = fahrzeugResult.value;

    // 3. Verify Einsatz-ID matches (Security: verhindert Cross-Einsatz Status Changes)
    if (fahrzeug.einsatzId !== command.einsatzId) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, `EinsatzFahrzeug '${command.fahrzeugId}' gehört nicht zu Einsatz '${command.einsatzId}'`));
    }

    // 4. Execute Domain Logic (emits FmsStatusGeaendertEvent via Aggregate)
    const updateResult = fahrzeug.updateFmsStatus({
      fmsStatus: command.fmsStatus,
      updatedBy: command.updatedBy,
      position: command.position,
    });

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error ?? 'Fehler beim FMS-Status Update');
    }

    // 5. Extract Domain Events (vor dem Save um Idempotenz zu prüfen)
    const events = fahrzeug.getDomainEvents();

    // 5a. Save Aggregate NUR wenn Events vorhanden (Idempotenz)
    // Bei unverändertem Status emittiert Aggregate KEIN Event → kein Save nötig
    if (events.length > 0) {
      const saveResult = await this.einsatzFahrzeugRepository.save(fahrzeug, tx);
      if (saveResult.isFailure) {
        return Result.fail(saveResult.error ?? 'Fehler beim Speichern des EinsatzFahrzeugs');
      }
    }

    // 6. Load Fahrzeugtyp for Response DTO
    const fahrzeugtypIdResult = FahrzeugtypId.create(fahrzeug.fahrzeugtypId);
    if (fahrzeugtypIdResult.isFailure || !fahrzeugtypIdResult.value) {
      this.logger.error(`Invalid fahrzeugtypId in EinsatzFahrzeug: ${fahrzeug.fahrzeugtypId}`);
      return Result.fail('EinsatzFahrzeug enthält ungültige Fahrzeugtyp-ID');
    }
    const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypIdResult.value, tx);
    if (fahrzeugtypResult.isFailure || !fahrzeugtypResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND, `Fahrzeugtyp mit ID '${fahrzeug.fahrzeugtypId}' nicht gefunden`));
    }
    const fahrzeugtyp = fahrzeugtypResult.value;

    // 7. Clear Domain Events (nach Extraktion)
    fahrzeug.clearDomainEvents();

    this.logger.log(`FMS-Status aktualisiert: ${fahrzeug.id.value} (${fahrzeug.funkrufname}) zu Status ${command.fmsStatus}${events.length === 0 ? ' (idempotent)' : ''}`);

    // 8. Map to DTO and return
    const dto = EinsatzFahrzeugQueryMapper.toDto(fahrzeug, fahrzeugtyp);
    return Result.ok({ result: dto, events });
  }
}
