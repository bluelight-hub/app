import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PiQuestion } from 'react-icons/pi';
import { GefahrenmatrixGrid, GefahrenmatrixFullscreenView, GefahrenmatrixHilfeDialog, GefahrenmatrixLegende } from '@/features/gefahrenmatrix/ui';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';

export type GefahrenmatrixSearchParams = {
  mode: 'standard' | 'fullscreen';
  /** Deep-Link-Target, z. B. `cell:BRAND:MENSCHEN` (Issue #627, G3). */
  focus?: string;
};

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/gefahren')({
  validateSearch: (search: Record<string, unknown>): GefahrenmatrixSearchParams => {
    const mode = search.mode;
    const validMode: 'standard' | 'fullscreen' = mode === 'fullscreen' || mode === 'standard' ? mode : 'standard';
    const focus = typeof search.focus === 'string' ? search.focus : undefined;
    return { mode: validMode, focus };
  },
  component: GefahrenPage,
});

function GefahrenPage() {
  const { einsatzId } = Route.useParams();
  const { mode, focus } = Route.useSearch();
  const navigate = useNavigate();
  const [hilfeOpen, setHilfeOpen] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Gefahrenmatrix</h2>
          <p className="text-sm text-text-muted">Bewertung der Gefahrenlage nach dem 5A-B-C-D-5E-Schema</p>
        </div>
        <IconButton aria-label="Hilfe zur Gefahrenmatrix" onClick={() => setHilfeOpen(true)}>
          <PiQuestion className="h-5 w-5" />
        </IconButton>
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
