import type { TransactionContext } from '@domain/common';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';

/**
 * DRY-Helper für `AckPsaQuittungHandler` (Story 3.4) und
 * `MeldeLueckeHandler` (Story 3.6 AC3).
 *
 * Prüft, ob für `(propagationGroupId, einheitId)` mindestens eine
 * `eigenschutz.psa_profil_geaendert`-Outbox-Row existiert.
 *
 * **Warum direkt über die Prisma-Tabelle?** Das `IOutboxRepository`-Port
 * exponiert bewusst keinen JSON-Path-Filter; ein O(N)-Scan über die letzten
 * Events ist mit der erwarteten Bekanntgabe-Größe (≤ 10 Events pro Gruppe,
 * Story 3.4 AC8) unkritisch und vermeidet einen weiteren Domain-Port, der
 * nur für diesen Use-Case existieren würde.
 *
 * **Filter-Strategie:** Prisma JSON-Path-Filter auf
 * `payload.propagationGroupId` + `payload.einheitId` (Postgres-JSONB,
 * Pattern aus `get-erinnerung-timeline.handler.ts`). Ein einziger
 * `findFirst` mit `take: 1` reicht.
 *
 * **Test-Pfad:** In-Memory-Tx-Mocks, die kein `outboxEvent`-Delegate
 * exposen, werden hier wie „kein Treffer" behandelt (`false`) — Test-Spec
 * setzt den Mock entsprechend.
 */
export async function lookupPsaPropagationExists(tx: TransactionContext, propagationGroupId: string, einheitId: string): Promise<boolean> {
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
      eventName: PsaProfilGeaendertEvent.eventName(),
      AND: [{ payload: { path: ['propagationGroupId'], equals: propagationGroupId } }, { payload: { path: ['einheitId'], equals: einheitId } }],
    },
    select: { id: true },
  });
  return row !== null;
}
