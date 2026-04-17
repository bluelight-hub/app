/**
 * GefahrenzoneDrawControls (Issue #627, G2)
 *
 * Toolbar-Button mit Polygon/Kreis-Modi + `g`-Shortcut. Aktiviert einen
 * MapboxDraw-Modus und setzt `drawContext='gefahrenzone'` im Store — der
 * zentrale Draw-Completion-Handler schaut auf diesen Kontext, um zu
 * entscheiden, ob das gezeichnete Feature zu einer Zone wird.
 */

import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { PiCircleDashed, PiPolygon, PiWarning } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { drawStore, setDrawContext, setDrawMode } from '@/features/lagekarte/stores/draw.store';

export type GefahrenzoneDrawGeometryType = 'POLYGON' | 'CIRCLE';

export interface GefahrenzoneDrawControlsProps {
  /** Ob die Toolbar sichtbar / funktionsfähig ist (z. B. nur in Edit-Rollen). */
  disabled?: boolean;
  className?: string;
}

/**
 * Kleine Toolbar mit zwei Icon-Buttons (Polygon + Kreis) und `g`-Shortcut,
 * der den Polygon-Modus togglet. Der aktive Modus bleibt bis zum Abschluss
 * oder Abbruch (Escape) erhalten — wie beim bestehenden Draw-Control.
 */
export function GefahrenzoneDrawControls({ disabled, className }: GefahrenzoneDrawControlsProps) {
  const drawMode = useStore(drawStore, (s) => s.drawMode);
  const drawContext = useStore(drawStore, (s) => s.drawContext);

  const polygonActive = drawContext === 'gefahrenzone' && drawMode === 'draw_polygon';
  const circleActive = drawContext === 'gefahrenzone' && drawMode === 'draw_circle';

  const toggleMode = (mode: 'draw_polygon' | 'draw_circle') => {
    if (disabled) return;
    const alreadyActive = drawContext === 'gefahrenzone' && drawMode === mode;
    if (alreadyActive) {
      setDrawContext(null);
      setDrawMode('select');
    } else {
      setDrawContext('gefahrenzone');
      setDrawMode(mode);
    }
  };

  // `g`-Shortcut: togglet Polygon. Ignoriert Keypress in Input-Elementen.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      toggleMode('draw_polygon');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // toggleMode bewusst keine Dep — liest den Store-Snapshot im Handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-panel border border-border-subtle bg-surface-panel p-1 shadow-panel', disabled && 'opacity-60', className)}
      role="group"
      aria-label="Gefahrenzone zeichnen"
    >
      <span className="flex items-center gap-1 px-1.5 text-text-muted" aria-hidden>
        <PiWarning className="size-4" />
      </span>
      <button
        type="button"
        onClick={() => toggleMode('draw_polygon')}
        disabled={disabled}
        aria-pressed={polygonActive}
        aria-label="Gefahrenzone als Polygon zeichnen (Shortcut g)"
        title="Polygon zeichnen (g)"
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-control transition-colors',
          'focus:shadow-focus focus:outline-none',
          polygonActive ? 'bg-action-primary text-text-inverse' : 'text-text-secondary hover:bg-surface-raised',
          disabled && 'cursor-not-allowed',
        )}
      >
        <PiPolygon className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => toggleMode('draw_circle')}
        disabled={disabled}
        aria-pressed={circleActive}
        aria-label="Gefahrenzone als Kreis zeichnen"
        title="Kreis zeichnen"
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-control transition-colors',
          'focus:shadow-focus focus:outline-none',
          circleActive ? 'bg-action-primary text-text-inverse' : 'text-text-secondary hover:bg-surface-raised',
          disabled && 'cursor-not-allowed',
        )}
      >
        <PiCircleDashed className="size-4" aria-hidden />
      </button>
    </div>
  );
}
