/**
 * Query: Listet den Quittungs-Stand einer PSA-Bekanntgabe-Gruppe
 * (Story 3.4 AC8).
 *
 * Wird vom Sender-View / Stab-Dashboard genutzt — `AcknowledgmentStatusBadge`
 * ruft den Endpoint via `useEigenschutzPsaQuittungen(einsatzId, propagationGroupId)`.
 *
 * Source-of-truth-Strategie (AC8): Erwartete Empfänger kommen aus den
 * `PsaProfilGeaendert`-Outbox-Events der Gruppe (distincte `einheitId`s);
 * der aktuelle Quittungs-Stand kommt aus `PsaProfilQuittung`. Es gibt
 * keine separate „Bekanntgabe-Gruppen"-Tabelle — `propagationGroupId` lebt
 * nur als CUID2 im Event-Stream + auf `PsaProfilZuweisung` (Architektur §B5).
 */
export class ListPsaQuittungenQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly propagationGroupId: string,
  ) {}
}
