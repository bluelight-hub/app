import { useNavigate } from '@tanstack/react-router';
import { FullscreenCloseButton } from '@/features/lagekarte/ui';
import { GefahrenmatrixGrid } from './GefahrenmatrixGrid';

interface GefahrenmatrixFullscreenViewProps {
  einsatzId: string;
}

/**
 * Gefahrenmatrix im Vollbildmodus für Readonly-Monitore.
 *
 * Features:
 * - Fullscreen-Layout mit Close-Button (Escape-Key)
 * - Readonly-Darstellung ohne Dropdowns
 * - Auto-Refresh alle 5 Sekunden
 * - Größere Darstellung für Display-Tauglichkeit
 */
export function GefahrenmatrixFullscreenView({ einsatzId }: GefahrenmatrixFullscreenViewProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, mode: 'standard' }),
      replace: true,
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-canvas">
      <FullscreenCloseButton onClose={handleClose} />

      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-panel px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Gefahrenmatrix</h1>
        <p className="mt-1 text-sm text-text-secondary">Bewertung der Gefahrenlage nach dem 5A-B-C-D-5E-Schema</p>
      </div>

      {/* Matrix — vertikal zentriert im verfügbaren Platz */}
      <div className="flex flex-1 items-center overflow-auto p-6">
        <div className="w-full">
          <GefahrenmatrixGrid einsatzId={einsatzId} readonly fullscreen refetchInterval={5000} />
        </div>
      </div>
    </div>
  );
}
