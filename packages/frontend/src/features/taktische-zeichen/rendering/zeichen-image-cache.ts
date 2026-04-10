import type { ZeichenDefinition } from './renderer';
import { renderer } from './phjardas-adapter';

/**
 * Erstellt einen stabilen Cache-Schlüssel aus einer Zeichendefinition.
 * Alle Felder werden in einer definierten Reihenfolge zusammengefügt.
 */
function getCacheKey(definition: ZeichenDefinition): string {
  return [
    definition.grundzeichen ?? '',
    definition.organisation ?? '',
    definition.fachaufgabe ?? '',
    definition.einheit ?? '',
    definition.verwaltungsstufe ?? '',
    definition.symbol ?? '',
    definition.text ?? '',
  ].join('|');
}

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Gibt ein gecachtes HTMLImageElement für das taktische Zeichen zurück.
 * Falls noch nicht im Cache vorhanden, wird es neu erstellt und gecacht.
 *
 * Wird für die MapLibre-Image-Registrierung via `map.addImage()` benötigt.
 *
 * @param definition - Definition des taktischen Zeichens
 * @returns Schlüssel und geladenes HTMLImageElement
 */
export async function getOrCreateImage(
  definition: ZeichenDefinition,
): Promise<{ key: string; image: HTMLImageElement }> {
  const key = `tz-${getCacheKey(definition)}`;
  const cached = imageCache.get(key);
  if (cached) return { key, image: cached };

  const dataUrl = renderer.renderDataUrl(definition);
  const [width, height] = renderer.getSize(definition);

  const img = new Image(width, height);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  imageCache.set(key, img);
  return { key, image: img };
}

/**
 * Leert den gesamten Bild-Cache.
 * Sollte aufgerufen werden, wenn die Karte neu initialisiert wird.
 */
export function clearImageCache(): void {
  imageCache.clear();
}
