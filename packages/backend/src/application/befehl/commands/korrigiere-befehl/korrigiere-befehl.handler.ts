import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { BefehlNamingService } from '@domain/services/befehl-naming.service';
import { BEFEHL_ERROR_CODES } from '@/application/befehl/errors/befehl-error.codes';
import { KorrigiereBefehlCommand } from './korrigiere-befehl.command';

/**
 * Handler fuer KorrigiereBefehlCommand mit Transactional Outbox Pattern.
 *
 * Erstellt einen Korrekturbefehl und markiert den Original-Befehl als KORRIGIERT.
 * Beide Operationen laufen atomar in einer Transaktion.
 *
 * **Transactional Flow:**
 * 1. Validiert originalBefehlId
 * 2. Laedt Original-Befehl aus Repository
 * 3. original.korrigieren() — setzt Status auf KORRIGIERT
 * 4. Befehl.create() — neuer Befehl mit originalBefehlId-Referenz
 * 5. Speichert beide Aggregates in gleicher TX
 * 6. Extrahiert Events beider Aggregates fuer Outbox
 */
@Injectable()
export class KorrigiereBefehlHandler extends TransactionalCommandHandler<KorrigiereBefehlCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(BEFEHL_REPOSITORY)
    private readonly befehlRepository: IBefehlRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: KorrigiereBefehlCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. Validate originalBefehlId
    const originalIdResult = BefehlId.create(command.originalBefehlId);
    if (originalIdResult.isFailure) {
      return Result.fail(originalIdResult.error ?? 'Ungültige Original-Befehl-ID');
    }
    const originalId = originalIdResult.value as BefehlId;

    // 2. Load Original-Befehl from Repository
    const findResult = await this.befehlRepository.findById(originalId, tx);
    if (findResult.isFailure) {
      return Result.fail(findResult.error ?? 'Fehler beim Laden des Original-Befehls');
    }
    const original = findResult.value as Befehl | null;
    if (!original) {
      return Result.fail(BEFEHL_ERROR_CODES.NOT_FOUND);
    }

    // 3. Mark original as KORRIGIERT
    const korrigierenResult = original.korrigieren();
    if (korrigierenResult.isFailure) {
      return Result.fail(korrigierenResult.error ?? 'Korrektur fehlgeschlagen');
    }

    // 4. Validate ErstellerId
    const erstellerIdResult = UserId.create(command.erstellerId);
    if (erstellerIdResult.isFailure) {
      return Result.fail(erstellerIdResult.error ?? 'Ungültige Ersteller-ID');
    }
    const erstellerId = erstellerIdResult.value as UserId;

    // 5. Parse Empfaenger-Namen + optionale UserIds
    const empfaenger = command.empfaenger.map((e) => {
      let empfaengerId: UserId | undefined;
      if (e.empfaengerId) {
        const idResult = UserId.create(e.empfaengerId);
        if (idResult.isSuccess) {
          empfaengerId = idResult.value as UserId;
        }
      }
      return { name: e.name, empfaengerId };
    });

    // 5b. Generate sequential Befehlsnummer
    const seqResult = await this.befehlRepository.getNextSequenceNumber(original.einsatzId, tx);
    if (seqResult.isFailure) {
      return Result.fail(seqResult.error ?? 'Sequenznummer konnte nicht ermittelt werden');
    }
    const namingService = new BefehlNamingService();
    const nummer = namingService.generateBefehlNummer(seqResult.value!);

    // 6. Create new Korrekturbefehl with originalBefehlId reference
    const neuerBefehlResult = Befehl.create({
      einsatzId: original.einsatzId,
      empfaenger,
      befehlsgeber: command.befehlsgeber,
      erstellerId,
      nummer,
      auftrag: command.auftrag,
      zeitvorgabe: command.zeitvorgabe,
      ereignis: command.ereignis,
      mittel: command.mittel,
      ziel: command.ziel,
      weg: command.weg,
      originalBefehlId: original.id,
    });

    if (neuerBefehlResult.isFailure) {
      return Result.fail(neuerBefehlResult.error ?? 'Korrekturbefehl konnte nicht erstellt werden');
    }

    const neuerBefehl = neuerBefehlResult.value as Befehl;

    // 7. Save both aggregates in same transaction
    const saveOriginalResult = await this.befehlRepository.save(original, tx);
    if (saveOriginalResult.isFailure) {
      return Result.fail(saveOriginalResult.error ?? 'Speichern des Original-Befehls fehlgeschlagen');
    }

    const saveNeuResult = await this.befehlRepository.save(neuerBefehl, tx);
    if (saveNeuResult.isFailure) {
      return Result.fail(saveNeuResult.error ?? 'Speichern des Korrekturbefehls fehlgeschlagen');
    }

    // 8. Extract Domain Events from both aggregates
    const events: DomainEvent[] = [...original.getDomainEvents(), ...neuerBefehl.getDomainEvents()];

    return { result: neuerBefehl.id.value, events };
  }
}
