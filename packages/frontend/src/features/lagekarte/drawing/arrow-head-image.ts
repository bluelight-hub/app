/**
 * Pfeilspitze als programmatisch erzeugtes SDF-Image für MapLibre
 *
 * Wird beim Map-Init registriert und von den Arrow-Style-Layern referenziert.
 * SDF-Modus ermöglicht Einfärbung über icon-color im Style-Layer.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';

/** Image-Name für die Pfeilspitze (konsistente Referenzierung) */
export const ARROW_HEAD_IMAGE = 'arrow-head';

/** Größe des SDF-Images in Pixel */
const SIZE = 24;

/**
 * Erzeugt ein RGBA-Dreieck (Pfeilspitze nach rechts zeigend) für SDF-Rendering.
 * MapLibre erwartet RGBA-Daten (4 Bytes pro Pixel), SDF nutzt den Alpha-Kanal.
 * MapLibre dreht das Icon automatisch bei symbol-placement: 'line'.
 */
function createArrowHeadSDF(): Uint8Array {
  const data = new Uint8Array(SIZE * SIZE * 4);

  // Dreieck: Spitze rechts-mitte, Basis links
  const tipX = SIZE - 2;
  const tipY = SIZE / 2;
  const baseX = 4;
  const topY = 3;
  const bottomY = SIZE - 3;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const offset = (y * SIZE + x) * 4;

      // Prüfe ob Punkt im Dreieck liegt (Barycentric Coordinates)
      const d1 = (x - tipX) * (topY - tipY) - (baseX - tipX) * (y - tipY);
      const d2 = (x - baseX) * (bottomY - topY) - (baseX - baseX) * (y - topY);
      const d3 = (x - baseX) * (tipY - bottomY) - (tipX - baseX) * (y - bottomY);

      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

      if (!(hasNeg && hasPos)) {
        // Punkt liegt im Dreieck — SDF-Wert 0 (innerhalb)
        data[offset] = 0; // R
        data[offset + 1] = 0; // G
        data[offset + 2] = 0; // B
        data[offset + 3] = 255; // A (voll opak)
      } else {
        // Außerhalb — SDF-Wert 255
        data[offset] = 255;
        data[offset + 1] = 255;
        data[offset + 2] = 255;
        data[offset + 3] = 0; // A (transparent)
      }
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
