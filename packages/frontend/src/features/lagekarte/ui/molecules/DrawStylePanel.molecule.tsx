/**
 * DrawStylePanel - Stil-Editor für selektierte Zeichnungsobjekte
 *
 * Schwebendes Panel rechts neben der Toolbar. Ermöglicht das Ändern von
 * Farbe, Linienstärke und Füllung für das aktuell ausgewählte Feature.
 */

import { cn } from '@/shared/ui/cn';
import type { DrawingStyle } from '../../drawing/types';

/** Props für die DrawStylePanel-Komponente */
export interface DrawStylePanelProps {
  /** Aktueller Stil des selektierten Features */
  style: DrawingStyle;
  /** Stil ändern */
  onStyleChange: (style: Partial<DrawingStyle>) => void;
  /** Ob das Panel sichtbar ist */
  isVisible: boolean;
  /** Optionales Label (für Text-Features) */
  label?: string;
  /** Label ändern */
  onLabelChange?: (label: string) => void;
}

/** Vordefinierte Farben für die Farbauswahl */
const COLOR_SWATCHES = [
  { value: '#ef4444', label: 'Rot' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Gelb' },
  { value: '#22c55e', label: 'Grün' },
  { value: '#3b82f6', label: 'Blau' },
  { value: '#8b5cf6', label: 'Lila' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#1e293b', label: 'Dunkel' },
] as const;

/** Optionen für Linienstärke */
const STROKE_WIDTH_OPTIONS = [
  { value: 1, label: 'Dünn' },
  { value: 2, label: 'Mittel' },
  { value: 4, label: 'Dick' },
] as const;

/** Optionen für Füll-Deckkraft */
const FILL_OPACITY_OPTIONS = [
  { value: 0, label: 'Keine' },
  { value: 0.2, label: 'Leicht' },
  { value: 0.5, label: 'Solide' },
] as const;

/** Gemeinsame Toggle-Button-Styles */
const toggleBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors duration-100 focus-visible:shadow-focus-ring focus-visible:outline-none';

export function DrawStylePanel({ style, onStyleChange, isVisible, label, onLabelChange }: DrawStylePanelProps) {
  if (!isVisible) return null;

  return (
    <div className={cn('absolute top-4 left-20 z-10 w-52 rounded-lg border border-border-subtle bg-surface-panel p-3 shadow-lg')}>
      {/* Farbauswahl */}
      <div className="mb-3">
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">Farbe</div>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_SWATCHES.map(({ value, label: colorLabel }) => (
            <button
              key={value}
              type="button"
              title={colorLabel}
              onClick={() => onStyleChange({ color: value, fillColor: value })}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform duration-100',
                'hover:scale-110 focus-visible:shadow-focus-ring focus-visible:outline-none',
                style.color === value ? 'scale-110 border-text-primary' : 'border-transparent',
              )}
              style={{ backgroundColor: value }}
              aria-label={colorLabel}
            />
          ))}
        </div>
      </div>

      {/* Linienstärke */}
      <div className="mb-3">
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">Linienstärke</div>
        <div className="flex gap-1">
          {STROKE_WIDTH_OPTIONS.map(({ value, label: widthLabel }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStyleChange({ strokeWidth: value })}
              className={cn(toggleBase, style.strokeWidth === value ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
            >
              {widthLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Füllung */}
      <div className={cn(label !== undefined ? 'mb-3' : '')}>
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">Füllung</div>
        <div className="flex gap-1">
          {FILL_OPACITY_OPTIONS.map(({ value, label: fillLabel }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStyleChange({ fillOpacity: value })}
              className={cn(toggleBase, style.fillOpacity === value ? 'bg-action-secondary text-action-primary' : 'text-text-primary hover:bg-action-secondary')}
            >
              {fillLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Text-Label (nur für Text-Features) */}
      {label !== undefined && onLabelChange && (
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">Beschriftung</div>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className={cn(
              'w-full rounded border border-border-subtle bg-surface-panel px-2 py-1 text-sm text-text-primary',
              'focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none',
            )}
            placeholder="Text eingeben..."
          />
        </div>
      )}
    </div>
  );
}
