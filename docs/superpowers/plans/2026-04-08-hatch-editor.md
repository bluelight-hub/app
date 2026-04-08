# Erweiterter Schraffur-Editor — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schraffurmuster auf der Lagekarte detailliert konfigurierbar machen — Mustertyp, Abstand, Strichstärke und Farbe — mit dynamischer Canvas-Generierung und data-driven MapLibre `fill-pattern`.

**Architecture:** Das alte `FillPattern` String-Enum wird durch ein `HatchConfig`-Objekt ersetzt. Pattern-Images werden dynamisch per Canvas erzeugt und on-demand auf der Map registriert. Die 8 hardcoded Hatch-Layer werden auf 2 data-driven Layer reduziert (MapLibre v5 unterstützt data-driven `fill-pattern`). Die UI bekommt eine Aufklapp-Sektion "Anpassen..." unter den Muster-Buttons.

**Tech Stack:** React 19, MapLibre GL v5.22.0, MapboxDraw v1.5.1, Tailwind CSS, Canvas API

**Hinweis zu Tests:** Canvas-basierte Pattern-Generierung und MapboxDraw-Integration sind schwer unit-testbar. Verifikation erfolgt über TypeScript-Compilation und manuellen Browser-Test. Jeder Task endet mit `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-04-08-hatch-editor-design.md`

---

### File Structure

| Datei | Aktion | Verantwortung |
|-------|--------|---------------|
| `packages/frontend/src/features/lagekarte/drawing/types.ts` | Modify | `HatchConfig` Interface, `DrawingStyle.hatch` ersetzt `fillPattern` |
| `packages/frontend/src/features/lagekarte/drawing/hatch-patterns.ts` | Rewrite | Parametrische Image-Generierung, `ensureHatchImage()`, Migration |
| `packages/frontend/src/features/lagekarte/drawing/draw-styles.ts` | Modify | 8 Hatch-Layer → 2 data-driven Layer |
| `packages/frontend/src/features/lagekarte/ui/molecules/DrawStylePanel.molecule.tsx` | Modify | Aufklapp-Sektion mit Slidern + Farbauswahl |
| `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` | Modify | Hatch-Config lesen/schreiben, Image-Registrierung, Migration |
| `packages/frontend/src/features/lagekarte/hooks/use-draw-control.ts` | Modify | `hatch` + `fillPattern` auf neue Features setzen |

---

### Task 1: Typen-Refactoring (types.ts)

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/drawing/types.ts`

- [ ] **Step 1: HatchConfig und HatchType hinzufügen, FillPattern + fillPattern ersetzen**

Ersetze den gesamten Inhalt von `types.ts`:

```typescript
/**
 * Typen für die Lagekarte-Zeichenwerkzeuge
 *
 * Gemeinsame Typen für Draw-Modi, Styles und Feature-Properties.
 */

/** Verfügbare Zeichenmodi */
export type DrawMode = 'idle' | 'select' | 'draw_point' | 'draw_line_string' | 'draw_polygon' | 'draw_freehand' | 'draw_text' | 'osm_mark';

/** Status einer OSM-Markierung */
export type OsmMarkierungStatus = 'betroffen' | 'gesperrt' | 'evakuiert';

/** Verfügbare Schraffur-Mustertypen */
export type HatchType = 'none' | 'diagonal' | 'cross' | 'horizontal' | 'vertical';

/** Konfiguration für Schraffurmuster */
export interface HatchConfig {
  /** Mustertyp */
  type: HatchType;
  /** Kachel-Größe / Linienabstand in Pixel (6–32) */
  spacing: number;
  /** Strichstärke der Schraffurlinien in Pixel (0.5–4) */
  width: number;
  /** Linienfarbe als Hex-String. Leer = Randfarbe des Features übernehmen */
  color: string;
}

/** Standard-Schraffur-Konfiguration */
export const DEFAULT_HATCH: HatchConfig = {
  type: 'none',
  spacing: 12,
  width: 1.5,
  color: '',
};

