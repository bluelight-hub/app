import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { BefehlGeloeschtEvent } from '@domain/events/befehl-geloescht.event';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IAufbewahrungsKonfigurationRepository } from '@/application/aufbewahrung/ports/i-aufbewahrungs-konfiguration.repository';
import { AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY } from '@infrastructure/di-tokens';
import { ComplianceReportService } from '@/application/aufbewahrung/services/compliance-report.service';
import { LoescheAnonymisierteCommand } from './loesche-anonymisierte.command';

/**
 * Loeschungs-Ergebnis pro Einsatz.
 */
interface LoeschungsErgebnis {
  einsatzId: string;
  befehlCount: number;
}

/**
 * Handler fuer LoescheAnonymisierteCommand.
 *
 * Findet anonymisierte Befehle deren Freigabeperiode abgelaufen ist
 * und markiert sie als soft-deleted. Erstellt Compliance-Reports.
 *
 * **AC3 Exception: Prisma Direct Query fuer findAnonymisierte.**
 * IBefehlRepository hat keine findAnonymisierte Methode, da dies ein
 * reiner DSGVO-Infrastruktur-Concern ist. Wir nutzen die bereits
 * verfuegbare bulkSoftDelete Repository-Methode fuer das eigentliche Delete.
 *
 * @remarks Story 5.5 AC3
 */
@Injectable()
export class LoescheAnonymisierteHandler extends TransactionalCommandHandler<LoescheAnonymisierteCommand, LoeschungsErgebnis[]> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(BEFEHL_REPOSITORY)
    private readonly befehlRepository: IBefehlRepository,
    @Inject(AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY)
    private readonly konfigurationRepository: IAufbewahrungsKonfigurationRepository,
    private readonly complianceReportService: ComplianceReportService,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: LoescheAnonymisierteCommand, tx: TransactionContext): Promise<Result<LoeschungsErgebnis[]> | { result: LoeschungsErgebnis[]; events: DomainEvent[] }> {
    // 1. Konfiguration laden
    const konfigResult = await this.konfigurationRepository.find(tx);
    if (konfigResult.isFailure) {
      return Result.fail(konfigResult.error ?? 'Konfiguration konnte nicht geladen werden');
    }
    const konfig = konfigResult.value ?? AufbewahrungsKonfiguration.default();

    // 2. Cutoff-Datum: anonymisiertAm + Freigabeperiode < heute
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - konfig.freigabeperiodeTage);

    // 3. Anonymisierte, nicht-geloeschte Befehle finden (Prisma Direct Query innerhalb TX)
    // Cast tx zu Prisma TransactionClient (Controlled Coupling, wie in Base Class)
    const prismaTx = tx as unknown as PrismaService;
    const anonymisierte = await prismaTx.befehl.findMany({
      where: {
        anonymisiertAm: { not: null, lte: cutoffDate },
        isDeleted: false,
      },
      select: {
        id: true,
        einsatzId: true,
      },
    });

    if (anonymisierte.length === 0) {
      return { result: [], events: [] };
    }

    // 4. Nach Einsatz gruppieren
    const nachEinsatz = new Map<string, string[]>();
    for (const befehl of anonymisierte) {
      if (!nachEinsatz.has(befehl.einsatzId)) {
        nachEinsatz.set(befehl.einsatzId, []);
      }
      nachEinsatz.get(befehl.einsatzId)?.push(befehl.id);
    }

    // 5. Pro Einsatz soft-deleten via Repository
    const ergebnisse: LoeschungsErgebnis[] = [];
    const events: DomainEvent[] = [];

    for (const [einsatzIdStr, befehlIds] of nachEinsatz) {
      const einsatzIdResult = EinsatzId.create(einsatzIdStr);
      if (einsatzIdResult.isFailure) {
        continue;
      }
      const einsatzId = einsatzIdResult.value as EinsatzId;

      // Bulk Soft-Delete via Repository
      const deleteResult = await this.befehlRepository.bulkSoftDelete(einsatzId, command.durchgefuehrtVon, tx);
      if (deleteResult.isFailure) {
        return Result.fail(deleteResult.error ?? `Loeschung fuer Einsatz ${einsatzIdStr} fehlgeschlagen`);
      }

      const ergebnis: LoeschungsErgebnis = {
        einsatzId: einsatzIdStr,
        befehlCount: befehlIds.length,
      };
      ergebnisse.push(ergebnis);

      // Compliance-Report erstellen
      await this.complianceReportService.erstelleLoeschungsReport(ergebnis, command.durchgefuehrtVon, tx);

      // Event pro Einsatz
      events.push(new BefehlGeloeschtEvent(einsatzId, befehlIds.length, new Date(), einsatzIdStr));
    }

    return { result: ergebnisse, events };
  }
}
