/**
 * Pfeilspitze als programmatisch erzeugtes SDF-Image für MapLibre
 *
 * Wird beim Map-Init registriert und von den Arrow-Style-Layern referenziert.
 * SDF-Modus ermöglicht Einfärbung über icon-color im Style-Layer.
 *
 * Die Spitze zeigt nach OBEN (Nord), damit icon-rotate direkt den
 * geographischen Bearing verwenden kann (0°=Nord, 90°=Ost).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';

/** Image-Name für die Pfeilspitze (konsistente Referenzierung) */
export const ARROW_HEAD_IMAGE = 'arrow-head';

/** Größe des SDF-Images in Pixel */
const SIZE = 48;

/**
 * Berechnet die kürzeste Distanz von einem Punkt zu einer Linienstrecke.
 */
function distanzZuStrecke(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Berechnet die signierte Distanz eines Punktes zu einem Dreieck.
 * Negativ = innerhalb, Positiv = außerhalb, 0 = auf der Kante.
 */
function signierteDreieckDistanz(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const cross = (ox: number, oy: number, ex: number, ey: number, fx: number, fy: number) => (ex - ox) * (fy - oy) - (ey - oy) * (fx - ox);

  const d1 = cross(px, py, ax, ay, bx, by);
  const d2 = cross(px, py, bx, by, cx, cy);
  const d3 = cross(px, py, cx, cy, ax, ay);

  const inside = (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);

  const dist = Math.min(distanzZuStrecke(px, py, ax, ay, bx, by), distanzZuStrecke(px, py, bx, by, cx, cy), distanzZuStrecke(px, py, cx, cy, ax, ay));

  return inside ? -dist : dist;
}

/**
 * Erzeugt ein RGBA-Dreieck (Pfeilspitze nach OBEN zeigend) als echtes SDF.
 *
 * Echte Signed-Distance-Field-Werte ermöglichen glatte, anti-aliaste Kanten
 * im Gegensatz zu binären 0/255-Werten.
 *
 * Dreieck-Koordinaten (48×48 Image):
 * - Spitze: (24, 2) — oben-mitte
 * - Links:  (6, 42) — unten-links
 * - Rechts: (42, 42) — unten-rechts
 */
function createArrowHeadSDF(): Uint8Array {
  const data = new Uint8Array(SIZE * SIZE * 4);

  // Dreieck: Spitze oben-mitte, Basis unten
  const tipX = SIZE / 2;
  const tipY = 2;
  const baseLeftX = 6;
  const baseLeftY = SIZE - 6;
  const baseRightX = SIZE - 6;
  const baseRightY = SIZE - 6;

  // SDF-Buffer: Pixel-Bereich für den Distanz-Gradienten (Anti-Aliasing)
  const BUFFER = 8;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const offset = (y * SIZE + x) * 4;
      const dist = signierteDreieckDistanz(x, y, tipX, tipY, baseLeftX, baseLeftY, baseRightX, baseRightY);

      // SDF-Kodierung: 192 = Kante, >192 = innen, <192 = außen
      const sdfValue = Math.round(Math.max(0, Math.min(255, 192 - dist * (128 / BUFFER))));

      data[offset] = 0; // R
      data[offset + 1] = 0; // G
      data[offset + 2] = 0; // B
      data[offset + 3] = sdfValue; // A = SDF-Wert
    }
  }

  return data;
}

/**
 * Registriert das Pfeilspitze-SDF-Image auf der Map.
 * Idempotent — überspringt wenn bereits registriert.
 */
export function registerArrowHeadImage(map: MaplibreMap): void {
  if (map.hasImage(ARROW_HEAD_IMAGE)) return;

  map.addImage(ARROW_HEAD_IMAGE, { width: SIZE, height: SIZE, data: createArrowHeadSDF() }, { sdf: true });
}
