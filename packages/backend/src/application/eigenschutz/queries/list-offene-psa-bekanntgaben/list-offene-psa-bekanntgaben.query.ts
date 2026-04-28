/**
 * Query: Listet alle aktiven (nicht-vollständig-quittierten) PSA-
 * Bekanntgabe-Gruppen (Story 3.4 AC15).
 *
 * Wird vom Sender-View / Stab-Dashboard genutzt — Sektion „Offene PSA-
 * Bekanntgaben" auf der `PsaProfilePage` (AC13). Das Frontend ruft den
 * Endpoint via `useOffenePsaBekanntgaben(einsatzId)`.
 *
 * **`seitISO`-Default:** Wenn nicht gesetzt, wendet der Handler einen
 * Default von `now() - 24h` an (UX-Spec: aktuelle Bekanntgaben). Der
 * Controller reicht den Optional-Query-Param 1:1 durch.
 */
export class ListOffenePsaBekanntgabenQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly seitISO?: string,
  ) {}
}