/** Stil-Eigenschaften für Zeichnungsobjekte */
export interface DrawingStyle {
  /** Linienfarbe (Hex) */
  color: string;
  /** Linien-Deckkraft (0–1) */
  opacity: number;
  /** Linienstärke in Pixel */
  strokeWidth: number;
  /** Strichmuster, z.B. '5,5' — Hinweis: Nicht data-driven per Feature unterstützt (MapboxDraw-Limitation) */
  strokeDasharray?: string;
  /** Füllfarbe (Hex) */
  fillColor: string;
  /** Füll-Deckkraft (0–1) */
  fillOpacity: number;
  /** Schraffur-Konfiguration */
  hatch: HatchConfig;
}

/** Standard-Stil für neue Zeichnungen */
export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#3b82f6',
  opacity: 1,
  strokeWidth: 2,
  fillColor: '#3b82f6',
  fillOpacity: 0.2,
  hatch: { ...DEFAULT_HATCH },
};

/** Properties eines gezeichneten GeoJSON-Features */
export interface DrawFeatureProperties {
  /** Stil-Überschreibung für dieses Feature */
  drawingStyle?: DrawingStyle;
  /** Beschriftung (für Text-Features) */
  label?: string;
  /** Typ des Features */
  featureType: 'drawing' | 'osm_marking';
  /** OSM-Feature-ID (nur für OSM-Markierungen) */
  osmFeatureId?: string;
  /** OSM-Layer-ID (nur für OSM-Markierungen) */
  osmLayerId?: string;
  /** Markierungsstatus (nur für OSM-Markierungen) */
  osmStatus?: OsmMarkierungStatus;
}

/** Farbzuordnung für OSM-Markierungsstatus */
export const OSM_MARKING_COLORS: Record<OsmMarkierungStatus, string> = {
  betroffen: '#fbbf24',
  gesperrt: '#ef4444',
  evakuiert: '#a855f7',
};
```

- [ ] **Step 2: TypeScript-Fehler prüfen (es werden Fehler erwartet — andere Dateien referenzieren noch FillPattern)**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit 2>&1 | head -30`

Expected: Fehler in `DrawStylePanel.molecule.tsx`, `LagekarteView.tsx` (Referenzen auf `FillPattern`, `fillPattern`). Das ist korrekt — wird in späteren Tasks gefixt.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/lagekarte/drawing/types.ts
git commit -m "♻️(frontend): HatchConfig ersetzt FillPattern in Drawing-Typen (#637)"
```

---

### Task 2: Parametrische Pattern-Generierung (hatch-patterns.ts)

**Files:**
- Rewrite: `packages/frontend/src/features/lagekarte/drawing/hatch-patterns.ts`

- [ ] **Step 1: hatch-patterns.ts komplett neu schreiben**

Ersetze den gesamten Inhalt:

```typescript
/**
 * Dynamische Schraffurmuster-Generierung für die Lagekarte
 *
 * Erzeugt parametrisierte Canvas-basierte Schraffurmuster und registriert
 * sie on-demand auf der MapLibre-Instanz. Jede Parameterkombination
 * (Typ, Abstand, Stärke, Farbe) erzeugt ein eigenes Image.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import type { HatchConfig, HatchType } from './types';

/**
 * Erzeugt einen deterministischen Image-Namen aus der Hatch-Konfiguration.
 *
 * Format: `hatch-{type}-{spacing}-{width}-{colorHex}`
 * Der colorHex ist die aufgelöste Farbe (nach Fallback auf Randfarbe).
 */
export function buildHatchImageName(type: HatchType, spacing: number, width: number, resolvedColor: string): string {
  const hex = resolvedColor.replace('#', '');
  return `hatch-${type}-${spacing}-${width}-${hex}`;
}

/**
 * Erzeugt ein nahtlos kachelbares Canvas-Pattern als ImageData.
 *
 * @param type - Mustertyp (diagonal, cross, horizontal, vertical)
 * @param spacing - Kachel-Größe in Pixel (bestimmt Linienabstand)
 * @param width - Strichstärke in Pixel
 * @param color - CSS-Farbwert für die Schraffurlinien
 */
export function createHatchImage(type: HatchType, spacing: number, width: number, color: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = spacing;
  canvas.height = spacing;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;

  switch (type) {
    case 'diagonal':
      drawDiagonal(ctx, spacing);
      break;
    case 'cross':
      drawDiagonal(ctx, spacing);
      drawReverseDiagonal(ctx, spacing);
      break;
    case 'horizontal':
      drawHorizontal(ctx, spacing);
      break;
    case 'vertical':
      drawVertical(ctx, spacing);
      break;
    default:
      break;
  }

  return ctx.getImageData(0, 0, spacing, spacing);
}

