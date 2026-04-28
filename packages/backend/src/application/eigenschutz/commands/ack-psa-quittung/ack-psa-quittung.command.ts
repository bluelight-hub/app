/**
 * Command: Quittiert eine PSA-Profil-Bekanntgabe-Gruppe durch eine konkrete
 * Einheit (Story 3.4 AC1).
 *
 * **Granularität:** Quittiert wird nicht eine einzelne `PsaProfilZuweisung`-
 * Row, sondern die gesamte Bekanntgabe-Gruppe (eine Bulk-Änderung erzeugt N
 * Zuweisungen, aber genau eine `propagationGroupId`). Vgl. AC7 — der
 * Endpoint hängt unter `propagation-groups/:groupId/quittieren`.
 *
 * **Idempotenz** (AC3): Wiederholte Sends mit identischem
 * `(propagationGroupId, einheitId)` triggern den Prisma-`P2002`-Constraint
 * (`@@unique([propagationGroupId, einheitId])`). Der Handler fängt das ab und
 * antwortet idempotent — kein neues Event in der Outbox, kein Re-Insert.
 *
 * **Authorization** (AC2 — Defense-in-Depth zusätzlich zum Permission-Guard
 * `eigenschutz:psa:acknowledge` auf Controller-Ebene):
 * 1. Caller hat aktive `EinsatzTeilnehmer`-Bindung im Einsatz.
 * 2. Caller-`EinsatzPerson` ist Mitglied der `einheitId` (über
 *    `EinsatzPersonEinheit`).
 *
 * **NotFound:PsaPropagation:** Wenn keine `eigenschutz.psa_profil_geaendert`-
 * Outbox-Row für `(propagationGroupId, einheitId)` mehr existiert (Retention
 * abgeräumt oder Tippfehler), lehnt der Handler den Vorgang ab — eine
 * Quittung muss sich auf eine konkrete Bekanntgabe beziehen, sonst entstünde
 * eine „Geister-Quittung" ohne Audit-Bezug.
 */
export class AckPsaQuittungCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly propagationGroupId: string,
    public readonly einheitId: string,
    public readonly callerUserId: string,
  ) {}
}
