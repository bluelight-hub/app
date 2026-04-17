import { LagekarteView, type LagekarteSearchParams } from '@/features/lagekarte/ui';
import { LagekarteGefahrenmatrixSplitView } from '@/features/einsatz/ui/layouts/LagekarteGefahrenmatrixSplitView';
import { SplitViewToggle } from '@/features/einsatz/ui/molecules/SplitViewToggle';
import { useSplitViewHotkey } from '@/features/einsatz/hooks/use-split-view-hotkey';
import { useSplitViewUrlSync } from '@/features/einsatz/hooks/use-split-view-url-sync';
import { createFileRoute } from '@tanstack/react-router';

/** Lagekarte-Search-Params — erweitert um Deep-Link-`focus` (Issue #627, G3) und `split` (G4). */
type LagekarteRouteSearch = LagekarteSearchParams & { focus?: string; split?: boolean };

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/karte')({
  validateSearch: (search: Record<string, unknown>): LagekarteRouteSearch => {
    const mode = search.mode;
    const validMode = mode === 'fullscreen' || mode === 'presentation' || mode === 'standard' ? mode : 'standard';
    const focus = typeof search.focus === 'string' ? search.focus : undefined;
    const split = search.split === true || search.split === 'true' ? true : undefined;
    return { mode: validMode, focus, split };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  const { mode, focus, split } = Route.useSearch();

  useSplitViewHotkey();
  useSplitViewUrlSync({ split, focus });

  if (split === true && mode === 'standard') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Verknüpfte Ansicht</h2>
            <p className="text-sm text-text-muted">Lagekarte und Gefahrenmatrix parallel — Klick überträgt den Fokus.</p>
          </div>
          <SplitViewToggle />
        </div>
        <LagekarteGefahrenmatrixSplitView einsatzId={einsatzId} />
      </div>
    );
  }

  if (mode === 'standard') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Lagekarte</h2>
            <p className="text-sm text-text-muted">Einsatzgebiet — Zonen, Markierungen und taktische Zeichen</p>
          </div>
          <SplitViewToggle />
        </div>
        <div className="h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-8rem)]">
          <LagekarteView einsatzId={einsatzId} mode={mode} focus={focus} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <LagekarteView einsatzId={einsatzId} mode={mode} focus={focus} />
    </div>
  );
}
