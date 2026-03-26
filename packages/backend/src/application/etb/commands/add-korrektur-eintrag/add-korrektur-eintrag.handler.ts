import { Result } from '@domain/common/result';
import type { EtbEintrag } from '@domain/entities/etb-eintrag.entity';
import type { IEtbRepository } from '@domain/repositories';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { EtbId } from '@domain/value-objects/etb-id';
import { EtbKategorie } from '@domain/value-objects/etb-kategorie';
import { UserId } from '@domain/value-objects/user-id';
import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { AddKorrekturEintragCommand } from './add-korrektur-eintrag.command';
import { ETB_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

/**
 * Handler fuer AddKorrekturEintragCommand.
 *
 * Erstellt einen Korrektur-Eintrag fuer einen bestehenden ETB-Eintrag.
 * Der Original-Eintrag wird als korrigiert markiert (korrigiertDurchId).
 * Analog zum KorrigiereBefehlHandler im Befehl-Feature.
 */
@Injectable()
export class AddKorrekturEintragHandler {
  constructor(
    @Inject(ETB_REPOSITORY)
    private readonly etbRepository: IEtbRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(command: AddKorrekturEintragCommand): Promise<Result<EtbEintrag>> {
    // Validate IDs
    const etbIdResult = EtbId.create(command.etbId);
    if (etbIdResult.isFailure || !etbIdResult.value) {
      return Result.fail<EtbEintrag>('Ungueltige ETB-ID');
    }

    const userIdResult = UserId.create(command.userId);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<EtbEintrag>('Ungueltige User-ID');
    }

    const originalEintragIdResult = EintragId.create(command.originalEintragId);
    if (originalEintragIdResult.isFailure || !originalEintragIdResult.value) {
      return Result.fail<EtbEintrag>('Ungueltige Original-Eintrag-ID');
    }

    // Load ETB Aggregate
    const aggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!aggregate) {
      return Result.fail<EtbEintrag>('ETB nicht gefunden');
    }

    // Convert Kategorie if provided
    let kategorieVo: EtbKategorie | undefined;
    if (command.kategorie) {
      const kategorieResult = EtbKategorie.create(command.kategorie);
      if (kategorieResult.isFailure) {
        return Result.fail<EtbEintrag>(kategorieResult.error ?? 'Ungueltige Kategorie');
      }
      kategorieVo = kategorieResult.value as EtbKategorie;
    }

    // Delegate to domain method
    const korrekturResult = aggregate.addKorrekturEintrag(
      originalEintragIdResult.value as EintragId,
      command.text,
      userIdResult.value as UserId,
      kategorieVo,
      command.absender,
      command.empfaenger,
      command.metadata,
      command.occurredAt,
    );

    if (korrekturResult.isFailure || !korrekturResult.value) {
      return Result.fail<EtbEintrag>(korrekturResult.error ?? 'Korrektur konnte nicht erstellt werden');
    }

    // Save aggregate
    try {
      await this.etbRepository.save(aggregate);
    } catch (error) {
      this.logger.error('Failed to save ETB after adding correction entry', {
        error: error instanceof Error ? error.message : String(error),
        etbId: command.etbId,
        originalEintragId: command.originalEintragId,
      });
      return Result.fail<EtbEintrag>('Korrektur konnte nicht gespeichert werden');
    }

    return Result.ok(korrekturResult.value);
  }
}
