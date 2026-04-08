/**
 * DrawShortcutBar — Kontextabhängige Shortcut-Anzeige und Aktions-Buttons für Zeichenwerkzeuge
 *
 * Zeigt am unteren Kartenrand relevante Tastenkürzel, Bedienhinweise sowie
 * Aktions-Buttons (Undo/Redo/Löschen) an. Passt sich dynamisch an den aktiven
 * Zeichenmodus, Selektionszustand und Vertex-Bearbeitungsmodus an.
 */

import { cn } from '@/shared/ui/cn';
import { useMemo } from 'react';
import { PiArrowClockwise, PiArrowCounterClockwise, PiRuler, PiTrash } from 'react-icons/pi';
import type { DrawMode } from '../../drawing/types';
import type { FeatureMeasurement } from '../../utils/geo-calculations';

interface Hint {
  /** Tastenkürzel — leer für reine Texthinweise */
  keys: string[];
  label: string;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Strg';
const DEL = isMac ? '⌫' : 'Entf';

/** Modus-spezifische Bedienhinweise */
const MODE_HINTS: Partial<Record<DrawMode, string>> = {
  draw_point: 'Klick zum Setzen',
  draw_line_string: 'Klick für Punkte · Doppelklick zum Abschließen',
  draw_polygon: 'Klick für Punkte · Klick auf Start zum Schließen',
  draw_freehand: 'Ziehen zum Zeichnen',
  draw_text: 'Klick zum Platzieren',
  osm_mark: 'Klick auf Objekt zum Markieren',
};

/** Gemeinsame Styles für Aktions-Buttons */
const actionButtonBase = 'flex items-center justify-center rounded p-1 transition-colors duration-100 focus-visible:shadow-focus-ring focus-visible:outline-none';

export interface DrawShortcutBarProps {
  /** Aktiver Zeichenmodus */
  activeMode: DrawMode;
  /** Hat selektierte Features */
  hasSelection: boolean;
  /** Kann rückgängig gemacht werden */
  canUndo: boolean;
  /** Kann wiederholt werden */
  canRedo: boolean;
  /** Ist im Vertex-Bearbeitungsmodus (direct_select) */
  isDirectSelect: boolean;
  /** Undo ausführen */
  onUndo: () => void;
  /** Redo ausführen */
  onRedo: () => void;
  /** Selektierte Features löschen */
  onDeleteSelected: () => void;
  /** Live-Messung während des Zeichnens */
  liveMeasurement?: FeatureMeasurement | null;
}

export function DrawShortcutBar({ activeMode, hasSelection, canUndo, canRedo, isDirectSelect, onUndo, onRedo, onDeleteSelected, liveMeasurement }: DrawShortcutBarProps) {
  const hints = useMemo<Hint[]>(() => {
    const isActive = activeMode !== 'idle';
    // Hinweise zeigen wenn ein Werkzeug aktiv ist ODER ein Feature selektiert ist
    if (!isActive && !hasSelection) return [];

    const result: Hint[] = [];

    if (isDirectSelect) {
      // Vertex-Bearbeitungsmodus
      result.push({ keys: [], label: 'Punkte ziehen zum Verschieben' });
      result.push({ keys: [DEL], label: 'Punkt entfernen' });
      result.push({ keys: ['Esc'], label: 'Bearbeitung beenden' });
    } else if (hasSelection && !isActive) {
      // Feature selektiert, kein Werkzeug aktiv
      result.push({ keys: [], label: 'Doppelklick zum Bearbeiten' });
      result.push({ keys: [DEL], label: 'Objekt löschen' });
    } else {
      // Zeichenmodus aktiv
      const modeHint = MODE_HINTS[activeMode];
      if (modeHint) {
        result.push({ keys: [], label: modeHint });
      }
      if (hasSelection) {
        result.push({ keys: [DEL], label: 'Löschen' });
      }
      result.push({ keys: ['Esc'], label: 'Werkzeug ablegen' });
    }

    // Undo/Redo-Hinweise nur als Shortcuts (Buttons sind separat)
    if (canUndo) {
      result.push({ keys: [MOD, 'Z'], label: 'Rückgängig' });
    }
    if (canRedo) {
      result.push({ keys: [MOD, '⇧', 'Z'], label: 'Wiederholen' });
    }

    return result;
  }, [activeMode, hasSelection, canUndo, canRedo, isDirectSelect]);

  const hasActions = canUndo || canRedo || hasSelection;
  const showLiveMeasurement = liveMeasurement != null;

  if (hints.length === 0 && !hasActions && !showLiveMeasurement) return null;

  return (
    <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-panel/90 px-3 py-1.5 text-xs text-text-muted shadow-sm backdrop-blur-sm">
        {/* Live-Messung während des Zeichnens */}
        {showLiveMeasurement && (
          <>
            <span className="flex items-center gap-1.5 font-medium text-text-secondary tabular-nums">
              <PiRuler className="h-3.5 w-3.5" aria-hidden="true" />
              {liveMeasurement.label}
            </span>
            {hints.length > 0 && <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />}
          </>
        )}

        {hints.map((hint, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="mr-1.5 h-3 w-px bg-border-subtle" aria-hidden="true" />}
            {hint.keys.length > 0 && (
              <span className="flex items-center gap-0.5">
                {hint.keys.map((key) => (
                  <kbd
                    key={key}
                    className="bg-surface-secondary inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border-subtle px-1 py-0.5 font-mono text-[10px] leading-none font-medium text-text-secondary"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            )}
            <span>{hint.label}</span>
          </span>
        ))}

        {/* Aktions-Buttons */}
        {hasActions && hints.length > 0 && <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />}
        {hasActions && (
          <span className="flex items-center gap-1">
            {canUndo && (
              <button type="button" onClick={onUndo} aria-label="Rückgängig" title="Rückgängig" className={cn(actionButtonBase, 'text-text-muted hover:bg-action-secondary hover:text-text-primary')}>
                <PiArrowCounterClockwise className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {canRedo && (
              <button type="button" onClick={onRedo} aria-label="Wiederholen" title="Wiederholen" className={cn(actionButtonBase, 'text-text-muted hover:bg-action-secondary hover:text-text-primary')}>
                <PiArrowClockwise className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {hasSelection && (
              <button
                type="button"
                onClick={onDeleteSelected}
                aria-label="Auswahl löschen"
                title="Auswahl löschen"
                className={cn(actionButtonBase, 'text-text-muted hover:bg-red-50 hover:text-red-600')}
              >
                <PiTrash className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
