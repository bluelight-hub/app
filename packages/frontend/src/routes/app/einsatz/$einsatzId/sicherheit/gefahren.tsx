import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PiQuestion } from 'react-icons/pi';
import { GefahrenmatrixGrid, GefahrenmatrixFullscreenView, GefahrenmatrixHilfeDialog, GefahrenmatrixLegende } from '@/features/gefahrenmatrix/ui';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { LagekarteGefahrenmatrixSplitView } from '@/features/einsatz/ui/layouts/LagekarteGefahrenmatrixSplitView';
import { SplitViewToggle } from '@/features/einsatz/ui/molecules/SplitViewToggle';
import { useSplitViewHotkey } from '@/features/einsatz/hooks/use-split-view-hotkey';
import { useSplitViewUrlSync } from '@/features/einsatz/hooks/use-split-view-url-sync';

export type GefahrenmatrixSearchParams = {
  mode: 'standard' | 'fullscreen';
  /** Deep-Link-Target, z. B. `cell:BRAND:MENSCHEN` (Issue #627, G3). */
  focus?: string;
  /** Verknüpfte Ansicht (Issue #627, G4). */
  split?: boolean;
};

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/gefahren')({
  validateSearch: (search: Record<string, unknown>): GefahrenmatrixSearchParams => {
    const mode = search.mode;
    const validMode: 'standard' | 'fullscreen' = mode === 'fullscreen' || mode === 'standard' ? mode : 'standard';
    const focus = typeof search.focus === 'string' ? search.focus : undefined;
    const split = search.split === true || search.split === 'true' ? true : undefined;
    return { mode: validMode, focus, split };
  },
  component: GefahrenPage,
});

function GefahrenPage() {
  const { einsatzId } = Route.useParams();
  const { mode, focus, split } = Route.useSearch();
  const navigate = useNavigate();
  const [hilfeOpen, setHilfeOpen] = useState(false);

  useSplitViewHotkey();
  useSplitViewUrlSync({ split, focus });

  const handleZoneBadgeClick = (typ: string, objekt: string) => {
    navigate({
      to: '/app/einsatz/$einsatzId/übersicht/karte',
      params: { einsatzId },
      search: { mode: 'standard', focus: `cell:${typ}:${objekt}` } as never,
    });
  };

  if (mode === 'fullscreen') {
    return <GefahrenmatrixFullscreenView einsatzId={einsatzId} />;
  }

  if (split === true) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Verknüpfte Ansicht</h2>
            <p className="text-sm text-text-muted">Gefahrenmatrix und Lagekarte parallel — Klick überträgt den Fokus.</p>
          </div>
          <div className="flex items-center gap-2">
            <SplitViewToggle />
            <IconButton aria-label="Hilfe zur Gefahrenmatrix" onClick={() => setHilfeOpen(true)}>
              <PiQuestion className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
        <LagekarteGefahrenmatrixSplitView einsatzId={einsatzId} />
        <GefahrenmatrixHilfeDialog isOpen={hilfeOpen} onClose={() => setHilfeOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Gefahrenmatrix</h2>
          <p className="text-sm text-text-muted">Bewertung der Gefahrenlage nach dem 5A-B-C-D-5E-Schema</p>
        </div>
        <div className="flex items-center gap-2">
          <SplitViewToggle />
          <IconButton aria-label="Hilfe zur Gefahrenmatrix" onClick={() => setHilfeOpen(true)}>
            <PiQuestion className="h-5 w-5" />
          </IconButton>
        </div>
      </div>
      <GefahrenmatrixGrid einsatzId={einsatzId} focus={focus} onZoneBadgeClick={handleZoneBadgeClick} />
      <GefahrenmatrixLegende />
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong className="text-amber-800 dark:text-amber-300">Eigenschutz geht immer vor.</strong> Die Spalte „Einsatzkräfte" hält fest, vor welchen Gefahren sich die Einsatzkräfte aktiv schützen
          müssen. Eine hohe Bewertung kann bedeuten, dass zusätzliche PSA, Spezialkräfte oder ein verändertes Vorgehen nötig sind.
        </p>
      </div>
      <GefahrenmatrixHilfeDialog isOpen={hilfeOpen} onClose={() => setHilfeOpen(false)} />
    </div>
  );
}
