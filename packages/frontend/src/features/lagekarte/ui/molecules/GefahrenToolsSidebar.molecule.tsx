/**
 * GefahrenToolsSidebar — Slide-In-Panel für Gefahren-Werkzeuge auf der Lagekarte.
 *
 * Bündelt die drei Tool-Klassen, die bisher verstreut waren:
 * - Zone: Polygon/Kreis zum Zeichnen einer Gefahrenzone (wiederverwendet `GefahrenzoneDrawControls`).
 * - GAMS: Aktiviert den `draw_gams`-Modus (Karten-Klick öffnet das Radien-Popup).
 * - Symbole: Gefahrenmarker aus der allgemeinen Symbolbibliothek zum Platzieren.
 */

import type * as React from 'react';
import { PiList, PiShieldWarning, PiTarget, PiWarning, PiX } from 'react-icons/pi';
import { useStore } from '@tanstack/react-store';
import { cn } from '@/shared/ui/cn';
import { drawStore, setDrawMode, setGefahrenSidebarTab, toggleGefahrenSidebar, type GefahrenSidebarTab } from '@/features/lagekarte/stores/draw.store';
import { SYMBOLS_GEFAHREN } from '@/features/lagekarte/drawing/symbols/gefahren';
import type { SymbolDefinition } from '@/features/lagekarte/drawing/symbols/symbol-registry';
import { GefahrenzoneDrawControls } from '@/features/gefahrenzone';

interface GefahrenToolsSidebarProps {
  /** Ob die Sidebar sichtbar ist */
  isVisible: boolean;
  /** Callback, der ein Symbol zur Platzierung auswählt (analog `SymbolLibraryPanel`). */
  onSelectSymbol: (symbol: SymbolDefinition) => void;
}

/** Erzeugt eine Data-URI aus SVG-Content für sichere Darstellung via <img> */
function svgToDataUri(svgContent: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
}

interface TabDef {
  id: GefahrenSidebarTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'zone', icon: PiShieldWarning, label: 'Zone' },
  { id: 'gams', icon: PiTarget, label: 'GAMS' },
  { id: 'symbole', icon: PiList, label: 'Symbole' },
];

export function GefahrenToolsSidebar({ isVisible, onSelectSymbol }: GefahrenToolsSidebarProps) {
  const activeTab = useStore(drawStore, (s) => s.gefahrenSidebarTab);

  const handleGamsStart = () => {
    setDrawMode('draw_gams');
  };

  return (
    <div
      className={cn(
        'absolute top-0 right-0 z-20 flex h-full flex-col border-l border-border-subtle bg-surface-panel shadow-xl transition-transform duration-300 ease-out',
        'w-80',
        isVisible ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-hidden={!isVisible}
      {...(!isVisible && { inert: true })}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <PiWarning className="h-4 w-4 text-status-warning-text" aria-hidden="true" />
          Gefahren-Tools
        </h2>
        <button
          type="button"
          aria-label="Gefahren-Sidebar schließen"
          onClick={toggleGefahrenSidebar}
          className="rounded p-1 text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
        >
          <PiX className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle" role="tablist" aria-label="Gefahren-Werkzeuge">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`gefahren-tab-${id}`}
            id={`gefahren-tab-btn-${id}`}
            onClick={() => setGefahrenSidebarTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none',
              activeTab === id ? 'border-b-2 border-action-primary text-action-primary' : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalte — inaktive Tabs werden NICHT gemountet, damit der globale
          `g`-Keydown-Listener in `GefahrenzoneDrawControls` und das SVG-Rendering
          der Symbole nicht außerhalb des aktiven Tabs laufen. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'zone' && (
          <div id="gefahren-tab-zone" role="tabpanel" aria-labelledby="gefahren-tab-btn-zone" className="flex flex-col gap-3 p-4">
            <p className="text-xs text-text-muted">
              Zeichne eine Gefahrenzone als Polygon oder Kreis. Nach dem Zeichnen öffnet sich ein Popup zur Auswahl von Gefahrentyp, Schutzobjekt und Warnstufe.
            </p>
            <GefahrenzoneDrawControls className="w-full" />
            <p className="text-[11px] text-text-muted">
              Shortcut: <kbd className="rounded border border-border-subtle bg-surface-raised px-1">g</kbd> — Polygon-Modus togglen.
            </p>
          </div>
        )}

        {activeTab === 'gams' && (
          <div id="gefahren-tab-gams" role="tabpanel" aria-labelledby="gefahren-tab-btn-gams" className="flex flex-col gap-3 p-4">
            <p className="text-xs text-text-muted">
              GAMS platziert vier konzentrische Zonen (rot/orange/gelb/grün) um einen Mittelpunkt. Klicke „Start“ und dann auf die Karte, um den Mittelpunkt zu setzen — anschließend kannst du die
              Radien anpassen.
            </p>
            <button
              type="button"
              onClick={handleGamsStart}
              className="inline-flex items-center justify-center gap-1.5 rounded-control bg-action-primary px-3 py-2 text-xs font-medium text-text-inverse transition-colors hover:bg-action-primary/90 focus-visible:shadow-focus-ring focus-visible:outline-none"
            >
              <PiTarget className="h-4 w-4" aria-hidden="true" />
              GAMS-Platzierung starten
            </button>
          </div>
        )}

        {activeTab === 'symbole' && (
          <div id="gefahren-tab-symbole" role="tabpanel" aria-labelledby="gefahren-tab-btn-symbole" className="flex flex-col gap-3 p-4">
            <p className="text-xs text-text-muted">Klicke ein Gefahren-Symbol an und platziere es anschließend auf der Karte.</p>
            <div className="grid grid-cols-3 gap-2">
              {SYMBOLS_GEFAHREN.map((symbol) => (
                <button
                  key={symbol.id}
                  type="button"
                  onClick={() => onSelectSymbol(symbol)}
                  title={symbol.label}
                  className="flex flex-col items-center gap-1 rounded-control border border-border-subtle bg-surface-raised p-2 transition-colors hover:border-action-primary hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none"
                >
                  <img src={svgToDataUri(symbol.svgContent)} alt={symbol.label} width={symbol.width} height={symbol.height} className="h-8 w-8" />
                  <span className="max-w-full truncate text-[10px] text-text-muted">{symbol.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

GefahrenToolsSidebar.displayName = 'GefahrenToolsSidebar';
