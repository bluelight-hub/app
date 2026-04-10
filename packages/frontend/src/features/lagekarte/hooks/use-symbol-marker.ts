/**
 * Hook für die Platzierung von Symbol-Markern auf der Lagekarte
 *
 * Registriert SVG-Symbole als MapLibre-Images und steuert den
 * Symbol-Platzierungsmodus (Klick auf Karte = Symbol platzieren).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { SYMBOL_LIBRARY, getSymbolImageName, type SymbolDefinition } from '../drawing/symbols/symbol-registry';

interface UseSymbolMarkerOptions {
  /** Referenz auf die MapLibre-GL-Instanz */
  mapRef: React.RefObject<MapRef | null>;
  /** Referenz auf die MapboxDraw-Instanz */
  drawRef: React.RefObject<MapboxDraw | null>;
  /** Ob die Karte vollständig geladen ist */
  isMapLoaded: boolean;
}

interface UseSymbolMarkerReturn {
  /** Aktuell ausgewähltes Symbol (wartet auf Platzierung) */
  pendingSymbol: SymbolDefinition | null;
  /** Symbol für Platzierung auswählen */
  selectSymbol: (symbol: SymbolDefinition) => void;
  /** Auswahl abbrechen */
  cancelSymbol: () => void;
  /** Ob Symbol-Images bereits registriert sind */
  isReady: boolean;
}

/**
 * Lädt ein SVG als HTMLImageElement (für map.addImage)
 */
function loadSvgImage(svgContent: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(width, height);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  });
}

export function useSymbolMarker({ mapRef, drawRef, isMapLoaded }: UseSymbolMarkerOptions): UseSymbolMarkerReturn {
  const [pendingSymbol, setPendingSymbol] = useState<SymbolDefinition | null>(null);
  const [isReady, setIsReady] = useState(false);
  const registeredRef = useRef(false);
  const registeringRef = useRef(false);

  // Alle Symbol-Images beim Map-Load registrieren
  useEffect(() => {
    if (!isMapLoaded || registeredRef.current) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const registerAll = async () => {
      if (registeringRef.current) return;
      registeringRef.current = true;

      for (const symbol of SYMBOL_LIBRARY) {
        const imageName = getSymbolImageName(symbol.id);
        if (map.hasImage(imageName)) continue;

        try {
          const img = await loadSvgImage(symbol.svgContent, symbol.width, symbol.height);
          if (!map.hasImage(imageName)) {
            map.addImage(imageName, img);
          }
        } catch {
          console.warn(`Symbol-Image konnte nicht registriert werden: ${symbol.id}`);
        }
      }

      registeringRef.current = false;
      registeredRef.current = true;
      setIsReady(true);
    };

    registerAll();

    // Bei Style-Wechsel alle Images erneut registrieren
    const handleStyleLoad = () => {
      registeredRef.current = false;
      setIsReady(false);
      registerAll();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [isMapLoaded, mapRef]);

  const selectSymbol = useCallback((symbol: SymbolDefinition) => {
    setPendingSymbol(symbol);
  }, []);

  const cancelSymbol = useCallback(() => {
    setPendingSymbol(null);
  }, []);

  return { pendingSymbol, selectSymbol, cancelSymbol, isReady };
}
