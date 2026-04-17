/**
 * LagekarteGefahrenmatrixSplitView (Issue #627, G4)
 *
 * Gleichberechtigtes Split-Layout: Matrix links, Lagekarte rechts.
 * - ≥ `2xl` (1680 px): 50:50
 * - `xl` (1280–1679 px): 40:60
 * - `<xl`: Fallback-Handling übernimmt der Caller (Vollansicht); der Layout
 *   selbst rendert trotzdem, falls er doch gemountet wird (z. B. breite
 *   Fenster-Umkehrung; Caller deaktiviert den Toggle).
 *
 * Matrix-Cell-Click schreibt `focus` in den `splitViewStore` und löst dadurch
 * via `LagekarteView`-`focus`-Prop einen Kartenschwenk aus.
 * Zone-Panel-Open auf der Karte spiegelt sich als `focus=zone:{id}` zurück
 * in die Matrix (Scroll + Pulse).
 */

import { useStore } from '@tanstack/react-store';
import { GefahrenmatrixGrid, GefahrenmatrixLegende } from '@/features/gefahrenmatrix/ui';
import { LagekarteView } from '@/features/lagekarte/ui';
import { GefahrenzoneCoachMark } from '@/features/gefahrenzone/ui/organisms/GefahrenzoneCoachMark';
import { splitViewActions, splitViewStore } from '../../stores/split-view.store';

export interface LagekarteGefahrenmatrixSplitViewProps {
  einsatzId: string;
}

export function LagekarteGefahrenmatrixSplitView({ einsatzId }: LagekarteGefahrenmatrixSplitViewProps) {
  const focus = useStore(splitViewStore, (s) => s.focus);

  const matrixFocus = focus?.kind === 'cell' ? `cell:${focus.gefahrentyp}:${focus.schutzobjekt}` : undefined;
  const mapFocus = focus?.kind === 'zone' ? `zone:${focus.zoneId}` : focus?.kind === 'cell' ? `cell:${focus.gefahrentyp}:${focus.schutzobjekt}` : undefined;

  return (
    <div className="grid h-[calc(100dvh-6rem)] grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-split-view-layout>
      <section className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1" aria-label="Gefahrenmatrix">
        <header className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Gefahrenmatrix</h2>
            <p className="text-sm text-text-muted">5A-B-C-D-5E — Klick auf eine Zelle fokussiert die Karte</p>
          </div>
        </header>
        <GefahrenmatrixGrid einsatzId={einsatzId} focus={matrixFocus} onCellActivate={(gefahrentyp, schutzobjekt) => splitViewActions.setFocus({ kind: 'cell', gefahrentyp, schutzobjekt })} />
        <GefahrenmatrixLegende />
      </section>
      <section className="min-h-0 min-w-0" aria-label="Lagekarte">
        <LagekarteView einsatzId={einsatzId} mode="standard" focus={mapFocus} />
      </section>
      <GefahrenzoneCoachMark einsatzId={einsatzId} />
    </div>
  );
}
