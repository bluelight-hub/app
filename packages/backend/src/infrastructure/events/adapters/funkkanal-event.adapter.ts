/**
 * Infrastructure Adapter: empfängt Funkkanal Domain Events und leitet sie
 * an den `IEinsatzEventPublisher` weiter (WebSocket-Broadcast an den
 * Einsatz-Room `einsatz:{id}`).
 *
 * Solange der `EinsatzEventPublisher` noch nicht registriert ist (Task 18 baut
 * das WebSocket-Gateway), ist die Injection optional — der Adapter loggt nur.
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { EINSATZ_EVENT_PUBLISHER } from '@infrastructure/di-tokens';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import type { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import type { FunkkanalArchiviertEvent } from '@domain/events/funkkanal-archiviert.event';
import type { FunkkanalReihenfolgeGeaendertEvent } from '@domain/events/funkkanal-reihenfolge-geaendert.event';
import type { FunkkanalZuordnungErstelltEvent } from '@domain/events/funkkanal-zuordnung-erstellt.event';
import type { FunkkanalZuordnungEntferntEvent } from '@domain/events/funkkanal-zuordnung-entfernt.event';
import type { NotfallAlertRequestedEvent } from '@domain/events/notfall-alert-requested.event';

/**
 * Port-Interface für den WebSocket-Publisher eines Einsatz-Rooms.
 *
 * Die konkrete Implementation wird in Task 18 (`EinsatzEventsGateway`) geliefert.
 */
export interface IEinsatzEventPublisher {
  broadcast(einsatzId: string, channel: string, payload: Record<string, unknown>): Promise<void> | void;
}

@Injectable()
export class FunkkanalEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Optional() @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher?: IEinsatzEventPublisher,
  ) {}

  @OnEvent(EVENT_NAMES.FUNKKANAL.ERSTELLT)
  async onErstellt(event: FunkkanalErstelltEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funkkanal:erstellt', {
      kanalId: event.funkkanalId.value,
      einsatzId: event.einsatzId.value,
      ...event.data,
    });
  }

  @OnEvent(EVENT_NAMES.FUNKKANAL.GEAENDERT)
  async onGeaendert(event: FunkkanalGeaendertEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funkkanal:geaendert', {
      kanalId: event.funkkanalId.value,
      einsatzId: event.einsatzId.value,
      changedFields: event.changedFields,
    });
  }

  @OnEvent(EVENT_NAMES.FUNKKANAL.ARCHIVIERT)
  async onArchiviert(event: FunkkanalArchiviertEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funkkanal:archiviert', {
      kanalId: event.funkkanalId.value,
      einsatzId: event.einsatzId.value,
    });
  }

  @OnEvent(EVENT_NAMES.FUNKKANAL.REIHENFOLGE_GEAENDERT)
  async onReihenfolgeGeaendert(event: FunkkanalReihenfolgeGeaendertEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funkkanal:reihenfolge-geaendert', {
      einsatzId: event.einsatzId.value,
      ordering: event.ordering,
    });
  }

  @OnEvent(EVENT_NAMES.FUNKKANAL.ZUORDNUNG_ERSTELLT)
  async onZuordnungErstellt(event: FunkkanalZuordnungErstelltEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funkkanal:zuordnung-erstellt', {
      kanalId: event.funkkanalId.value,
      einsatzId: event.einsatzId.value,
      zuordnungId: event.zuordnungId.value,
      kraftRef: event.kraftRef,
      rufnameSnapshot: event.rufnameSnapshot,
      rolle: event.rolle,
    });
  }

  @OnEvent(EVENT_NAMES.FUNKKANAL.ZUORDNUNG_ENTFERNT)
  async onZuordnungEntfernt(event: FunkkanalZuordnungEntferntEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funkkanal:zuordnung-entfernt', {
      kanalId: event.funkkanalId.value,
      einsatzId: event.einsatzId.value,
      zuordnungId: event.zuordnungId.value,
    });
  }

  @OnEvent(EVENT_NAMES.FUNK.NOTFALL_ALERT_REQUESTED)
  async onNotfall(event: NotfallAlertRequestedEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'funk:notfall-alert', {
      einsatzId: event.einsatzId.value,
      kanalId: event.funkkanalId.value,
      funkspruchEintragId: event.funkspruchEintragId.value,
      text: event.text,
      absender: event.absender ?? null,
    });
  }

  private async emit(einsatzId: string, channel: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher) {
      this.logger.log(`FunkkanalEventAdapter: kein Publisher verfügbar — Event "${channel}" (Einsatz ${einsatzId}) wird nur geloggt.`, 'FunkkanalEventAdapter');
      return;
    }
    try {
      await this.publisher.broadcast(einsatzId, channel, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`FunkkanalEventAdapter.broadcast(${channel}) fehlgeschlagen: ${msg}`, 'FunkkanalEventAdapter');
    }
  }
}
