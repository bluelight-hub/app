/**
 * Befehl Domain Metriken Service.
 *
 * Lauscht auf Befehl Domain Events und inkrementiert Prometheus Counters.
 * Fire-and-Forget: Metriken-Fehler blockieren NICHT den Domain-Flow.
 *
 * @remarks Story 5.6 AC1
 * @module infrastructure/metrics
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Counter } from 'prom-client';
import { EVENT_NAMES } from '@domain/events/event-names';
import { METRICS } from '@infrastructure/di-tokens';

@Injectable()
export class BefehlMetricsService {
  constructor(
    @Inject(METRICS.BEFEHL_ERSTELLT_COUNTER) private readonly erstelltCounter: Counter,
    @Inject(METRICS.BEFEHL_QUITTIERT_COUNTER) private readonly quittiertCounter: Counter,
    @Inject(METRICS.BEFEHL_KORRIGIERT_COUNTER) private readonly korrigiertCounter: Counter,
  ) {}

  /**
   * Inkrementiert den Erstellt-Counter bei Befehl-Erstellung.
   */
  @OnEvent(EVENT_NAMES.BEFEHL.ERSTELLT)
  handleBefehlErstellt(): void {
    this.erstelltCounter.inc();
  }

  /**
   * Inkrementiert den Quittiert-Counter bei Befehl-Quittierung.
   */
  @OnEvent(EVENT_NAMES.BEFEHL.QUITTIERT)
  handleBefehlQuittiert(): void {
    this.quittiertCounter.inc();
  }

  /**
   * Inkrementiert den Korrigiert-Counter bei Status-Aenderung zu KORRIGIERT.
   *
   * Prueft den newStatus des BefehlStatusGeaendertEvent, da es kein
   * dediziertes KORRIGIERT-Event gibt.
   */
  @OnEvent(EVENT_NAMES.BEFEHL.STATUS_GEAENDERT)
  handleBefehlStatusGeaendert(event: { newStatus: { value: string } }): void {
    if (event.newStatus.value === 'KORRIGIERT') {
      this.korrigiertCounter.inc();
    }
  }
}
