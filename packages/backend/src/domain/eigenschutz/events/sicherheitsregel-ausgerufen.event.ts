import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Feld-Schlüssel für das `updated`-Array in `SicherheitsregelAusgerufenChangedFields`.
 *
 * Epic 2.6 definiert drei mutable Felder: `titel`, `inhalt`, `einheitId`. Andere
 * Felder (z. B. `version`, `aktualisiertAm`) werden server-seitig ableitet und
 * sind daher kein Diff-Signal.
 */
export type SicherheitsregelFieldKey = 'titel' | 'inhalt' | 'einheitId';

/**
 * ChangedFields-Payload für `SicherheitsregelAusgerufenEvent`.
 *
 * Drei orthogonale Modi — ein Event trägt immer genau eines:
 * - `created: true` — initiale Version nach `Sicherheitsregel.create()` (Story 2.6 AC2)
 * - `updated: SicherheitsregelFieldKey[]` — Titel/Inhalt/Einheit geändert (Story 2.6 AC3)
 * - `deprecated: true` — logische Abkündigung im Re-Wire-Pfad ohne neue aktive
 *   Version (Story 2.6 AC4); `version` bleibt beim Deprecate unverändert
 *
 * Spätere Consumer (Story 2.7 ACK, Epic 6.1 Ampel) konsumieren die Felder
 * ohne DB-Roundtrip — das Event ist self-sufficient (analog zu
 * `GefaehrdungsbeurteilungAktualisiertChangedFields`, Story 2.3 AC3).
 */
export interface SicherheitsregelAusgerufenChangedFields {
  /** True bei initialer Create-Emission (Version 1). */
  created?: boolean;
  /** Liste der geänderten Felder im Update-Pfad (Version N → N+1). */
  updated?: SicherheitsregelFieldKey[];
  /** True wenn die Regel logisch abgekündigt wurde (Re-Wire-Pfad, AC4). */
  deprecated?: boolean;
}

/**
 * Domain-Event — „Sicherheitsregel ausgerufen / aktualisiert / abgekündigt"
 * (Story 2.6).
 *
 * Wird vom `CreateSicherheitsregelHandler` und `UpdateSicherheitsregelHandler`
 * atomar mit dem Aggregate persistiert (Transactional Outbox Pattern, ADR-006).
 *
 * **Propagation-Gruppen-Identität (Story 2.6 AC2/AC4):** Alle Rows, die aus
 * einem logischen „Regel an mehrere Einheiten"-Create-/Re-Wire-Aufruf
 * entstehen, tragen dieselbe `propagationGroupId` (cuid2, pro Aufruf einmal
 * generiert). Die ID lebt bewusst **nur im Event-Payload**, nicht im Prisma-
 * Schema — spätere Consumer (Story 2.7 ACK, Epic 6.1 Ampel) lesen die Gruppe
 * aus dem Event-Stream.
 *
 * **fromVersion-Semantik:**
 * - `null` → Create-Emission (Version 1)
 * - `n (n≥1)` → Update-Emission (`n → n+1`) oder Deprecate-Emission (`n → n`
 *   bei logischer Abkündigung; `toVersion === fromVersion`)
 */
export class SicherheitsregelAusgerufenEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string | undefined,
    public readonly regelId: string,
    public readonly propagationGroupId: string,
    public readonly fromVersion: number | null,
    public readonly toVersion: number,
    public readonly changedFields: SicherheitsregelAusgerufenChangedFields,
    public readonly titel: string,
    public readonly inhalt: string,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? regelId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.SICHERHEITSREGEL_AUSGERUFEN;
  }
}
