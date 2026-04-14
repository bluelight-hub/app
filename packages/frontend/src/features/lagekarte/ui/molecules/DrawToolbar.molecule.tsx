/**
 * DrawToolbar - Einklappbare Werkzeugleiste für Zeichenmodi auf der Lagekarte
 *
 * Positioniert oben links auf der Karte. Im eingeklappten Zustand wird nur ein
 * Toggle-Button (Stift-Icon) angezeigt. Per Klick expandiert die Toolbar in einem
 * 2-Spalten-Grid mit visuellen Trennlinien zwischen Werkzeugkategorien.
 * Der Lock-Button sperrt alle Features gegen Bearbeitung.
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
  PiLock,
  PiLockOpen,
  PiMapPin,
  PiPencilSimple,
  PiPolygon,
  PiRectangle,
  PiScribbleLoop,
  PiShieldStar,
  PiStamp,
  PiTarget,
  PiTextT,
} from 'react-icons/pi';
import type { DrawMode } from '../../drawing/types';
import { drawStore, toggleDrawToolbar, toggleLock, toggleSymbolPanel, toggleTemplatePanel, toggleZeichenSidebar } from '../../stores/draw.store';

/** Props für die DrawToolbar-Komponente */
export interface DrawToolbarProps {
  /** Aktiver Zeichenmodus */
  activeMode: DrawMode;
  /** Modus wechseln */
  onModeChange: (mode: DrawMode) => void;
  /** Anzahl unplatzierter taktischer Zeichen (für Badge-Anzeige) */
  unplatzierteZeichenCount?: number;
}

/** Konfiguration für einen Zeichenmodus-Button */
interface ToolDef {
  mode: DrawMode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/** Separator zwischen Tool-Kategorien */
type ToolbarItem = ToolDef | 'separator';

/**
 * Toolbar-Elemente in Reihenfolge: Werkzeuge + Separatoren.
 * Das 2-Spalten-Grid rendert sie zeilenweise von links nach rechts.
 */
export const TOOLBAR_ITEMS: ToolbarItem[] = [
  // Auswahl + Grundformen
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
  'separator',
  // Spezial + Beschriftung
  { mode: 'draw_gams', icon: PiTarget, label: 'GAMS-Zonen platzieren' },
  { mode: 'draw_text', icon: PiTextT, label: 'Text platzieren' },
  { mode: 'osm_mark', icon: PiBuildings, label: 'OSM-Gebäude markieren' },
];

/** Gemeinsame Button-Styles */
const buttonBase = 'flex items-center justify-center p-2 transition-colors duration-100 focus-visible:shadow-focus-ring focus-visible:outline-none';

export function DrawToolbar({ activeMode, onModeChange, unplatzierteZeichenCount = 0 }: DrawToolbarProps) {
  const isExpanded = useStore(drawStore, (s) => s.isDrawToolbarVisible);
  const isSymbolPanelVisible = useStore(drawStore, (s) => s.isSymbolPanelVisible);
  const isTemplatePanelVisible = useStore(drawStore, (s) => s.isTemplatePanelVisible);
  const isLocked = useStore(drawStore, (s) => s.isLocked);
  const isZeichenSidebarVisible = useStore(drawStore, (s) => s.isZeichenSidebarVisible);
  const isDrawing = activeMode !== 'idle' && activeMode !== 'select';

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-panel shadow-lg" role="toolbar" aria-label="Zeichenwerkzeuge">
      {/* Toggle-Button + Lock-Button + Zeichen-Button nebeneinander */}
      <div className="flex">
        <button
          type="button"
          aria-label={isExpanded ? 'Werkzeugleiste einklappen' : 'Werkzeugleiste ausklappen'}
          aria-expanded={isExpanded}
          aria-controls="draw-toolbar-modes"
          title={isExpanded ? 'Werkzeugleiste einklappen' : 'Werkzeugleiste ausklappen'}
          onClick={toggleDrawToolbar}
          disabled={isLocked}
          className={cn(buttonBase, 'flex-1', isLocked ? 'text-text-muted' : isExpanded || isDrawing ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
        >
          <PiPencilSimple className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Taktische Zeichen"
          aria-pressed={isZeichenSidebarVisible}
          title="Taktische Zeichen"
          onClick={toggleZeichenSidebar}
          className={cn(buttonBase, 'relative', isZeichenSidebarVisible ? 'bg-action-secondary text-action-primary' : 'text-text-muted hover:bg-action-secondary hover:text-text-primary')}
        >
          <PiShieldStar className="h-5 w-5" aria-hidden="true" />
          {unplatzierteZeichenCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warning-surface text-[10px] font-bold text-status-warning-text ring-1 ring-status-warning-border">
              {unplatzierteZeichenCount}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={isLocked ? 'Bearbeitung entsperren' : 'Bearbeitung sperren'}
          aria-pressed={isLocked}
          title={isLocked ? 'Bearbeitung entsperren' : 'Bearbeitung sperren'}
          onClick={toggleLock}
          className={cn(buttonBase, isLocked ? 'bg-red-50 text-red-600' : 'text-text-muted hover:bg-action-secondary hover:text-text-primary')}
        >
          {isLocked ? <PiLock className="h-5 w-5" aria-hidden="true" /> : <PiLockOpen className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Expandierbarer Werkzeug-Bereich */}
      <div id="draw-toolbar-modes" className={cn('grid transition-[grid-template-rows] duration-200 ease-out', isExpanded && !isLocked ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" {...((!isExpanded || isLocked) && { inert: true })}>
          <div className="mx-2 border-t border-border-subtle" />

          {/* 2-Spalten-Grid für Werkzeuge */}
          <div className="grid grid-cols-2">
            {TOOLBAR_ITEMS.map((item, i) => {
              if (item === 'separator') {
                return <div key={`sep-${i}`} className="col-span-2 mx-2 border-t border-border-subtle" />;
              }
              const { mode, icon: Icon, label } = item;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-label={label}
                  title={label}
                  tabIndex={isExpanded && !isLocked ? 0 : -1}
                  onClick={() => onModeChange(mode)}
                  className={cn(buttonBase, activeMode === mode ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          {/* Separator + Zusatzfunktionen */}
          <div className="mx-2 border-t border-border-subtle" />

          <div className="grid grid-cols-2">
            <button
              type="button"
              aria-label="Vorlagen"
              title="Vorlagen"
              tabIndex={isExpanded && !isLocked ? 0 : -1}
              onClick={toggleTemplatePanel}
              className={cn(buttonBase, isTemplatePanelVisible ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
            >
              <PiBookmarkSimple className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              aria-label="Symbolbibliothek"
              title="Symbolbibliothek"
              tabIndex={isExpanded && !isLocked ? 0 : -1}
              onClick={toggleSymbolPanel}
              className={cn(buttonBase, isSymbolPanelVisible ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
            >
              <PiStamp className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
