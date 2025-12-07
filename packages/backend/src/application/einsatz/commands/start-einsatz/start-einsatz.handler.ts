import type { IEinsatzRepository } from '@domain/repositories';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EinsatzStatus } from '@domain/value-objects/einsatz-status';
import { UserId } from '@domain/value-objects/user-id';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { StartEinsatzCommand } from './start-einsatz.command';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { EINSATZ_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

/**
 * Handler für StartEinsatzCommand mit Transactional Outbox Pattern.
 *
 * Erweitert TransactionalCommandHandler für atomare Persistierung von
 * Einsatz-Start und Domain Events in einer Datenbank-Transaktion.
 *
 * **Transactional Flow:**
 * 1. Validiert EinsatzId und UserId Format
 * 2. Lädt Aggregate via Repository (außerhalb Transaction - nur Read)
 * 3. Prüft ob Einsatz im Status ANGELEGT ist
 * 4. Ruft aggregate.updateStatus(IN_BEARBEITUNG) auf
 * 5. Speichert Aggregate in Transaction
 * 6. Extrahiert Domain Events vom Aggregate
 * 7. Base Handler speichert Events in Outbox (atomar in gleicher TX)
 * 8. Transaction Commit → Aggregate + Events persistent
 * 9. OutboxEventPublisher pollt und publiziert Events asynchron
 *
 * **Business Rules (vom Aggregate/Service enforced):**
 * - Status muss ANGELEGT sein (andernfalls No-Op)
 * - Setzt Status auf IN_BEARBEITUNG
 * - Archivierte Einsätze können nicht gestartet werden
 *
 * **Event Flow:**
 * - EinsatzStatusChangedEvent wird in Outbox persistiert (PENDING status)
 * - OutboxEventPublisher pollt und publiziert zu Event Bus (max 7s Latenz)
 *
 * **Warum Transactional Outbox Pattern:**
 * - Garantiert atomare Persistierung: Aggregate + Events committed oder beide rollback
 * - Keine "lost events" bei DB-Fehlern nach Aggregate-Save
 * - Retry-Safe: Events in Outbox können bei Fehler erneut publiziert werden
 *
 * **Warum eigener StartEinsatzCommand statt UpdateStatusCommand:**
 * - Semantische Klarheit: "Einsatz starten" ist fachlich klar definierte Operation
 * - Konsistenz mit CompleteEinsatzCommand (hat auch eigenen Command)
 * - Audit Trail: Explizite Start-Operation nachvollziehbar
 * - Domain Language: "start" ist Teil der Ubiquitous Language
 */
@CommandHandler(StartEinsatzCommand)
@Injectable()
export class StartEinsatzHandler extends TransactionalCommandHandler<StartEinsatzCommand, void> {
  private readonly logger = new Logger(StartEinsatzHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(EINSATZ_REPOSITORY)
    private readonly einsatzRepository: IEinsatzRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Führt den Einsatz-Start innerhalb einer Datenbank-Transaktion aus.
   *
   * Diese Methode implementiert die Business Logic für StartEinsatzCommand:
   * 1. Validiert EinsatzId und UserId Format
   * 2. Lädt Aggregate via Repository
   * 3. Prüft ob Status ANGELEGT ist (sonst No-Op)
   * 4. Ruft aggregate.updateStatus(IN_BEARBEITUNG) auf
   * 5. Speichert Aggregate in Transaction
   * 6. Extrahiert Domain Events für Outbox
   *
   * WICHTIG: Nutzt `tx` Parameter für save() Operation (NICHT this.prisma).
   * Base Handler koordiniert Transaction Commit und Outbox-Persistierung.
   *   *
   * **Result Pattern (AC4):**
   * - Gibt Result<T> zurück für erwartete Fehler (Validierung, Business Rules)
   * - Exceptions nur für unerwartete Fehler (DB-Fehler, Programming Errors)
   * - Bei Result.fail(): Transaction wird automatisch zurückgerollt
   *
   * @param command - Validierter StartEinsatzCommand
   * @param tx - Transaction Context (framework-agnostisch, Infrastructure castet zu Prisma) (MUSS für save() verwendet werden)
   * @returns Result<{ result: TResult; events: DomainEvent[] }> - Success oder Failure
   * @throws Error bei Business Rule Violations (triggert Transaction Rollback)
   */
  protected async executeInTransaction(command: StartEinsatzCommand, tx: TransactionContext): Promise<Result<{ result: undefined; events: DomainEvent[] }>> {
    // Step 1: Validate EinsatzId format
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure) {
      const error = einsatzIdResult.error ?? 'Ungültige Einsatz-ID';
      this.logger.warn('EinsatzId validation failed', {
        operation: 'startEinsatz',
        phase: 'validation',
        error,
        einsatzId: command.einsatzId,
      });
      return Result.fail(error);
    }
    const einsatzId = einsatzIdResult.value;
    if (!einsatzId) {
      this.logger.error('Unexpected null EinsatzId after successful validation', {
        operation: 'startEinsatz',
        phase: 'validation',
      });
      return Result.fail('Ungültige Einsatz-ID');
    }

    // Step 2: Validate UserId format
    const userIdResult = UserId.create(command.startedBy);
    if (userIdResult.isFailure) {
      const error = userIdResult.error ?? 'Ungültige User-ID';
      this.logger.warn('UserId validation failed', {
        operation: 'startEinsatz',
        phase: 'validation',
        error,
        startedBy: command.startedBy,
      });
      return Result.fail(error);
    }
    const userId = userIdResult.value;
    if (!userId) {
      this.logger.error('Unexpected null UserId after successful validation', {
        operation: 'startEinsatz',
        phase: 'validation',
      });
      return Result.fail('Ungültige User-ID');
    }

    // Step 3: Load Aggregate via Repository
    // WICHTIG: findById benötigt KEINE Transaction (nur Read-Operation)
    const findResult = await this.einsatzRepository.findById(einsatzId);
    if (findResult.isFailure) {
      const error = findResult.error ?? 'Einsatz konnte nicht geladen werden';
      this.logger.error('Failed to load Einsatz', {
        operation: 'startEinsatz',
        phase: 'load',
        error,
        einsatzId: command.einsatzId,
      });
      return Result.fail(error);
    }

    const einsatz = findResult.value;
    if (!einsatz) {
      this.logger.warn('Einsatz not found', {
        operation: 'startEinsatz',
        phase: 'load',
        einsatzId: command.einsatzId,
      });
      return Result.fail(command.einsatzId);
    }

    // Step 4: Check if einsatz is already started (No-Op if not ANGELEGT)
    if (einsatz.status.value !== 'ANGELEGT') {
      this.logger.debug('Einsatz is already started (No-Op)', {
        operation: 'startEinsatz',
        phase: 'businessRule',
        einsatzId: command.einsatzId,
        currentStatus: einsatz.status.value,
      });
      // Return success with no events (idempotent operation)
      return Result.ok({ result: undefined, events: [] });
    }

    // Step 5: Call aggregate.updateStatus(IN_BEARBEITUNG)
    const targetStatus = EinsatzStatus.IN_BEARBEITUNG();
    const updateResult = einsatz.updateStatus(targetStatus);
    if (updateResult.isFailure) {
      const error = updateResult.error ?? 'Einsatz konnte nicht gestartet werden';
      this.logger.warn('Einsatz start failed', {
        operation: 'startEinsatz',
        phase: 'businessRule',
        einsatzId: command.einsatzId,
        error,
      });
      return Result.fail(error);
    }

    // Step 6: Save Aggregate in Transaction (WICHTIG: Nutze tx, nicht this.prisma)
    const saveResult = await this.einsatzRepository.save(einsatz, tx);
    if (saveResult.isFailure) {
      const error = saveResult.error ?? 'Einsatz konnte nicht gespeichert werden';
      this.logger.error('Failed to save Einsatz', {
        operation: 'startEinsatz',
        phase: 'persist',
        error,
        einsatzId: command.einsatzId,
      });
      return Result.fail(error);
    }

    // Step 7: Extract Domain Events for Outbox
    // Base Handler wird Events in Outbox persistieren (atomar in gleicher TX)
    // Repository cleared bereits nach Transaction Commit
    const events = einsatz.getDomainEvents();

    this.logger.log('Einsatz started successfully', {
      einsatzId: command.einsatzId,
      startedBy: command.startedBy,
      eventCount: events.length,
    });

    // Step 8: Return result + events für Base Handler
    return Result.ok({ result: undefined, events });
  }
}
