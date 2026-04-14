import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { DeleteEinheitCommand } from './delete-einheit.command';

/**
 * Handler für DeleteEinheitCommand.
 *
 * Löscht eine taktische Einheit. Prüft Voraussetzungen:
 * - Keine untergeordneten Einheiten (Children)
 * - Keine zugewiesenen Personen
 *
 * Kaskadiert verknüpfte taktische Zeichen (synchron in derselben Transaktion).
 *
 * **Return:** void
 */
@Injectable()
export class DeleteEinheitHandler extends TransactionalCommandHandler<DeleteEinheitCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischesZeichenRepository: ITaktischesZeichenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Löscht eine EinsatzEinheit innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Einheit laden und einsatzId prüfen
   * 2. Prüfen ob untergeordnete Einheiten existieren
   * 3. Prüfen ob Personen zugewiesen sind
   * 4. Verknüpftes taktisches Zeichen kaskadiert löschen
   * 5. Einheit löschen
   *
   * @param command - DeleteEinheitCommand
   * @param tx - Transaction Context
   * @returns void oder Fehler
   */
  protected async executeInTransaction(command: DeleteEinheitCommand, tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
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

    // 3. Prüfen ob untergeordnete Einheiten existieren
    const childrenCount = await this.einsatzEinheitRepository.countChildren(command.einheitId, tx);
    if (childrenCount > 0) {
      return Result.fail(
        EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.HAS_CHILDREN, `Einheit '${einheit.name}' hat ${childrenCount} untergeordnete Einheit(en) und kann nicht gelöscht werden`),
      );
    }

    // 4. Prüfen ob Personen zugewiesen sind
    const personenCount = await this.einsatzEinheitRepository.countPersonen(command.einheitId, tx);
    if (personenCount > 0) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.HAS_PERSONEN, `Einheit '${einheit.name}' hat ${personenCount} zugewiesene Person(en) und kann nicht gelöscht werden`));
    }

    // 5. Verknüpftes taktisches Zeichen kaskadiert löschen (in derselben Transaktion)
    const zeichenResult = await this.taktischesZeichenRepository.findByReferenz('EINHEIT', command.einheitId, tx);
    if (zeichenResult.isSuccess && zeichenResult.value && zeichenResult.value.length > 0) {
      for (const zeichen of zeichenResult.value) {
        if (zeichen.istPlatziert) {
          this.logger.warn(`Taktisches Zeichen ${zeichen.id.value} war auf der Lagekarte platziert und wird mit Einheit ${command.einheitId} gelöscht`);
        }
        const zeichenDeleteResult = await this.taktischesZeichenRepository.delete(zeichen.id.value, tx);
        if (zeichenDeleteResult.isFailure) {
          return Result.fail(`Fehler beim Löschen des taktischen Zeichens ${zeichen.id.value}: ${zeichenDeleteResult.error}`);
        }
        this.logger.log(`Taktisches Zeichen ${zeichen.id.value} kaskadiert mit Einheit ${command.einheitId} gelöscht`);
      }
    }

    // 6. Einheit löschen
    const deleteResult = await this.einsatzEinheitRepository.delete(command.einheitId, tx);
    if (deleteResult.isFailure) {
      return Result.fail(deleteResult.error ?? 'Fehler beim Löschen der Einheit');
    }

    this.logger.log(`EinsatzEinheit gelöscht: ${einheit.id.value} (${einheit.name})`);

    return { result: undefined, events: [] };
  }
}
