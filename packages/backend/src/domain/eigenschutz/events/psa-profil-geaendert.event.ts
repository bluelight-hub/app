import { EVENT_NAMES } from '@domain/events/event-names';
import type { PsaProfil } from '@/generated/prisma/enums';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Aktion-Literal für `PsaProfilGeaendertEvent` — beschreibt, ob das Toggle
 * eine Aktivierung (neue `PsaProfilZuweisung`-Row mit `gueltigBis = NULL`)
 * oder eine Deaktivierung (bestehende Row geschlossen mit `gueltigBis = now()`)
 * war. Wechsel von Profil A → B in einem Command emittiert ZWEI Events:
 * eines mit `aktion: 'DEAKTIVIERT'` (für A) und eines mit `aktion: 'AKTIVIERT'`
 * (für B). Beide tragen dieselbe `propagationGroupId`.
 */
export type PsaProfilAktion = 'AKTIVIERT' | 'DEAKTIVIERT';

/**
 * Domain-Event — „PSA-Profil einer Einheit aktiviert/deaktiviert" (Story 3.1).
 *
 * Wird vom `ChangePsaProfilHandler` atomar mit der `PsaProfilZuweisung`-
 * Row in derselben Transaktion über die Outbox persistiert.
 *
 * **propagationGroupId:** Frische CUID2, vom Handler einmal pro
 * `ChangePsaProfilCommand` erzeugt und an alle Events derselben Operation
 * vererbt. Story 3.2 (Bulk-Multi-Select) und Story 3.7 (Re-Prompt-Scheduler)
 * konsumieren die Gruppe; aktuell rein Payload-Feld, kein FK
 * (Action-Item B5 entscheidet später).
 *
 * **`einheitId` Pflicht:** Im Gegensatz zu `SicherheitsregelAusgerufen` gibt
 * es kein einsatzweites PSA-Profil — eine PSA-Profil-Zuweisung gehört immer
 * zu genau einer `EinsatzEinheit`.
 *
 * **`begruendung`:** Pflicht-Feld (UX-DR — keine kommentarlosen
 * Eigenschutz-Änderungen). Max. 500 Zeichen, getrimmt. Wird in der Audit-
 * Spalte `psa_profil_zuweisungen.begruendung` gespeichert; im WebSocket-
 * Broadcast NICHT mitgeschickt (Bandbreiten-Hygiene), Empfänger lädt sie
 * über die Refetch-Query nach.
 *
 * **`zuweisungId`:** Bei `aktion: 'AKTIVIERT'` die ID der **neuen** Row,
 * bei `aktion: 'DEAKTIVIERT'` die ID der **geschlossenen** Row. Damit kann
 * der Audit-Konsument die Row direkt referenzieren.
 */
export class PsaProfilGeaendertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly zuweisungId: string,
    public readonly propagationGroupId: string,
    public readonly profil: PsaProfil,
    public readonly aktion: PsaProfilAktion,
    public readonly begruendung: string,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? zuweisungId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT;
  }
}
