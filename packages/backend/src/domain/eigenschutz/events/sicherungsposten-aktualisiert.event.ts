import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Top-Level-Felder, deren Diff-Status im `changedFields`-Audit erfasst wird.
 *
 * `aufgeloest` ist ein synthetisches Boolean-Flag, das beim Aufloesen-Übergang
 * gesetzt wird (statt einer eigenen Event-Klasse — die Resolution ist
 * fachlich ein Update mit Begründung).
 */
export type SicherungspostenFieldKey = 'bezeichnung' | 'standort' | 'personal' | 'einheitId' | 'zustaendigkeitsbereich' | 'abloesezeiten' | 'aufgeloest';

/**
 * Strukturiertes Per-Field-Diff einer Sicherungsposten-Änderung. `changed` ist
 * die ungeordnete Menge der Top-Level-Felder, deren neuer Wert vom alten
 * abweicht; `aufgeloest = true` markiert das Aufloesen-Sentinel im Diff.
 *
 * Das Diff bleibt absichtlich grobgranular (kein Inhalt, nur Schlüssel-Set)
 * — Konsumenten wie Telemetrie/Audit zählen Anzahl und Art der Änderungen,
 * holen aber Detail-State via Repository.
 */
export interface SicherungspostenAktualisiertChangedFields {
  changed: SicherungspostenFieldKey[];
  aufgeloest?: boolean;
}

/**
 * Domain-Event — „Sicherungsposten wurde aktualisiert" (Story 4.1).
 *
 * Wird im `UpdateSicherungspostenHandler` und `AufloeseSicherungspostenHandler`
 * atomar mit dem Aggregate persistiert (Transactional Outbox Pattern).
 *
 * `fromVersion`/`toVersion` spiegeln den Optimistic-Concurrency-Übergang —
 * `toVersion === fromVersion + 1` ist Invariante (vom Aggregate erzwungen).
 */
export class SicherungspostenAktualisiertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    public readonly sicherungspostenId: string,
    public readonly fromVersion: number,
    public readonly toVersion: number,
    public readonly changedFields: SicherungspostenAktualisiertChangedFields,
    einheitId?: string,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? sicherungspostenId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.SICHERUNGSPOSTEN_AKTUALISIERT;
  }
}
