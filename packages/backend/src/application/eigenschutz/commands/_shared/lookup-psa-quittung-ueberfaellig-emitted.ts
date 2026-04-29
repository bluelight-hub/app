import type { TransactionContext } from '@domain/common';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';

/**
 * DRY-Helper für `EmitPsaQuittungUeberfaelligHandler` (Story 3.7 AC4 Step 1).
 *
 * Defense-in-Depth-Idempotenz-Re-Check: prüft, ob für
 * `(propagationGroupId, einheitId)` bereits ein
 * `eigenschutz.quittung_ueberfaellig`-Event in der Outbox existiert.
 *
 * **Warum zusätzlich zur Query-Schicht (AC2 NOT EXISTS)?** Zwischen
 * Scheduler-Read (außerhalb der Tx) und Handler-Execute (in der Tx)
 * vergehen Millisekunden — in Hochlast-/Replicated-Setups kann ein
 * paralleler Pod gerade ein konkurrierendes Event geschrieben haben.
 * Dieser Helper schließt das schmale Race-Cond-Fenster.
 *
 * **Filter-Strategie:** Prisma JSON-Path-Filter auf
 * `payload.propagationGroupId` + `payload.einheitId` (Pattern: gleicher
 * Helper wie `lookup-psa-propagation.ts`).
 *
 * **Test-Pfad:** Tx-Mocks ohne `outboxEvent`-Delegate werden hier wie
 * „kein Treffer" behandelt (`false`).
 */
export async function lookupQuittungUeberfaelligEmitted(tx: TransactionContext, propagationGroupId: string, einheitId: string): Promise<boolean> {
  const client = tx as {
    outboxEvent?: {
      findFirst?: (args: unknown) => Promise<{ id: string } | null>;
    };
  };
  if (!client.outboxEvent || !client.outboxEvent.findFirst) {
    return false;
  }

  const row = await client.outboxEvent.findFirst({
    where: {
      eventName: QuittungUeberfaelligEvent.eventName(),
      AND: [{ payload: { path: ['propagationGroupId'], equals: propagationGroupId } }, { payload: { path: ['einheitId'], equals: einheitId } }],
    },
    select: { id: true },
  });
  return row !== null;
}
