/**
 * DrawToolbar - Einklappbare Werkzeugleiste für Zeichenmodi auf der Lagekarte
 *
 * Positioniert oben links auf der Karte. Im eingeklappten Zustand wird nur ein
 * Toggle-Button (Stift-Icon) angezeigt. Per Klick expandiert die Toolbar und
 * zeigt Zeichenmodi (Punkt, Linie, Polygon, Freihand, Text, OSM-Markierung).
 * Undo/Redo/Löschen befinden sich in der DrawShortcutBar am unteren Kartenrand.
 */

import { cn } from '@/shared/ui/cn';
import { useStore } from '@tanstack/react-store';
import {
  PiArrowArcRight,
  PiArrowUpRight,
  PiBookmarkSimple,
  PiBuildings,
  PiCircle,
  PiCircleDashed,
  PiCursor,
  PiLineSegment,
  PiMapPin,
  PiPencilSimple,
  PiPolygon,
  PiRectangle,
  PiScribbleLoop,
  PiStamp,
  PiTarget,
  PiTextT,
} from 'react-icons/pi';
import type { DrawMode } from '../../drawing/types';
import { drawStore, toggleDrawToolbar, toggleSymbolPanel, toggleTemplatePanel } from '../../stores/draw.store';

/** Props für die DrawToolbar-Komponente */
export interface DrawToolbarProps {
  /** Aktiver Zeichenmodus */
  activeMode: DrawMode;
  /** Modus wechseln */
  onModeChange: (mode: DrawMode) => void;
}

/** Konfiguration für die Zeichenmodus-Buttons */
const DRAW_MODE_BUTTONS: { mode: DrawMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'select', icon: PiCursor, label: 'Auswählen' },
  { mode: 'draw_point', icon: PiMapPin, label: 'Punkt zeichnen' },
  { mode: 'draw_line_string', icon: PiLineSegment, label: 'Linie zeichnen' },
  { mode: 'draw_polygon', icon: PiPolygon, label: 'Polygon zeichnen' },
  { mode: 'draw_circle', icon: PiCircle, label: 'Kreis zeichnen' },
  { mode: 'draw_rectangle', icon: PiRectangle, label: 'Rechteck zeichnen' },
  { mode: 'draw_freehand', icon: PiScribbleLoop, label: 'Freihand zeichnen' },
  { mode: 'draw_arrow', icon: PiArrowUpRight, label: 'Pfeil zeichnen' },
  { mode: 'draw_ellipse', icon: PiCircleDashed, label: 'Ellipse zeichnen' },
  { mode: 'draw_sector', icon: PiArrowArcRight, label: 'Ausbreitungskegel zeichnen' },
  { mode: 'draw_gams', icon: PiTarget, label: 'GAMS-Zonen platzieren' },
  { mode: 'draw_text', icon: PiTextT, label: 'Text platzieren' },
  { mode: 'osm_mark', icon: PiBuildings, label: 'OSM-Gebäude markieren' },
];

/** Gemeinsame Button-Styles */
const buttonBase = 'flex items-center justify-center p-2 transition-colors duration-100 focus-visible:shadow-focus-ring focus-visible:outline-none';

export function DrawToolbar({ activeMode, onModeChange }: DrawToolbarProps) {
  const isExpanded = useStore(drawStore, (s) => s.isDrawToolbarVisible);
  const isSymbolPanelVisible = useStore(drawStore, (s) => s.isSymbolPanelVisible);
  const isTemplatePanelVisible = useStore(drawStore, (s) => s.isTemplatePanelVisible);
  const isDrawing = activeMode !== 'idle' && activeMode !== 'select';

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-panel shadow-lg" role="toolbar" aria-label="Zeichenwerkzeuge">
      {/* Toggle-Button */}
      <button
        type="button"
        aria-label={isExpanded ? 'Werkzeugleiste einklappen' : 'Werkzeugleiste ausklappen'}
        aria-expanded={isExpanded}
        aria-controls="draw-toolbar-modes"
        title={isExpanded ? 'Werkzeugleiste einklappen' : 'Werkzeugleiste ausklappen'}
        onClick={toggleDrawToolbar}
        className={cn(buttonBase, isExpanded || isDrawing ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
      >
        <PiPencilSimple className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Expandierbarer Werkzeug-Bereich */}
      <div id="draw-toolbar-modes" className={cn('grid transition-[grid-template-rows] duration-200 ease-out', isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" {...(!isExpanded && { inert: true })}>
          <div className="mx-2 border-t border-border-subtle" />

          {DRAW_MODE_BUTTONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              title={label}
              tabIndex={isExpanded ? 0 : -1}
              onClick={() => onModeChange(mode)}
              className={cn(buttonBase, activeMode === mode ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}

          {/* Separator + Zusatzfunktionen */}
          <div className="mx-2 border-t border-border-subtle" />

          <button
            type="button"
            aria-label="Vorlagen"
            title="Vorlagen"
            tabIndex={isExpanded ? 0 : -1}
            onClick={toggleTemplatePanel}
            className={cn(buttonBase, isTemplatePanelVisible ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
          >
            <PiBookmarkSimple className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Symbolbibliothek"
            title="Symbolbibliothek"
            tabIndex={isExpanded ? 0 : -1}
            onClick={toggleSymbolPanel}
            className={cn(buttonBase, isSymbolPanelVisible ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
          >
            <PiStamp className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
