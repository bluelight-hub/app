import type { TransactionContext } from '@domain/common';

/**
 * DRY-Helper für `EmitPsaQuittungUeberfaelligHandler` (Story 3.7 AC4 Step 1).
 *
 * Prüft per Direct-Lookup auf `psa_profil_quittungen`, ob für
 * `(propagationGroupId, einheitId)` bereits eine Quittung abgegeben wurde.
 *
 * Notwendig zusätzlich zur AC2-Query-Filter-Schicht: zwischen Scheduler-
 * Read (außerhalb der Tx) und Handler-Execute (in der Tx) kann ein
 * Empfänger gerade quittiert haben — ohne diesen Re-Check würden wir ein
 * verspätetes Überfällig-Event schreiben.
 *
 * **Test-Pfad:** Tx-Mocks ohne `psaProfilQuittung`-Delegate werden hier
 * wie „kein Treffer" behandelt (`false`).
 */
export async function lookupQuittungAbgegebenForGroup(tx: TransactionContext, propagationGroupId: string, einheitId: string): Promise<boolean> {
  const client = tx as {
    psaProfilQuittung?: {
      findFirst?: (args: unknown) => Promise<{ id: string } | null>;
    };
  };
  if (!client.psaProfilQuittung || !client.psaProfilQuittung.findFirst) {
    return false;
  }

  const row = await client.psaProfilQuittung.findFirst({
    where: { propagationGroupId, einheitId },
    select: { id: true },
  });
  return row !== null;
}
