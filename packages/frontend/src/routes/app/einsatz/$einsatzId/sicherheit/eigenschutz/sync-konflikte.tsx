import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { SyncConflictsPage } from '@/features/eigenschutz/ui/pages/SyncConflictsPage';

/**
 * Search-Param-Schema für `/sync-konflikte` (Story 3.10 AC9).
 *
 * Beide Felder sind optional und erlauben Deep-Links aus dem
 * `KonfliktErkanntMikroBanner` (Story 3.9, AC7 §5):
 * - `entityType`: vor-filtert die Liste auf PSA- bzw. GB-Konflikte.
 * - `einheitId`: fokussiert auf eine spezifische Einheit.
 *
 * Das gesamte Schema ist optional — direkter URL-Aufruf ohne Search-Params
 * darf nicht hart fehlschlagen.
 */
const SyncConflictsSearchSchema = z
  .object({
    entityType: z.enum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM']).optional(),
    einheitId: z.string().optional(),
  })
  .optional();

/**
 * File-Route für die Sync-Konflikte-Liste (Story 3.10 AC9).
 *
 * Mountet die `SyncConflictsPage`. Die Layout-Route `eigenschutz.tsx`
 * navigiert hierhin, wenn der `KonfliktErkanntMikroBanner` „Konflikte ansehen"
 * triggert; die `EigenschutzEntryPage` verlinkt zusätzlich als reguläre
 * Sub-Route.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sync-konflikte')({
  component: SyncConflictsRouteComponent,
  // Story 3.10 F6: Kaputte Deep-Links (z. B. `?entityType=BOGUS`) dürfen
  // die Route nicht zum Absturz bringen. `safeParse` mit Fallback auf ein
  // leeres Filter-Objekt rendert die Liste ungefiltert statt zu werfen.
  validateSearch: (search) => {
    const result = SyncConflictsSearchSchema.safeParse(search);
    return result.success ? (result.data ?? {}) : {};
  },
});

function SyncConflictsRouteComponent() {
  const { einsatzId } = Route.useParams();
  return <SyncConflictsPage einsatzId={einsatzId} />;
}
