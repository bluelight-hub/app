import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { AssignFahrzeugToEinheitCommand } from './assign-fahrzeug-to-einheit.command';

/**
 * Handler für AssignFahrzeugToEinheitCommand.
 *
 * Weist ein EinsatzFahrzeug einer taktischen Einheit zu oder entfernt die Zuweisung.
 * Nutzt die assignToEinheit() Methode des Aggregates, die ein
 * FahrzeugEinheitZugewiesenEvent emittiert.
 *
 * **Return:** void (kein DTO, nur Seiteneffekt)
 */
@Injectable()
export class AssignFahrzeugToEinheitHandler extends TransactionalCommandHandler<AssignFahrzeugToEinheitCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Weist ein Fahrzeug einer Einheit zu innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Fahrzeug laden und einsatzId prüfen
   * 2. Falls einheitId != null: Einheit laden und selben Einsatz prüfen
   * 3. assignToEinheit() auf Aggregate aufrufen (emittiert Event)
   * 4. Aggregate speichern
   * 5. Domain Events zurückgeben
   */
  protected async executeInTransaction(command: AssignFahrzeugToEinheitCommand, tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
    // 1. Validate EinsatzFahrzeugId format
    const fahrzeugIdResult = EinsatzFahrzeugId.create(command.fahrzeugId);
    if (fahrzeugIdResult.isFailure || !fahrzeugIdResult.value) {
      return Result.fail(fahrzeugIdResult.error ?? 'Ungültige EinsatzFahrzeug ID');
    }

    // 2. Load EinsatzFahrzeug Aggregate
    const fahrzeugResult = await this.einsatzFahrzeugRepository.findById(fahrzeugIdResult.value, tx);
    if (fahrzeugResult.isFailure) {
      return Result.fail(fahrzeugResult.error ?? 'Fehler beim Laden des EinsatzFahrzeugs');
    }
    if (!fahrzeugResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, `EinsatzFahrzeug mit ID '${command.fahrzeugId}' nicht gefunden`));
    }
    const fahrzeug = fahrzeugResult.value;

    // 3. Verify Einsatz-ID matches (Security)
    if (fahrzeug.einsatzId !== command.einsatzId) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, `EinsatzFahrzeug '${command.fahrzeugId}' gehört nicht zu Einsatz '${command.einsatzId}'`));
    }

    // 4. Falls einheitId != null: Einheit laden und prüfen
    let einheitName: string | null = null;
    if (command.einheitId !== null) {
      const einheitResult = await this.einsatzEinheitRepository.findById(command.einheitId, tx);
      if (einheitResult.isFailure || !einheitResult.value) {
        return Result.fail(`Einheit mit ID '${command.einheitId}' nicht gefunden`);
      }
      const einheit = einheitResult.value;

      // Prüfe ob Einheit zum selben Einsatz gehört
      if (einheit.einsatzId !== command.einsatzId) {
        return Result.fail(`Einheit '${command.einheitId}' gehört nicht zu Einsatz '${command.einsatzId}'`);
      }

      einheitName = einheit.name;
    }

    // 5. Domain Logic: Einheit zuweisen (emittiert FahrzeugEinheitZugewiesenEvent)
    const assignResult = fahrzeug.assignToEinheit(command.einheitId, einheitName, command.updatedBy);
    if (assignResult.isFailure) {
      return Result.fail(assignResult.error ?? 'Fehler bei der Einheit-Zuweisung');
    }

    // 6. Domain Events extrahieren
    const events = fahrzeug.getDomainEvents();

    // 7. Aggregate speichern nur wenn Events vorhanden (Idempotenz)
    if (events.length > 0) {
      const saveResult = await this.einsatzFahrzeugRepository.save(fahrzeug, tx);
      if (saveResult.isFailure) {
        return Result.fail(saveResult.error ?? 'Fehler beim Speichern des EinsatzFahrzeugs');
      }
    }

    // 8. Clear Domain Events
    fahrzeug.clearDomainEvents();

    this.logger.log(`Fahrzeug ${fahrzeug.funkrufname} ${command.einheitId ? `Einheit ${einheitName} zugewiesen` : 'von Einheit entfernt'}${events.length === 0 ? ' (idempotent)' : ''}`);

    return { result: undefined, events };
  }
}
