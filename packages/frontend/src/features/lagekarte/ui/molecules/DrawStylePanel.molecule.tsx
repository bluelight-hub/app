/**
 * DrawStylePanel - Stil-Editor für selektierte Zeichnungsobjekte
 *
 * Schwebendes Panel rechts neben der Toolbar. Ermöglicht das Ändern von
 * Farbe, Linienstärke, Füllung und Schraffur für das aktuell ausgewählte Feature.
 */

import { useState } from 'react';
import { cn } from '@/shared/ui/cn';
import type { DrawingStyle, HatchConfig, HatchType } from '../../drawing/types';
import { DEFAULT_HATCH } from '../../drawing/types';

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
  /** Geometrie-Typ des selektierten Features (steuert sichtbare Optionen) */
  geometryType?: string;
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

/** Optionen für Schraffurmuster */
const HATCH_TYPE_OPTIONS: { value: HatchType; label: string }[] = [
  { value: 'none', label: 'Keine' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'cross', label: 'Kreuz' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertikal' },
];

/** Gemeinsame Toggle-Button-Styles */
const toggleBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors duration-100 focus-visible:shadow-focus-ring focus-visible:outline-none';

/** SVG-Icon für Schraffurmuster-Vorschau */
function PatternIcon({ type }: { type: HatchType }) {
  const s = 14;
  const stroke = 'currentColor';
  const sw = 1.5;

  if (type === 'none') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        <line x1={1} y1={1} x2={s - 1} y2={s - 1} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'diagonal') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        <line x1={0} y1={s} x2={s} y2={0} stroke={stroke} strokeWidth={sw} />
        <line x1={-4} y1={s - 4} x2={s - 4} y2={-4} stroke={stroke} strokeWidth={sw} />
        <line x1={4} y1={s + 4} x2={s + 4} y2={4} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  }

  if (type === 'cross') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        <line x1={0} y1={s} x2={s} y2={0} stroke={stroke} strokeWidth={sw} />
        <line x1={0} y1={0} x2={s} y2={s} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  }

  if (type === 'horizontal') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        <line x1={0} y1={4} x2={s} y2={4} stroke={stroke} strokeWidth={sw} />
        <line x1={0} y1={10} x2={s} y2={10} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  }

  // vertical
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
      <line x1={4} y1={0} x2={4} y2={s} stroke={stroke} strokeWidth={sw} />
      <line x1={10} y1={0} x2={10} y2={s} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

