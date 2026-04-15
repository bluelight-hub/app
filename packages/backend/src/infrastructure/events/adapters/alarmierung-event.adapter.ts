/**
 * Infrastructure Adapter: empfängt Alarmierung-Domain-Events und leitet sie
 * an den `IEinsatzEventPublisher` weiter (WebSocket-Broadcast an den
 * Einsatz-Room `einsatz:{id}`).
 *
 * Der Publisher ist `@Optional()` — solange das WebSocket-Gateway nicht
 * registriert ist, loggt der Adapter nur und läuft sauber weiter.
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import type { AlarmierungEmpfaengerEntferntEvent } from '@domain/events/alarmierung-empfaenger-entfernt.event';
import type { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import type { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import type { AlarmierungZeitpunktFmsGesetztEvent } from '@domain/events/alarmierung-zeitpunkt-fms-gesetzt.event';
import type { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import type { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';
import type { EinsatzEventName, IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';

/**
 * Broadcastet Alarmierungs-Events auf `alarmierung:*`-Channels des
 * einsatzgebundenen WebSocket-Rooms.
 */
@Injectable()
export class AlarmierungEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Optional() @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher?: IEinsatzEventPublisher,
  ) {}

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ERSTELLT)
  async onErstellt(event: AlarmierungErstelltEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:erstellt', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      bezeichnung: event.data.bezeichnung,
      beschreibung: event.data.beschreibung ?? null,
      alarmierungszeit: event.data.alarmierungszeit.toISOString(),
      ursprungAlarmierungId: event.data.ursprungAlarmierungId ?? null,
      empfaengerCount: event.data.empfaengerCount,
    });
  }

  @OnEvent(EVENT_NAMES.ALARMIERUNG.EMPFAENGER_HINZUGEFUEGT)
  async onEmpfaengerHinzugefuegt(event: AlarmierungEmpfaengerHinzugefuegtEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:empfaenger-hinzugefuegt', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      empfaengerId: event.data.empfaengerId.value,
      ref: event.data.ref,
      nameSnapshot: event.data.nameSnapshot,
      alarmiertAm: event.data.alarmiertAm.toISOString(),
    });
  }

  @OnEvent(EVENT_NAMES.ALARMIERUNG.EMPFAENGER_ENTFERNT)
  async onEmpfaengerEntfernt(event: AlarmierungEmpfaengerEntferntEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:empfaenger-entfernt', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      empfaengerId: event.data.empfaengerId.value,
      nameSnapshot: event.data.nameSnapshot,
    });
  }

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ZEITPUNKT_KORRIGIERT)
  async onZeitpunktKorrigiert(event: AlarmierungZeitpunktKorrigiertEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:zeitpunkt-korrigiert', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      empfaengerId: event.data.empfaengerId.value,
      nameSnapshot: event.data.nameSnapshot,
      feld: event.data.feld,
      alterWert: event.data.alterWert?.toISOString() ?? null,
      neuerWert: event.data.neuerWert?.toISOString() ?? null,
      korrigiertVon: event.data.korrigiertVon,
    });
  }

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ZEITPUNKT_FMS_GESETZT)
  async onZeitpunktFmsGesetzt(event: AlarmierungZeitpunktFmsGesetztEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:zeitpunkt-fms-gesetzt', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      empfaengerId: event.data.empfaengerId.value,
      nameSnapshot: event.data.nameSnapshot,
      feld: event.data.feld,
      wert: event.data.wert.toISOString(),
      fmsStatus: event.data.fmsStatus,
    });
  }

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ABGESCHLOSSEN)
  async onAbgeschlossen(event: AlarmierungAbgeschlossenEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:abgeschlossen', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      abgeschlossenVon: event.abgeschlossenVon,
    });
  }

  @OnEvent(EVENT_NAMES.ALARMIERUNG.NACHALARMIERUNG_ERSTELLT)
  async onNachalarmierungErstellt(event: NachalarmierungErstelltEvent): Promise<void> {
    await this.emit(event.einsatzId.value, 'alarmierung:nachalarmierung-erstellt', {
      alarmierungId: event.alarmierungId.value,
      einsatzId: event.einsatzId.value,
      bezeichnung: event.data.bezeichnung,
      ursprungAlarmierungId: event.data.ursprungAlarmierungId.value,
    });
  }

  private async emit(einsatzId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher) {
      this.logger.log(`AlarmierungEventAdapter: kein Publisher verfügbar — Event "${channel}" (Einsatz ${einsatzId}) wird nur geloggt.`, 'AlarmierungEventAdapter');
      return;
    }
    try {
      await this.publisher.broadcast(einsatzId, channel, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AlarmierungEventAdapter.broadcast(${channel}) fehlgeschlagen: ${msg}`, 'AlarmierungEventAdapter');
    }
  }
}
