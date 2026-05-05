import { useMemo } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useEinsatzRolleContext } from '@/features/einsatz';
import { ConflictResolutionList } from '../organisms/ConflictResolutionList';

export interface SyncConflictsPageProps {
  /**
   * Einsatz-Kontext, in dem die Sync-Konflikte aufgelöst werden.
   */
  readonly einsatzId: string;
}

/**
 * Search-Params der Route — bewusst lokal definiert, damit die Page
 * unabhängig vom generierten `routeTree.gen.ts` typisiert ist (Vermeidung
 * von Build-Order-Issues bei brandneuen Routen).
 */
interface SyncConflictsSearch {
  readonly entityType?: 'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM';
  readonly einheitId?: string;
}

/**
 * Sync-Konflikte-Page (Story 3.10 AC9, FR50, UX-DR6).
 *
 * Rendert die `ConflictResolutionList` für den aktuellen Einsatz und reicht
 * URL-Search-Params (`entityType`, `einheitId`) als initialen Filter durch.
 * Dadurch kann der `KonfliktErkanntMikroBanner` (Story 3.9) per Deep-Link auf
 * eine konkrete Einheit fokussieren.
 *
 * **Read-Only-Gating:** Nur die Rolle `BEFEHLSGEBER` darf Konflikte auflösen
 * (FR50). Die Rolle wird aus dem `EinsatzRolleProvider`-Context gelesen, der
 * vom `SingleEinsatzLayout` bereits oberhalb der Route montiert ist — kein
 * eigener Loading-Zyklus, kein Flicker.
 */
export function SyncConflictsPage({ einsatzId }: SyncConflictsPageProps) {
  // `strict: false` schaltet die Pfad-Inference ab und liefert ein unverengtes
  // Search-Objekt — wir casten lokal auf das Route-Schema. Das ist nötig, weil
  // der TanStack-Router-Plugin den Wurzel-`__root`-Search (server/invite) in
  // jede Route-Suche injiziert; ein `from`-bezogenes useSearch würde eine
  // Union liefern, in der `entityType`/`einheitId` als „may not exist"
  // gelten.
  const search = useSearch({ strict: false }) as SyncConflictsSearch | undefined;
  const { meineRolle } = useEinsatzRolleContext();
  const canResolve = meineRolle?.rolle === 'BEFEHLSGEBER';

  // Stabile `initialFilter`-Referenz — ohne `useMemo` würde jeder Re-Render
  // ein neues Objekt erzeugen, der `useEffect` in `ConflictResolutionList`
  // (URL → State Sync, F8) liefe in eine harmlose, aber überflüssige Schleife.
  const initialFilter = useMemo(() => ({ entityType: search?.entityType, einheitId: search?.einheitId }), [search?.entityType, search?.einheitId]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text-primary">Sync-Konflikte</h1>
        <p className="text-sm text-text-muted">Multi-Device-Konflikte (FR50) — auf jeder Zeile entscheiden, welche Version gilt.</p>
      </header>
      <ConflictResolutionList einsatzId={einsatzId} initialFilter={initialFilter} canResolve={canResolve} />
    </div>
  );
}
