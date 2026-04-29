/**
 * Command: Meldet eine Ausrüstungs-Lücke zu einer PSA-Profil-Bekanntgabe-
 * Gruppe (Story 3.6 AC2, FR20).
 *
 * **Granularität:** Bezieht sich immer auf eine konkrete `propagationGroupId`
 * + `einheitId` (siehe `MeldeLueckeHandler`). Die Lücken-Meldung subsummiert
 * die Quittung audit-fachlich (Q2-Default — Quittung+Lücke atomar). Wenn
 * keine `PsaProfilQuittung`-Row existiert, wird sie mit `lueckeGemeldet=true`
 * angelegt; existiert sie bereits, wird das Lücke-Feld upgedatet.
 *
 * **Idempotenz:** Erlaubt — Notiz-Korrekturen werden als Update durchgereicht.
 * Anders als `AckPsaQuittungCommand` (Story 3.4) wirft der Handler KEIN
 * `alreadyAcknowledged`-Idempotenz-Flag, weil eine erneute Meldung
 * fachlich gewünscht ist (z. B. Notiz nachschärfen).
 *
 * **Authorization** (AC4 — Defense-in-Depth zusätzlich zum Permission-Guard
 * `eigenschutz:psa:acknowledge` auf Controller-Ebene): Identisch zu
 * `AckPsaQuittungHandler` über den DRY-Helper `assertCallerAuthorizedForEinheit`.
 *
 * **NotFound:PsaPropagation:** Wenn keine `eigenschutz.psa_profil_geaendert`-
 * Outbox-Row für `(propagationGroupId, einheitId)` mehr existiert (Retention
 * abgeräumt oder Tippfehler), lehnt der Handler den Vorgang ab.
 *
 * **BusinessRule:LueckeNotizLeer:** Wenn die Notiz nach `.trim()` leer ist
 * (Defense-in-Depth gegen Whitespace-only-Submit; das DTO validiert Min-
 * Length, aber ein leerzeichen-only String könnte den DTO-Filter passieren).
 */
export class MeldeLueckeCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly propagationGroupId: string,
    public readonly einheitId: string,
    public readonly meldung: string,
    public readonly callerUserId: string,
  ) {}
}
