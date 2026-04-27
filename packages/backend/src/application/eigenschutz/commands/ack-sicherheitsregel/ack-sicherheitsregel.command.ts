/**
 * Command: Quittiert eine Sicherheitsregel durch eine konkrete Einheit
 * (Story 2.7 AC2/AC9).
 *
 * **Idempotenz** (AC3): Wiederholte Sends mit identischem `(regelId, einheitId)`
 * triggern den Prisma-`P2002`-Constraint. Der Handler fängt das ab und
 * antwortet idempotent — kein neues Event in der Outbox, kein Re-Insert.
 *
 * **OCC (optional, AC9 Step 4):** `expectedRegelVersion` ist ein optionales
 * Token. Wenn gesetzt und die aktuelle Aggregate-Version weicht ab, schlägt
 * der Handler mit `ConflictDetected:Sicherheitsregel:current=<n>` fehl
 * (HTTP 409). Verhindert „Quittung auf veralteter Banner-Version".
 *
 * **Authorisierung** (AC4/AC5): Story 2.7 verschiebt den
 * `@RequirePermissions`-Decorator weiterhin (PO-Decision 2026-04-24). Der
 * Handler prüft fachlich:
 * 1. Caller hat aktive `EinsatzTeilnehmer`-Bindung im Einsatz
 * 2. Caller-`EinsatzPerson` ist Mitglied der `einheitId` (über `EinsatzPersonEinheit`)
 * 3. Regel passt zur Einheit (Aggregate-Check `acknowledge(...)`)
 */
export class AckSicherheitsregelCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly regelId: string,
    public readonly einheitId: string,
    public readonly callerUserId: string,
    public readonly expectedRegelVersion?: number,
  ) {}
}
