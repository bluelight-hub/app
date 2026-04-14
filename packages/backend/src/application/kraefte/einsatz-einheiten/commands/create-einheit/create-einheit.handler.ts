import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { EinsatzEinheit } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IDefaultZeichenRepository } from '@domain/taktische-zeichen/ports/idefault-zeichen.repository';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import type { ZeichenDefinitionProps } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, TAKTISCHE_ZEICHEN_REPOSITORY, DEFAULT_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { CreateEinheitCommand } from './create-einheit.command';

/** Mapping von EinsatzEinheitTyp → taktische-zeichen-core EinheitId */
const EINHEIT_TYP_ZU_ZEICHEN_EINHEIT: Record<string, string> = {
  TRUPP: 'trupp',
  STAFFEL: 'staffel',
  GRUPPE: 'gruppe',
  ZUG: 'zug',
  ABSCHNITT: 'abschnitt',
};

/**
 * Handler für CreateEinheitCommand.
 *
 * Erstellt eine neue taktische Einheit in einem Einsatz.
 * Delegiert die Erstellung an EinsatzEinheit.create() (Domain Layer)
 * und persistiert das Aggregate atomar mit Events (Outbox Pattern).
 *
 * **Return:** string (neue Einheit-ID)
 */
@Injectable()
export class CreateEinheitHandler extends TransactionalCommandHandler<CreateEinheitCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischesZeichenRepository: ITaktischesZeichenRepository,
    @Inject(DEFAULT_ZEICHEN_REPOSITORY)
    private readonly defaultZeichenRepository: IDefaultZeichenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Erstellt eine neue EinsatzEinheit innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. EinsatzEinheit.create() mit Command-Daten
   * 2. Aggregate in Transaction speichern
   * 3. Domain Events extrahieren für Outbox
   *
   * @param command - CreateEinheitCommand mit Einheiten-Daten
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Einheit-ID oder Fehler
   */
  protected async executeInTransaction(command: CreateEinheitCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. EinsatzEinheit Aggregate erstellen
    const aggregateResult = EinsatzEinheit.create({
      einsatzId: command.einsatzId,
      name: command.name,
      typ: command.typ as 'TRUPP' | 'STAFFEL' | 'GRUPPE' | 'ZUG' | 'ABSCHNITT',
      funktion: command.funktion,
      parentId: command.parentId,
      sollStaerke: command.sollStaerke,
      auftrag: command.auftrag,
      einsatzort: command.einsatzort,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen der Einheit');
    }
    const einheit = aggregateResult.value;

    // 2. Aggregate in Transaction speichern
    const saveResult = await this.einsatzEinheitRepository.save(einheit, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Einheit');
    }

    // 3. Default-Zeichen synchron in derselben Transaktion erstellen
    try {
      // Default-Zeichendefinition für den Einheitentyp laden
      const defaultsResult = await this.defaultZeichenRepository.findAllEinheitentypen();
      let zeichenDefProps: ZeichenDefinitionProps = {
        grundzeichen: 'taktische-formation',
        einheit: EINHEIT_TYP_ZU_ZEICHEN_EINHEIT[command.typ],
      };

      // DB-Default überschreibt den Fallback
      if (defaultsResult.isSuccess && defaultsResult.value) {
        const match = defaultsResult.value.find((d) => d.typBezeichnung === command.typ);
        if (match) {
          zeichenDefProps = match.zeichenDefinition.toJson();
        }
      }

      const zeichenDefResult = ZeichenDefinition.create(zeichenDefProps);
      if (zeichenDefResult.isSuccess && zeichenDefResult.value) {
        const zeichenResult = TaktischesZeichen.create({
          einsatzId: command.einsatzId,
          zeichenDefinition: zeichenDefResult.value,
          referenzTyp: 'EINHEIT',
          referenzId: einheit.id.value,
          label: command.name,
          istAusKatalog: false,
          createdBy: command.createdBy,
        });

        if (zeichenResult.isSuccess && zeichenResult.value) {
          const saveZeichenResult = await this.taktischesZeichenRepository.save(zeichenResult.value, tx);
          if (saveZeichenResult.isSuccess) {
            this.logger.log(`Default-Zeichen für Einheit ${einheit.id.value} (${einheit.name}) erstellt`);
          } else {
            this.logger.error(`Fehler beim Speichern des Default-Zeichens: ${saveZeichenResult.error}`);
          }
        }
      }
    } catch (error) {
      // Zeichen-Erstellung darf Einheit-Erstellung nicht blockieren
      this.logger.error(`Fehler beim Erstellen des Default-Zeichens für Einheit ${einheit.id.value}: ${String(error)}`);
    }

    // 4. Domain Events extrahieren (für Outbox)
    const events = einheit.getDomainEvents();
    einheit.clearDomainEvents();

    this.logger.log(`EinsatzEinheit erstellt: ${einheit.id.value} (${einheit.name}) für Einsatz ${command.einsatzId}`);

    return { result: einheit.id.value, events };
  }
}
