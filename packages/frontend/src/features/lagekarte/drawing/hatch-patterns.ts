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
 */
export function buildHatchImageName(type: HatchType, spacing: number, width: number, resolvedColor: string): string {
  const hex = resolvedColor.replace('#', '');
  return `hatch-${type}-${spacing}-${width}-${hex}`;
}

/**
 * Erzeugt ein nahtlos kachelbares Canvas-Pattern als ImageData.
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

function drawDiagonal(ctx: CanvasRenderingContext2D, size: number): void {
  for (const offset of [-size, 0, size]) {
    ctx.beginPath();
    ctx.moveTo(offset, size);
    ctx.lineTo(size + offset, 0);
    ctx.stroke();
  }
}

function drawReverseDiagonal(ctx: CanvasRenderingContext2D, size: number): void {
  for (const offset of [-size, 0, size]) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(size + offset, size);
    ctx.stroke();
  }
}

function drawHorizontal(ctx: CanvasRenderingContext2D, size: number): void {
  const half = size / 2;
  for (let y = half / 2; y < size; y += half) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

function drawVertical(ctx: CanvasRenderingContext2D, size: number): void {
  const half = size / 2;
  for (let x = half / 2; x < size; x += half) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

const registeredImages = new Set<string>();

/**
 * Stellt sicher, dass ein Hatch-Image auf der Map registriert ist.
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
 */
export function reregisterHatchImages(map: MaplibreMap | undefined): void {
  if (!map) return;

  for (const name of registeredImages) {
    if (map.hasImage(name)) continue;
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
 * Migriert einen alten FillPattern-String zu einem HatchConfig.
 */
export function migrateLegacyFillPattern(fillPattern: string): HatchConfig | null {
  const legacyTypes = ['hatch-diagonal', 'hatch-cross', 'hatch-horizontal', 'hatch-vertical'];
  if (!legacyTypes.includes(fillPattern)) return null;
  const type = fillPattern.replace('hatch-', '') as HatchType;
  return { type, spacing: 12, width: 1.5, color: '' };
}