export function DrawStylePanel({ style, onStyleChange, isVisible, label, onLabelChange, geometryType }: DrawStylePanelProps) {
  const [hatchExpanded, setHatchExpanded] = useState(false);

  if (!isVisible) return null;

  const isPoint = geometryType === 'Point';
  const showStrokeWidth = !isPoint;
  const showFill = !isPoint;
  const hatch = style.hatch ?? DEFAULT_HATCH;
  const hasHatch = hatch.type !== 'none';

  /** Hatch-Config partiell ändern */
  const updateHatch = (partial: Partial<HatchConfig>) => {
    onStyleChange({ hatch: { ...hatch, ...partial } });
  };

  return (
    <div className={cn('absolute top-4 left-20 z-10 w-52 rounded-lg border border-border-subtle bg-surface-panel p-3 shadow-lg')}>
      {/* Farbauswahl */}
      <div className={cn(showStrokeWidth || showFill || label !== undefined ? 'mb-3' : '')}>
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

      {/* Linienstärke (nicht für Punkte) */}
      {showStrokeWidth && (
        <div className={cn(showFill || label !== undefined ? 'mb-3' : '')}>
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
      )}

      {/* Füllung Toggle + Deckkraft (nicht für Punkte) */}
      {showFill && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={style.fillEnabled !== false} onChange={(e) => onStyleChange({ fillEnabled: e.target.checked })} className="h-3 w-3 accent-action-primary" />
              <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">Füllung</span>
            </label>
            {style.fillEnabled !== false && <span className="text-xs text-text-muted tabular-nums">{Math.round(style.fillOpacity * 100)}%</span>}
          </div>
          {style.fillEnabled !== false && (
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(style.fillOpacity * 100)}
              onChange={(e) => onStyleChange({ fillOpacity: Number(e.target.value) / 100 })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-subtle accent-action-primary"
              aria-label="Füll-Deckkraft"
            />
          )}
        </div>
      )}

      {/* Schraffur (nicht für Punkte) */}
      {showFill && (
        <div className={cn(label !== undefined ? 'mb-3' : '')}>
          <div className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">Schraffur</div>
          {/* Muster-Buttons */}
          <div className="flex gap-1">
            {HATCH_TYPE_OPTIONS.map(({ value, label: patternLabel }) => (
              <button
                key={value}
                type="button"
                title={patternLabel}
                onClick={() => updateHatch({ type: value })}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded border transition-colors duration-100',
                  'focus-visible:shadow-focus-ring focus-visible:outline-none',
                  hatch.type === value ? 'border-action-primary bg-action-secondary' : 'border-border-subtle hover:bg-action-secondary',
                )}
                aria-label={`Schraffur: ${patternLabel}`}
              >
                <PatternIcon type={value} />
              </button>
            ))}
          </div>

          {/* Disclosure: "Anpassen..." */}
          {hasHatch && (
            <div className="mt-1.5">
              <button type="button" onClick={() => setHatchExpanded((prev) => !prev)} className="flex items-center gap-1 text-[10px] text-action-primary hover:text-action-primary/80">
                <span className={cn('inline-block transition-transform', hatchExpanded && 'rotate-180')}>&#9660;</span>
                Anpassen…
              </button>

              {hatchExpanded && (
                <div className="mt-1.5 rounded-md border border-border-subtle bg-surface-panel/50 p-2">
                  {/* Abstand */}
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wide text-text-muted uppercase">Abstand</span>
                      <span className="text-[10px] text-text-muted tabular-nums">{hatch.spacing}px</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={32}
                      step={2}
                      value={hatch.spacing}
                      onChange={(e) => updateHatch({ spacing: Number(e.target.value) })}
                      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border-subtle accent-action-primary"
                      aria-label="Schraffur-Abstand"
                    />
                  </div>

                  {/* Strichstärke */}
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wide text-text-muted uppercase">Stärke</span>
                      <span className="text-[10px] text-text-muted tabular-nums">{hatch.width}px</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={4}
                      step={0.5}
                      value={hatch.width}
                      onChange={(e) => updateHatch({ width: Number(e.target.value) })}
                      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border-subtle accent-action-primary"
                      aria-label="Schraffur-Strichstärke"
                    />
                  </div>

                  {/* Farbe */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wide text-text-muted uppercase">Farbe</span>
                      <label className="flex items-center gap-1 text-[10px] text-text-muted">
                        <input type="checkbox" checked={hatch.color === ''} onChange={(e) => updateHatch({ color: e.target.checked ? '' : style.color })} className="h-3 w-3 accent-action-primary" />
                        Auto
                      </label>
                    </div>
                    {hatch.color !== '' && (
                      <div className="flex flex-wrap gap-1">
                        {COLOR_SWATCHES.map(({ value, label: colorLabel }) => (
                          <button
                            key={value}
                            type="button"
                            title={colorLabel}
                            onClick={() => updateHatch({ color: value })}
                            className={cn(
                              'h-4 w-4 rounded-full border-2 transition-transform duration-100',
                              'hover:scale-110 focus-visible:shadow-focus-ring focus-visible:outline-none',
                              hatch.color === value ? 'scale-110 border-text-primary' : 'border-transparent',
                            )}
                            style={{ backgroundColor: value }}
                            aria-label={`Schraffurfarbe: ${colorLabel}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
