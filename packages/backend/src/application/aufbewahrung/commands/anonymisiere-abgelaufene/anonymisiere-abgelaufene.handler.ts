import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { BefehlAnonymisiertEvent } from '@domain/events/befehl-anonymisiert.event';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IAufbewahrungsKonfigurationRepository } from '@/application/aufbewahrung/ports/i-aufbewahrungs-konfiguration.repository';
import { AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY } from '@infrastructure/di-tokens';
import { ComplianceReportService } from '@/application/aufbewahrung/services/compliance-report.service';
import { AnonymisiereAbgelaufeneCommand } from './anonymisiere-abgelaufene.command';

/**
 * Anonymisierungs-Ergebnis pro Einsatz.
 */
interface AnonymisierungsErgebnis {
  einsatzId: string;
  befehlCount: number;
  empfaengerCount: number;
  kommentarCount: number;
}

/**
 * Handler fuer AnonymisiereAbgelaufeneCommand.
 *
 * Laedt alle Befehle deren Einsatz-Aufbewahrungsfrist abgelaufen ist,
 * anonymisiert personenbezogene Daten (DSGVO) und erstellt Compliance-Reports.
 *
 * @remarks Story 5.5 AC2
 */
@Injectable()
export class AnonymisiereAbgelaufeneHandler extends TransactionalCommandHandler<AnonymisiereAbgelaufeneCommand, AnonymisierungsErgebnis[]> {
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

  protected async executeInTransaction(
    command: AnonymisiereAbgelaufeneCommand,
    tx: TransactionContext,
  ): Promise<Result<AnonymisierungsErgebnis[]> | { result: AnonymisierungsErgebnis[]; events: DomainEvent[] }> {
    // 1. Konfiguration laden
    const konfigResult = await this.konfigurationRepository.find(tx);
    if (konfigResult.isFailure) {
      return Result.fail(konfigResult.error ?? 'Konfiguration konnte nicht geladen werden');
    }
    const konfig = konfigResult.value ?? AufbewahrungsKonfiguration.default();

    // 2. Cutoff-Datum berechnen (heute - Aufbewahrungsfrist)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - konfig.aufbewahrungsfristJahre);

    // 3. Abgelaufene Befehle laden
    const abgelaufeneResult = await this.befehlRepository.findAbgelaufene(cutoffDate, tx);
    if (abgelaufeneResult.isFailure) {
      return Result.fail(abgelaufeneResult.error ?? 'Abgelaufene Befehle konnten nicht geladen werden');
    }
    const abgelaufene = abgelaufeneResult.value ?? [];

    if (abgelaufene.length === 0) {
      return { result: [], events: [] };
    }

    // 4. Befehle nach Einsatz gruppieren
    const nachEinsatz = new Map<string, typeof abgelaufene>();
    for (const befehl of abgelaufene) {
      const einsatzId = befehl.einsatzId.value;
      if (!nachEinsatz.has(einsatzId)) {
        nachEinsatz.set(einsatzId, []);
      }
      nachEinsatz.get(einsatzId)!.push(befehl);
    }

    // 5. Pro Einsatz anonymisieren
    const ergebnisse: AnonymisierungsErgebnis[] = [];
    const events: DomainEvent[] = [];

    for (const [einsatzId, befehle] of nachEinsatz) {
      // Per-Einsatz Salt: nicht gespeichert → echte Anonymisierung (Review-Fix C2)
      const salt = randomBytes(16).toString('hex');

      let gesamtEmpfaenger = 0;
      let gesamtKommentare = 0;

      for (const befehl of befehle) {
        const anonymResult = befehl.anonymisiere(salt);
        if (anonymResult.isSuccess && anonymResult.value) {
          gesamtEmpfaenger += anonymResult.value.empfaengerCount;
          gesamtKommentare += anonymResult.value.kommentarCount;
        }
      }

      // Bulk-Update in DB
      const firstBefehl = befehle[0]!;
      const bulkResult = await this.befehlRepository.bulkAnonymisiere(firstBefehl.einsatzId, befehle, tx);
      if (bulkResult.isFailure) {
        return Result.fail(bulkResult.error ?? `Anonymisierung fuer Einsatz ${einsatzId} fehlgeschlagen`);
      }

      const ergebnis: AnonymisierungsErgebnis = {
        einsatzId,
        befehlCount: befehle.length,
        empfaengerCount: gesamtEmpfaenger,
        kommentarCount: gesamtKommentare,
      };
      ergebnisse.push(ergebnis);

      // Compliance-Report erstellen
      await this.complianceReportService.erstelleAnonymisierungsReport(ergebnis, command.durchgefuehrtVon, tx);

      // Event pro Einsatz
      events.push(new BefehlAnonymisiertEvent(firstBefehl.einsatzId, befehle.length, gesamtEmpfaenger, gesamtKommentare, new Date(), einsatzId));
    }

    return { result: ergebnisse, events };
  }
}
