/**
 * DrawToolbar - Schwebende Werkzeugleiste für Zeichenmodi auf der Lagekarte
 *
 * Positioniert oben links auf der Karte. Ermöglicht das Wechseln zwischen
 * Zeichenmodi (Punkt, Linie, Polygon, Freihand, Text, OSM-Markierung)
 * sowie Undo/Redo und Löschen selektierter Features.
 */

import { cn } from '@/shared/ui/cn';
import { PiArrowClockwise, PiArrowCounterClockwise, PiBuildings, PiCursor, PiLineSegment, PiMapPin, PiPolygon, PiScribbleLoop, PiTextT, PiTrash } from 'react-icons/pi';
import type { DrawMode } from '../../drawing/types';

/** Props für die DrawToolbar-Komponente */
export interface DrawToolbarProps {
  /** Aktiver Zeichenmodus */
  activeMode: DrawMode;
  /** Modus wechseln */
  onModeChange: (mode: DrawMode) => void;
  /** Undo ausführen */
  onUndo: () => void;
  /** Redo ausführen */
  onRedo: () => void;
  /** Kann rückgängig gemacht werden */
  canUndo: boolean;
  /** Kann wiederholt werden */
  canRedo: boolean;
  /** Selektierte Features löschen */
  onDeleteSelected: () => void;
  /** Hat selektierte Features */
  hasSelection: boolean;
}

/** Konfiguration für die Zeichenmodus-Buttons */
const DRAW_MODE_BUTTONS: { mode: DrawMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'draw_point', icon: PiMapPin, label: 'Punkt zeichnen' },
  { mode: 'draw_line_string', icon: PiLineSegment, label: 'Linie zeichnen' },
  { mode: 'draw_polygon', icon: PiPolygon, label: 'Polygon zeichnen' },
  { mode: 'draw_freehand', icon: PiScribbleLoop, label: 'Freihand zeichnen' },
  { mode: 'draw_text', icon: PiTextT, label: 'Text platzieren' },
];

/** Gemeinsame Button-Styles */
const buttonBase = 'flex items-center justify-center p-2 transition-colors duration-100 focus-visible:shadow-focus-ring focus-visible:outline-none';

export function DrawToolbar({ activeMode, onModeChange, onUndo, onRedo, canUndo, canRedo, onDeleteSelected, hasSelection }: DrawToolbarProps) {
  return (
    <div className={cn('absolute top-4 left-4 z-10 flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-panel shadow-lg')} role="toolbar" aria-label="Zeichenwerkzeuge">
      {/* Auswahl-Modus */}
      <button
        type="button"
        aria-label="Auswählen"
        title="Auswählen"
        onClick={() => onModeChange('select')}
        className={cn(buttonBase, activeMode === 'select' ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
      >
        <PiCursor className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="mx-2 border-t border-border-subtle" />

      {/* Zeichenmodi */}
      {DRAW_MODE_BUTTONS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onModeChange(mode)}
          className={cn(buttonBase, activeMode === mode ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      ))}

      {/* Separator */}
      <div className="mx-2 border-t border-border-subtle" />

      {/* OSM-Markierung */}
      <button
        type="button"
        aria-label="OSM-Gebäude markieren"
        title="OSM-Gebäude markieren"
        onClick={() => onModeChange('osm_mark')}
        className={cn(buttonBase, activeMode === 'osm_mark' ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
      >
        <PiBuildings className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="mx-2 border-t border-border-subtle" />

      {/* Undo */}
      <button
        type="button"
        aria-label="Rückgängig"
        title="Rückgängig"
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(buttonBase, 'text-text-primary hover:bg-action-secondary disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50')}
      >
        <PiArrowCounterClockwise className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Redo */}
      <button
        type="button"
        aria-label="Wiederholen"
        title="Wiederholen"
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(buttonBase, 'text-text-primary hover:bg-action-secondary disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50')}
      >
        <PiArrowClockwise className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Löschen */}
      <button
        type="button"
        aria-label="Auswahl löschen"
        title="Auswahl löschen"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className={cn(
          buttonBase,
          'disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50',
          hasSelection ? 'text-text-primary hover:bg-red-50 hover:text-red-600' : 'text-text-primary',
        )}
      >
        <PiTrash className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
