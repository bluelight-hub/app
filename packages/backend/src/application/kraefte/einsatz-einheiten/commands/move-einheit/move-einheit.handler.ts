import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzEinheitDto } from '../../dto';
import { mapEinheitToDto } from '../../einsatz-einheit-mapper';
import type { MoveEinheitCommand } from './move-einheit.command';

/**
 * Handler für MoveEinheitCommand.
 *
 * Verschiebt eine taktische Einheit in der Hierarchie.
 * Prüft zirkuläre Hierarchien durch einen Ancestor-Walk.
 *
 * **Zirkuläre Hierarchie-Prüfung:**
 * Läuft die Elternkette des neuen Parent-Knotens hoch und prüft
 * ob die zu verschiebende Einheit selbst ein Vorfahre ist.
 * Verhindert damit, dass eine Einheit zu ihrem eigenen Nachkommen verschoben wird.
 *
 * **Return:** EinsatzEinheitDto mit neuer parentId
 */
@Injectable()
export class MoveEinheitHandler extends TransactionalCommandHandler<MoveEinheitCommand, EinsatzEinheitDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Verschiebt eine EinsatzEinheit innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit laden und einsatzId prüfen
   * 2. Falls parentId gesetzt: Parent-Einheit laden und validieren
   * 3. Zirkuläre Hierarchie-Check (Ancestor-Walk)
   * 4. einheit.moveToParent() aufrufen
   * 5. Aggregate speichern
   *
   * @param command - MoveEinheitCommand
   * @param tx - Transaction Context
   * @returns EinsatzEinheitDto oder Fehler
   */
  protected async executeInTransaction(command: MoveEinheitCommand, tx: TransactionContext): Promise<Result<EinsatzEinheitDto> | { result: EinsatzEinheitDto; events: DomainEvent[] }> {
    // 1. Einheit laden
    const findResult = await this.einsatzEinheitRepository.findById(command.einheitId, tx);
    if (findResult.isFailure) {
      return Result.fail(findResult.error ?? 'Fehler beim Laden der Einheit');
    }
    if (!findResult.value) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, `Einheit mit ID '${command.einheitId}' nicht gefunden`));
    }
    const einheit = findResult.value;

    // 2. einsatzId-Zugehörigkeit prüfen
    if (einheit.einsatzId !== command.einsatzId) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, `Einheit gehört nicht zum angegebenen Einsatz`));
    }

    // 3. Falls parentId gesetzt: Parent validieren
    if (command.parentId) {
      const parentResult = await this.einsatzEinheitRepository.findById(command.parentId, tx);
      if (parentResult.isFailure) {
        return Result.fail(parentResult.error ?? 'Fehler beim Laden der Eltern-Einheit');
      }
      if (!parentResult.value) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND, `Eltern-Einheit mit ID '${command.parentId}' nicht gefunden`));
      }

      // Prüfen dass Parent zum gleichen Einsatz gehört
      if (parentResult.value.einsatzId !== command.einsatzId) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND, `Eltern-Einheit gehört nicht zum gleichen Einsatz`));
      }

      // 4. Zirkuläre Hierarchie-Check: Ancestor-Walk vom neuen Parent
      const circularCheckResult = await this.checkCircularHierarchy(command.einheitId, command.parentId, tx);
      if (circularCheckResult.isFailure) {
        return Result.fail(circularCheckResult.error ?? 'Fehler bei der Hierarchie-Prüfung');
      }
    }

    // 5. Einheit verschieben (Domain)
    const moveResult = einheit.moveToParent(command.parentId, command.updatedBy);
    if (moveResult.isFailure) {
      return Result.fail(moveResult.error ?? 'Fehler beim Verschieben der Einheit');
    }

    // 6. Aggregate speichern
    const saveResult = await this.einsatzEinheitRepository.save(einheit, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Einheit');
    }

    this.logger.log(`EinsatzEinheit verschoben: ${einheit.id.value} → Parent ${command.parentId ?? 'Top-Level'}`);

    const dto = mapEinheitToDto(einheit);
    return { result: dto, events: [] };
  }

  /**
   * Prüft ob das Verschieben eine zirkuläre Hierarchie erzeugen würde.
   *
   * Läuft die Ancestor-Kette des neuen Parent-Knotens hoch und prüft
   * ob die zu verschiebende Einheit (einheitId) ein Vorfahre ist.
   *
   * @param einheitId - ID der zu verschiebenden Einheit
   * @param newParentId - ID des neuen Eltern-Knotens
   * @param tx - Transaction Context
   * @returns Result.ok() wenn keine Zirkularität, Result.fail() wenn zirkulär
   */
  private async checkCircularHierarchy(einheitId: string, newParentId: string, tx: TransactionContext): Promise<Result<void>> {
    let currentId: string | undefined = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      // Endlosschleifen-Schutz
      if (visited.has(currentId)) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.CIRCULAR_HIERARCHY, 'Zirkuläre Hierarchie in bestehenden Daten erkannt'));
      }
      visited.add(currentId);

      // Prüfen ob der aktuelle Ancestor die zu verschiebende Einheit ist
      if (currentId === einheitId) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.CIRCULAR_HIERARCHY, 'Die Einheit kann nicht unter einen eigenen Nachkommen verschoben werden'));
      }

      // Eltern-Knoten laden
      const parentResult = await this.einsatzEinheitRepository.findById(currentId, tx);
      if (parentResult.isFailure || !parentResult.value) {
        // Eltern nicht gefunden → kein Zirkularitätsproblem (Ancestor-Kette endet)
        break;
      }

      currentId = parentResult.value.parentId;
    }

    return Result.ok<void>(undefined);
  }
}
