import { Inject, Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPsaPropagationOverdueQueryPort } from '@domain/eigenschutz/repositories/i-psa-propagation-overdue-query.port';
import { LOGGER, PSA_PROPAGATION_OVERDUE_QUERY } from '@infrastructure/di-tokens';
import { EmitPsaQuittungUeberfaelligCommand } from '@application/eigenschutz/commands/emit-psa-quittung-ueberfaellig/emit-psa-quittung-ueberfaellig.command';

/**
 * Scheduler — sucht alle 30 s nach überfälligen PSA-Bekanntgaben
 * (> 5 min ohne Quittung) und dispatched pro Treffer einen
 * `EmitPsaQuittungUeberfaelligCommand` (Story 3.7 AC3, AR12, UX-DR20).
 *
 * **Idempotenz-Strategie:** Die Query-Schicht (AC2 `findUnacknowledgedPsa-
 * Propagations`) filtert per `NOT EXISTS`-SQL-Subquery solche Paare aus,
 * für die ein `QuittungUeberfaelligEvent` bereits emittiert wurde. Daher
 * sind zwei parallele Job-Läufe (z. B. nach Pod-Restart) nicht-blockierend
 * und produzieren keine Duplikate. Defense-in-Depth im Handler (AC4 Step 1).
 *
 * **Threshold:** 5 Minuten — als Modul-Konstante (KEIN Konfigurations-
 * Endpoint im MVP — Phase 2 könnte das pro Einsatz konfigurierbar machen).
 *
 * **Limit:** 100 Treffer pro Tick. Backlog wird über folgende 30-s-Ticks
 * abgearbeitet. Bei Treffer-Count ≥ 80 wird Loglevel `log` ausgegeben
 * (Sichtbarkeit für SRE).
 *
 * **Robustness:** Fehler bei einzelnen Command-Dispatchen stoppen NICHT
 * den Tick — Pattern aus `ErinnerungEskalationsScheduler`.
 */
@Injectable()
export class RepromptPsaQuittungScheduler {
  private static readonly OVERDUE_THRESHOLD_MIN = 5;
  private static readonly LIMIT_PER_TICK = 100;
  private static readonly BACKLOG_WARN_THRESHOLD = 80;
  private readonly instanceId = Math.random().toString(36).slice(2, 10);
  // Single-Pod-Tick-Overlap-Guard: bei Backlog > LIMIT + DB-Last kann ein Tick
  // länger als 30 s dauern; ohne Guard liefen zwei Ticks parallel über
  // dieselben überfälligen Rows. Multi-Pod-Hardening (Postgres-Advisory-Lock)
  // ist eigene Story — siehe deferred-work.md (Story 3.7 Code-Review).
  private running = false;

  constructor(
    @Inject(PSA_PROPAGATION_OVERDUE_QUERY)
    private readonly overdueQuery: IPsaPropagationOverdueQueryPort,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    try {
      const jobs = this.schedulerRegistry.getCronJobs();
      this.logger.log(`[${this.instanceId}] PSA-Reprompt-Cron registered: ${[...jobs.keys()].join(', ')}`, RepromptPsaQuittungScheduler.name);
    } catch (e) {
      this.logger.error(`Failed to enumerate CronJobs: ${e instanceof Error ? e.message : String(e)}`, RepromptPsaQuittungScheduler.name);
    }
  }

  /**
   * Cron-Expression: alle 30 Sekunden (`*\/30 * * * * *`, 6-Felder-Format
   * weil sekundengenau).
   */
  @Cron('*/30 * * * * *', { name: 'psa-quittung-reprompt' })
  async handleCron(): Promise<void> {
    if (this.running) {
      this.logger.debug?.(`[${this.instanceId}] PSA-Reprompt-Tick: vorheriger Tick noch aktiv — skip`, RepromptPsaQuittungScheduler.name);
      return;
    }
    this.running = true;
    try {
      await this.runTick();
    } finally {
      this.running = false;
    }
  }

  private async runTick(): Promise<void> {
    const now = new Date();
    const threshold = new Date(now.getTime() - RepromptPsaQuittungScheduler.OVERDUE_THRESHOLD_MIN * 60 * 1000);

    const result = await this.overdueQuery.findUnacknowledgedPsaPropagations(threshold, RepromptPsaQuittungScheduler.LIMIT_PER_TICK);
    if (result.isFailure) {
      this.logger.error(`PSA-Reprompt-Query fehlgeschlagen: ${result.error}`, RepromptPsaQuittungScheduler.name);
      return;
    }
    const overdue = result.value ?? [];
    if (overdue.length === 0) return;

    if (overdue.length === RepromptPsaQuittungScheduler.LIMIT_PER_TICK) {
      this.logger.warn(`PSA-Reprompt: Limit-Cap erreicht (${overdue.length}/${RepromptPsaQuittungScheduler.LIMIT_PER_TICK}) — echter Backlog ist potenziell höher`, RepromptPsaQuittungScheduler.name);
    } else if (overdue.length >= RepromptPsaQuittungScheduler.BACKLOG_WARN_THRESHOLD) {
      this.logger.log(`PSA-Reprompt: hoher Backlog (${overdue.length}/${RepromptPsaQuittungScheduler.LIMIT_PER_TICK})`, RepromptPsaQuittungScheduler.name);
    }

    let success = 0;
    let failure = 0;
    for (const row of overdue) {
      try {
        const occurredMs = row.occurredAt.getTime();
        if (Number.isNaN(occurredMs)) {
          failure++;
          this.logger.error(`PSA-Reprompt-Dispatch skipped (origEventId=${row.originalEventId}): occurredAt invalid`, RepromptPsaQuittungScheduler.name);
          continue;
        }
        const deltaMin = Math.floor((now.getTime() - occurredMs) / 60_000);
        if (deltaMin < 0) {
          this.logger.warn(`PSA-Reprompt: negative ueberfaelligSeitMin (${deltaMin}) — Clock-Skew vermutet, gewählt 0`, RepromptPsaQuittungScheduler.name);
        }
        const ueberfaelligSeitMin = Math.max(0, deltaMin);
        await this.commandBus.execute(new EmitPsaQuittungUeberfaelligCommand(row.einsatzId, row.einheitId, row.propagationGroupId, row.originalEventId, ueberfaelligSeitMin, row.zuweisungId));
        success++;
      } catch (err) {
        failure++;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`PSA-Reprompt-Dispatch failed (origEventId=${row.originalEventId}): ${msg}`, RepromptPsaQuittungScheduler.name);
      }
    }

    if (success > 0 || failure > 0) {
      this.logger.log(`PSA-Reprompt-Tick: ${success} dispatched, ${failure} failed`, RepromptPsaQuittungScheduler.name);
    }
  }
}
