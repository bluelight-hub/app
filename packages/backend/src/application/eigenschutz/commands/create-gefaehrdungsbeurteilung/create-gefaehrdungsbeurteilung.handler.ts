import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import type { IGefaehrdungsbeurteilungRepository, IGefaehrdungsbeurteilungVersionRepository, IGefaehrdungsbeurteilungVorlageRepository } from '@domain/eigenschutz/repositories';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
  KRAEFTE_REPOSITORIES,
  LOGGER,
  OUTBOX_REPOSITORY,
} from '@infrastructure/di-tokens';
import { CreateGefaehrdungsbeurteilungCommand } from './create-gefaehrdungsbeurteilung.command';

/**
 * Sentinel-Präfixe für bekannte Fehlermodi. Der Controller mappt diese auf
 * HTTP-Statuscodes (404 für `NotFound:*`, 422 für `BusinessRule:*`). Der
 * Platform-Error-Body enthält den strukturierten Context.
 */
export const CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES = {
  EINHEIT_NOT_FOUND: 'NotFound:Einheit',
  VORLAGE_NOT_FOUND: 'NotFound:Vorlage',
  EINHEIT_HAT_BEREITS_BEURTEILUNG: 'BusinessRule:EinheitHatBereitsBeurteilung',
} as const;

/**
 * Handler für `CreateGefaehrdungsbeurteilungCommand`.
 *
 * **Transactional Flow (AC2, AC3):**
 * 1. Wenn `vorlageId` gesetzt: Vorlage laden → NotFound-Result, wenn Slot leer.
 * 2. Unique-Check `existsForEinheit` — bereits vorhandene Beurteilung ⇒ 422.
 * 3. Items entweder aus der Vorlage mit neuen Item-IDs kopieren oder
 *    leeres Array für das Leer-Formular.
 * 4. Aggregate `Gefaehrdungsbeurteilung.create` → emittiert
 *    `GefaehrdungsbeurteilungErstelltEvent`.
 * 5. `save` + `saveInitialVersion` in derselben Transaktion.
 * 6. Base-Handler persistiert die Events über das Outbox-Pattern.
 */
@Injectable()
@CommandHandler(CreateGefaehrdungsbeurteilungCommand)
export class CreateGefaehrdungsbeurteilungHandler extends TransactionalCommandHandler<CreateGefaehrdungsbeurteilungCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAEHRDUNGSBEURTEILUNG_REPOSITORY)
    private readonly beurteilungRepo: IGefaehrdungsbeurteilungRepository,
    @Inject(GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY)
    private readonly versionRepo: IGefaehrdungsbeurteilungVersionRepository,
    @Inject(GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY)
    private readonly vorlageRepo: IGefaehrdungsbeurteilungVorlageRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateGefaehrdungsbeurteilungCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // Step 0 — AC6: Einheit existiert UND gehört zum angegebenen Einsatz.
    // Nicht existent oder fremder Einsatz → NotFound:Einheit (Controller → 404).
    const einheitResult = await this.einheitRepo.findById(command.einheitId, tx);
    if (einheitResult.isFailure) {
      return Result.fail<string>(einheitResult.error ?? 'Einheit konnte nicht geladen werden');
    }
    const einheit = einheitResult.value;
    if (!einheit || einheit.einsatzId !== command.einsatzId) {
      return Result.fail<string>(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_NOT_FOUND);
    }

    // Step 1 — Business-Rule: pro (Einsatz, Einheit) nur eine Beurteilung.
    const existsResult = await this.beurteilungRepo.existsForEinheit(command.einsatzId, command.einheitId, tx);
    if (existsResult.isFailure) {
      return Result.fail<string>(existsResult.error ?? 'Konflikt-Check fehlgeschlagen');
    }
    if (existsResult.value === true) {
      return Result.fail<string>(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_HAT_BEREITS_BEURTEILUNG);
    }

    // Step 2 — Vorlagen-Lookup (wenn vorgegeben).
    let items: GefaehrdungItem[] = [];
    if (command.vorlageId) {
      const vorlageResult = await this.vorlageRepo.findById(command.vorlageId, tx);
      if (vorlageResult.isFailure) {
        return Result.fail<string>(vorlageResult.error ?? 'Vorlage konnte nicht geladen werden');
      }
      if (!vorlageResult.value) {
        return Result.fail<string>(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.VORLAGE_NOT_FOUND);
      }
      // Deep-Copy über neue Item-IDs — kein Live-Link auf die Vorlagen-Items.
      items = [];
      for (const item of vorlageResult.value.items) {
        const cloneResult = GefaehrdungItem.create({ ...item.toJSON(), id: createId() });
        if (cloneResult.isFailure || !cloneResult.value) {
          return Result.fail<string>(cloneResult.error ?? 'Vorlagen-Item konnte nicht kopiert werden');
        }
        items.push(cloneResult.value);
      }
    }

    // Step 3 — Aggregate erzeugen (Domain emittiert das Event).
    const aggregateResult = Gefaehrdungsbeurteilung.create({
      einsatzId: command.einsatzId,
      einheitId: command.einheitId,
      createdBy: command.createdBy,
      vorlageId: command.vorlageId,
      gefahrenzoneId: command.gefahrenzoneId,
      items,
    });
    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail<string>(aggregateResult.error ?? 'Aggregate konnte nicht erstellt werden');
    }
    const aggregate = aggregateResult.value;

    // Step 4 — Aggregate persistieren.
    const saveResult = await this.beurteilungRepo.save(aggregate, tx);
    if (saveResult.isFailure) {
      return Result.fail<string>(saveResult.error ?? 'Gefährdungsbeurteilung konnte nicht gespeichert werden');
    }

    // Step 5 — Initiale Version-Zeile (append-only) mit Event-ID-Bindung.
    const events = aggregate.getDomainEvents();
    const erstelltEvent = events.find((event) => event instanceof GefaehrdungsbeurteilungErstelltEvent) as GefaehrdungsbeurteilungErstelltEvent | undefined;
    if (!erstelltEvent) {
      return Result.fail<string>('GefaehrdungsbeurteilungErstelltEvent fehlt');
    }

    const versionResult = await this.versionRepo.saveInitialVersion(
      {
        gefBeurteilungId: aggregate.id.value,
        version: aggregate.version,
        items,
        changedFields: { created: true },
        gueltigVon: erstelltEvent.occurredAt,
        changedByUserId: command.createdBy,
        eventId: erstelltEvent.eventId,
      },
      tx,
    );
    if (versionResult.isFailure) {
      return Result.fail<string>(versionResult.error ?? 'Initiale Version konnte nicht gespeichert werden');
    }

    this.logger.log('Gefährdungsbeurteilung erstellt', {
      gefaehrdungsbeurteilungId: aggregate.id.value,
      einsatzId: command.einsatzId,
      einheitId: command.einheitId,
      vorlageId: command.vorlageId,
      itemCount: items.length,
    });

    return { result: aggregate.id.value, events };
  }
}
