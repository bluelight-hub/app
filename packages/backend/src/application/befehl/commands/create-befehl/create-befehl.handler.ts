import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { CreateBefehlCommand } from './create-befehl.command';

/**
 * Handler für CreateBefehlCommand mit Transactional Outbox Pattern.
 *
 * Erweitert TransactionalCommandHandler für atomare Persistierung von
 * Befehl Aggregate und Domain Events in einer Datenbank-Transaktion.
 *
 * **Transactional Flow:**
 * 1. Validiert EinsatzId, UserId-Formate
 * 2. Erstellt Befehl Aggregate via Factory Method
 * 3. Speichert Aggregate in Transaction (via Repository)
 * 4. Extrahiert Domain Events vom Aggregate
 * 5. Base Handler speichert Events in Outbox (atomar in gleicher TX)
 */
@Injectable()
export class CreateBefehlHandler extends TransactionalCommandHandler<CreateBefehlCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(BEFEHL_REPOSITORY)
    private readonly befehlRepository: IBefehlRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateBefehlCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. Validate EinsatzId
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure) {
      return Result.fail(einsatzIdResult.error ?? 'Ungültige Einsatz-ID');
    }
    const einsatzId = einsatzIdResult.value as EinsatzId;

    // 2. Validate EmpfängerIds
    const empfaengerIds: UserId[] = [];
    for (const id of command.empfaengerIds) {
      const userIdResult = UserId.create(id);
      if (userIdResult.isFailure) {
        return Result.fail(userIdResult.error ?? `Ungültige Empfänger-ID: ${id}`);
      }
      empfaengerIds.push(userIdResult.value as UserId);
    }

    // 3. Validate BefehlsgeberId
    const befehlsgeberIdResult = UserId.create(command.befehlsgeberId);
    if (befehlsgeberIdResult.isFailure) {
      return Result.fail(befehlsgeberIdResult.error ?? 'Ungültige Befehlsgeber-ID');
    }
    const befehlsgeberId = befehlsgeberIdResult.value as UserId;

    // 4. Validate ErstellerId
    const erstellerIdResult = UserId.create(command.erstellerId);
    if (erstellerIdResult.isFailure) {
      return Result.fail(erstellerIdResult.error ?? 'Ungültige Ersteller-ID');
    }
    const erstellerId = erstellerIdResult.value as UserId;

    // 5. Create Aggregate via Factory Method
    const befehlResult = Befehl.create({
      einsatzId,
      empfaengerIds,
      befehlsgeberId,
      erstellerId,
      auftrag: command.auftrag,
      zeitvorgabe: command.zeitvorgabe,
      ereignis: command.ereignis,
      mittel: command.mittel,
      ziel: command.ziel,
      weg: command.weg,
    });

    if (befehlResult.isFailure) {
      return Result.fail(befehlResult.error ?? 'Befehl konnte nicht erstellt werden');
    }

    const befehl = befehlResult.value as Befehl;

    // 6. Save Aggregate in Transaction
    const saveResult = await this.befehlRepository.save(befehl, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Speichern fehlgeschlagen');
    }

    // 7. Extract Domain Events für Outbox
    const events = befehl.getDomainEvents();

    return { result: befehl.id.value, events };
  }
}