/** Diagonale Linien (/) mit Wrap für nahtloses Kacheln */
function drawDiagonal(ctx: CanvasRenderingContext2D, size: number): void {
  for (const offset of [-size, 0, size]) {
    ctx.beginPath();
    ctx.moveTo(offset, size);
    ctx.lineTo(size + offset, 0);
    ctx.stroke();
  }
}

/** Umgekehrte Diagonale (\) mit Wrap für nahtloses Kacheln */
function drawReverseDiagonal(ctx: CanvasRenderingContext2D, size: number): void {
  for (const offset of [-size, 0, size]) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(size + offset, size);
    ctx.stroke();
  }
}

/** Horizontale Linien mit gleichmäßigem Abstand */
function drawHorizontal(ctx: CanvasRenderingContext2D, size: number): void {
  const half = size / 2;
  for (let y = half / 2; y < size; y += half) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

/** Vertikale Linien mit gleichmäßigem Abstand */
function drawVertical(ctx: CanvasRenderingContext2D, size: number): void {
  const half = size / 2;
  for (let x = half / 2; x < size; x += half) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

/** Set registrierter Image-Namen (für Re-Registrierung bei Style-Wechsel) */
const registeredImages = new Set<string>();

/**
 * Stellt sicher, dass ein Hatch-Image auf der Map registriert ist.
 * Erzeugt es bei Bedarf per Canvas und gibt den Image-Namen zurück.
 *
 * @param map - MapLibre-Map-Instanz
 * @param config - Hatch-Konfiguration
 * @param fallbackColor - Randfarbe des Features (Fallback wenn config.color leer)
 * @returns Image-Name für fill-pattern, oder '' wenn type === 'none'
 */
export function ensureHatchImage(map: MaplibreMap | undefined, config: HatchConfig, fallbackColor: string): string {
  if (!map || config.type === 'none') return '';

  const resolvedColor = config.color || fallbackColor;
  const name = buildHatchImageName(config.type, config.spacing, config.width, resolvedColor);

  if (!map.hasImage(name)) {
    map.addImage(name, createHatchImage(config.type, config.spacing, config.width, resolvedColor));
    registeredImages.add(name);
  }

  return name;
}

/**
 * Re-registriert alle bekannten Hatch-Images nach einem Style-Wechsel.
 * style.load entfernt alle Images — diese Funktion stellt sie wieder her.
 *
 * Wird von LagekarteView beim style.load Event aufgerufen.
 */
export function reregisterHatchImages(map: MaplibreMap | undefined): void {
  if (!map) return;

  for (const name of registeredImages) {
    if (map.hasImage(name)) continue;

    // Image-Name parsen: hatch-{type}-{spacing}-{width}-{hex}
    const parts = name.split('-');
    if (parts.length < 5) continue;
    const type = parts[1] as HatchType;
    const spacing = Number(parts[2]);
    const width = Number(parts[3]);
    const hex = `#${parts.slice(4).join('-')}`;

    map.addImage(name, createHatchImage(type, spacing, width, hex));
  }
}

/**
 * Migriert einen alten FillPattern-String (z.B. 'hatch-diagonal') zu einem HatchConfig.
 * Gibt null zurück wenn der Wert bereits ein neues Format ist oder 'none'.
 */
export function migrateLegacyFillPattern(fillPattern: string): HatchConfig | null {
  const legacyTypes = ['hatch-diagonal', 'hatch-cross', 'hatch-horizontal', 'hatch-vertical'];
  if (!legacyTypes.includes(fillPattern)) return null;

  const type = fillPattern.replace('hatch-', '') as HatchType;
  return { type, spacing: 12, width: 1.5, color: '' };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/features/lagekarte/drawing/hatch-patterns.ts
git commit -m "♻️(frontend): Parametrische Hatch-Pattern-Generierung (#637)"
```

---

### Task 3: Draw-Styles vereinfachen (draw-styles.ts)

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/drawing/draw-styles.ts`

- [ ] **Step 1: 8 Hatch-Layer durch 2 data-driven Layer ersetzen**

Ersetze die 8 Hatch-Layer (Zeilen 31–83, `gl-draw-polygon-hatch-diagonal-inactive` bis `gl-draw-polygon-hatch-vertical-active`) durch genau 2 Layer. Der neue Block kommt direkt nach dem `gl-draw-polygon-fill-active` Layer (nach Zeile 30):

Lösche die alten 8 Hatch-Layer und den Kommentar `// Polygon-Schraffur: Diagonal (inaktiv)` bis einschließlich `paint: { 'fill-pattern': 'hatch-vertical', 'fill-opacity': ... },` und ersetze durch:

```javascript
  // Polygon-Schraffur (inaktiv) — data-driven fill-pattern, ein Layer für alle Muster
  {
    id: 'gl-draw-polygon-hatch-inactive',
    type: 'fill',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static'], ['has', 'user_fillPattern'], ['!=', ['get', 'user_fillPattern'], '']],
    paint: {
      'fill-pattern': ['get', 'user_fillPattern'],
      'fill-opacity': ['coalesce', ['get', 'user_fillOpacity'], 0.2],
    },
  },
  // Polygon-Schraffur (aktiv)
  {
    id: 'gl-draw-polygon-hatch-active',
    type: 'fill',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon'], ['has', 'user_fillPattern'], ['!=', ['get', 'user_fillPattern'], '']],
    paint: {
      'fill-pattern': ['get', 'user_fillPattern'],
      'fill-opacity': ['coalesce', ['get', 'user_fillOpacity'], 0.2],
    },
  },
```

Entferne auch den obsoleten Kommentar `// Separate Layer pro Muster nötig, da fill-pattern in MapLibre nicht data-driven ist`.

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/features/lagekarte/drawing/draw-styles.ts
git commit -m "♻️(frontend): 8 Hatch-Layer → 2 data-driven Layer (#637)"
```

---

### Task 4: DrawStylePanel UI (DrawStylePanel.molecule.tsx)

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/ui/molecules/DrawStylePanel.molecule.tsx`

- [ ] **Step 1: Kompletten Inhalt der Datei ersetzen**

```typescript
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

      {/* Deckkraft-Slider (nicht für Punkte) */}
      {showFill && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">Deckkraft</span>
            <span className="text-xs tabular-nums text-text-muted">{Math.round(style.fillOpacity * 100)}%</span>
          </div>
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
              <button
                type="button"
                onClick={() => setHatchExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-[10px] text-action-primary hover:text-action-primary/80"
              >
                <span className={cn('inline-block transition-transform', hatchExpanded && 'rotate-180')}>&#9660;</span>
                Anpassen…
              </button>

              {hatchExpanded && (
                <div className="mt-1.5 rounded-md border border-border-subtle bg-surface-panel/50 p-2">
                  {/* Abstand */}
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Abstand</span>
                      <span className="text-[10px] tabular-nums text-text-muted">{hatch.spacing}px</span>
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
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Stärke</span>
                      <span className="text-[10px] tabular-nums text-text-muted">{hatch.width}px</span>
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
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Farbe</span>
                      <label className="flex items-center gap-1 text-[10px] text-text-muted">
                        <input
                          type="checkbox"
                          checked={hatch.color === ''}
                          onChange={(e) => updateHatch({ color: e.target.checked ? '' : style.color })}
                          className="h-3 w-3 accent-action-primary"
                        />
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/features/lagekarte/ui/molecules/DrawStylePanel.molecule.tsx
git commit -m "✨(frontend): DrawStylePanel Schraffur-Aufklapp-Sektion (#637)"
```

---

### Task 5: LagekarteView Integration + Migration

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx`

- [ ] **Step 1: Imports aktualisieren**

Ersetze die alten Imports:

```typescript
// Alt:
import type { DrawingStyle, FillPattern } from '@/features/lagekarte/drawing/types';
import { registerHatchPatterns } from '@/features/lagekarte/drawing/hatch-patterns';

// Neu:
import type { DrawingStyle, HatchConfig } from '@/features/lagekarte/drawing/types';
import { DEFAULT_HATCH } from '@/features/lagekarte/drawing/types';
import { ensureHatchImage, migrateLegacyFillPattern, reregisterHatchImages } from '@/features/lagekarte/drawing/hatch-patterns';
```

- [ ] **Step 2: onLoad und style.load Registrierung aktualisieren**

Ersetze den `onLoad`-Handler:

```typescript
// Alt:
onLoad={() => {
  registerHatchPatterns(mapRef.current?.getMap());
  setIsLoading(false);
}}

// Neu:
onLoad={() => setIsLoading(false)}
```

Ersetze den `style.load` useEffect:

```typescript
// Alt:
useEffect(() => {
  const map = mapRef.current?.getMap();
  if (!map || isLoading) return;
  const reregister = () => registerHatchPatterns(map);
  map.on('style.load', reregister);
  return () => { map.off('style.load', reregister); };
}, [isLoading]);

// Neu:
useEffect(() => {
  const map = mapRef.current?.getMap();
  if (!map || isLoading) return;
  const reregister = () => reregisterHatchImages(map);
  map.on('style.load', reregister);
  return () => { map.off('style.load', reregister); };
}, [isLoading]);
```

- [ ] **Step 3: Feature-Selektion mit Migration aktualisieren**

Ersetze den Feature-Laden-Effect (I4 Block):

```typescript
  // I4: Stil des selektierten Features in das StylePanel laden
  useEffect(() => {
    if (selectedFeatureIds.length === 0) return;
    const draw = drawRef.current;
    if (!draw) return;
    const feature = draw.get(selectedFeatureIds[0]);
    if (!feature?.properties) return;
    const props = feature.properties;

    // Hatch-Config wiederherstellen (neues Format oder Legacy-Migration)
    let hatch: HatchConfig = { ...DEFAULT_HATCH };
    if (props.hatch) {
      try {
        hatch = typeof props.hatch === 'string' ? JSON.parse(props.hatch) : props.hatch;
      } catch {
        // Ungültiges JSON — Default beibehalten
      }
    } else if (props.fillPattern) {
      // Legacy-Migration: alter String-Enum → HatchConfig
      const migrated = migrateLegacyFillPattern(props.fillPattern);
      if (migrated) hatch = migrated;
    }

    setActiveStyle((prev) => ({
      ...prev,
      ...(props.color && { color: props.color }),
      ...(props.fillColor && { fillColor: props.fillColor }),
      ...(props.strokeWidth != null && { strokeWidth: props.strokeWidth }),
      ...(props.fillOpacity != null && { fillOpacity: props.fillOpacity }),
      ...(props.strokeDasharray && { strokeDasharray: props.strokeDasharray }),
      hatch,
    }));
  }, [selectedFeatureIds, drawRef]);
```

- [ ] **Step 4: handleStyleChange mit dynamischer Image-Registrierung aktualisieren**

Ersetze `handleStyleChange`:

```typescript
  /** Stil ändern und auf selektierte Features anwenden */
  const handleStyleChange = useCallback(
    (partial: Partial<DrawingStyle>) => {
      const next = { ...activeStyle, ...partial };
      setActiveStyle(next);
      const draw = drawRef.current;
      if (!draw) return;
      const map = mapRef.current?.getMap();

      for (const id of selectedFeatureIds) {
        // Einfache Properties setzen
        for (const [key, value] of Object.entries(partial)) {
          if (key === 'hatch') continue; // Hatch separat behandeln
          draw.setFeatureProperty(id, key, value);
        }

        // Hatch-Config: als JSON speichern + Image-Namen berechnen
        if (partial.hatch !== undefined) {
          const hatch = next.hatch;
          draw.setFeatureProperty(id, 'hatch', JSON.stringify(hatch));
          const imageName = ensureHatchImage(map, hatch, next.color);
          draw.setFeatureProperty(id, 'fillPattern', imageName);
        }

        // Wenn sich die Randfarbe ändert und Hatch "Auto"-Farbe nutzt → Image neu berechnen
        if ((partial.color !== undefined) && next.hatch.type !== 'none' && next.hatch.color === '') {
          const imageName = ensureHatchImage(map, next.hatch, next.color);
          draw.setFeatureProperty(id, 'fillPattern', imageName);
        }

        // MapboxDraw Render erzwingen (setFeatureProperty triggert keinen Render)
        const updated = draw.get(id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (updated) draw.add(updated as any);
      }
      scheduleAutoSave();
    },
    [activeStyle, selectedFeatureIds, drawRef, mapRef, scheduleAutoSave],
  );
```

- [ ] **Step 5: TypeScript-Fehler prüfen**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit 2>&1 | head -20`

Expected: Noch Fehler in `use-draw-control.ts` (referenziert noch `fillPattern`). Wird in Task 6 gefixt.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx
git commit -m "✨(frontend): LagekarteView Hatch-Integration mit Migration (#637)"
```

---

### Task 6: use-draw-control anpassen

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/hooks/use-draw-control.ts`

- [ ] **Step 1: Import aktualisieren**

Füge Import hinzu (am Anfang der Imports):

```typescript
import { ensureHatchImage } from '../drawing/hatch-patterns';
```

- [ ] **Step 2: handleCreate aktualisieren — Hatch-Properties auf neue Features setzen**

Ersetze den Block in `handleCreate` wo Properties gesetzt werden (Zeilen 194–199):

```typescript
        // Alt:
        draw.setFeatureProperty(featureId, 'color', currentStyle.color);
        draw.setFeatureProperty(featureId, 'fillColor', currentStyle.fillColor);
        draw.setFeatureProperty(featureId, 'strokeWidth', currentStyle.strokeWidth);
        draw.setFeatureProperty(featureId, 'fillOpacity', currentStyle.fillOpacity);
        draw.setFeatureProperty(featureId, 'fillPattern', currentStyle.fillPattern);
        draw.setFeatureProperty(featureId, 'featureType', 'drawing');

        // Neu:
        draw.setFeatureProperty(featureId, 'color', currentStyle.color);
        draw.setFeatureProperty(featureId, 'fillColor', currentStyle.fillColor);
        draw.setFeatureProperty(featureId, 'strokeWidth', currentStyle.strokeWidth);
        draw.setFeatureProperty(featureId, 'fillOpacity', currentStyle.fillOpacity);
        draw.setFeatureProperty(featureId, 'hatch', JSON.stringify(currentStyle.hatch));
        const map = mapRef.current?.getMap();
        const imageName = ensureHatchImage(map, currentStyle.hatch, currentStyle.color);
        draw.setFeatureProperty(featureId, 'fillPattern', imageName);
        draw.setFeatureProperty(featureId, 'featureType', 'drawing');
```

Hinweis: `mapRef` ist bereits als Parameter in `useDrawControl` verfügbar (`UseDrawControlOptions.mapRef`), also über den Closure zugänglich.

- [ ] **Step 3: TypeScript komplett prüfen**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit`

Expected: Keine Fehler. Alle alten `FillPattern`-Referenzen sind entfernt.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/lagekarte/hooks/use-draw-control.ts
git commit -m "✨(frontend): use-draw-control mit HatchConfig (#637)"
```

---

### Task 7: Endverifikation

- [ ] **Step 1: Vollständiger TypeScript-Check**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit`

Expected: Keine Fehler.

- [ ] **Step 2: Grep nach verwaisten FillPattern-Referenzen**

Run: `grep -r "FillPattern\|fillPattern.*hatch-" packages/frontend/src/features/lagekarte/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".d.ts"`

Expected: Keine Treffer auf den alten `FillPattern` Typ. `fillPattern` als Feature-Property-Name (in setFeatureProperty-Calls und draw-styles Filtern) ist korrekt — das ist der MapboxDraw Property-Name, nicht der alte Type.

- [ ] **Step 3: Manueller Browser-Test**

Checklist:
1. Polygon zeichnen → Schraffur "Diagonal" auswählen → Muster sichtbar?
2. "Anpassen..." öffnen → Abstand-Slider ziehen → Pattern ändert sich live?
3. Stärke-Slider → Linien werden dicker/dünner?
4. "Auto" Farbe deaktivieren → andere Farbe wählen → Schraffur ändert Farbe?
5. Randfarbe ändern bei Auto-Farbe → Schraffur folgt?
6. Deckkraft-Slider → Schraffur + Füllung werden beide transparent?
7. Basislayer wechseln (OSM ↔ Satellite) → Schraffur bleibt?
8. Feature deselektieren + wieder selektieren → alle Werte korrekt geladen?
9. Undo/Redo mit Schraffur → funktioniert?

- [ ] **Step 4: Abschluss-Commit (nur falls Fixes nötig)**

```bash
git add -A
git commit -m "🐛(frontend): Hatch-Editor Verifikation Fixes (#637)"
```
