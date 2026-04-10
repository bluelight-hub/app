/**
 * Karten-Konfiguration für MapLibre GL JS
 *
 * Enthält alle Konstanten für Tile-Quellen, Default-Positionen, Zoom-Level
 * und Kartengrundlagen-Definitionen.
 */

import type { StyleSpecification } from 'maplibre-gl';

// ============================================
// Kartengrundlagen (Base Layers)
// ============================================

export type BaseLayerId = 'osm' | 'topo' | 'satellite';

export interface BaseLayerConfig {
  id: BaseLayerId;
  label: string;
  /** Style-URL oder StyleSpecification für hellen Modus */
  styleLight: string | StyleSpecification;
  /** Style für dunklen Modus — null wenn nicht verfügbar (nutzt dann light) */
  styleDark: string | null;
  /** Benötigt einen API-Key (z.B. MapTiler) */
  requiresApiKey: boolean;
}

/**
 * OpenTopoMap Raster-Style als MapLibre StyleSpecification
 */
const TOPO_STYLE: StyleSpecification = {
  version: 8,
  // Glyphs-URL für Symbol-Layer (Text-Labels auf der Lagekarte).
  // Ohne diese URL crasht MapLibre beim Rendern von text-field Expressions.
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    topo: {
      type: 'raster',
      tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    },
  },
  layers: [{ id: 'topo-tiles', type: 'raster', source: 'topo' }],
};

/**
 * Verfügbare Kartengrundlagen
 *
 * Satellit ist nur verfügbar wenn VITE_MAPTILER_API_KEY gesetzt ist.
 */
export const BASE_LAYERS: BaseLayerConfig[] = [
  {
    id: 'osm',
    label: 'Standard (OSM)',
    styleLight: 'https://tiles.openfreemap.org/styles/liberty',
    styleDark: 'https://tiles.openfreemap.org/styles/dark',
    requiresApiKey: false,
  },
  {
    id: 'topo',
    label: 'Topographisch',
    styleLight: TOPO_STYLE,
    styleDark: null,
    requiresApiKey: false,
  },
  {
    id: 'satellite',
    label: 'Satellit',
    styleLight: 'https://api.maptiler.com/maps/satellite/style.json',
    styleDark: null,
    requiresApiKey: true,
  },
];

/**
 * Gibt die verfügbaren Kartengrundlagen zurück (filtert nach API-Key-Verfügbarkeit)
 */
export function getAvailableBaseLayers(): BaseLayerConfig[] {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
  return BASE_LAYERS.filter((layer) => !layer.requiresApiKey || !!apiKey);
}

/**
 * Löst den MapLibre-Style für eine Grundkarte auf
 */
export function resolveMapStyle(layerId: BaseLayerId, isDark: boolean): string | StyleSpecification {
  const layer = BASE_LAYERS.find((l) => l.id === layerId);
  if (!layer) {
    return BASE_LAYERS[0].styleLight;
  }

  // API-Key-Prüfung für kostenpflichtige Layer
  if (layer.requiresApiKey) {
    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    if (!apiKey) {
      // Fallback auf OSM wenn kein Key
      return isDark ? (BASE_LAYERS[0].styleDark ?? BASE_LAYERS[0].styleLight) : BASE_LAYERS[0].styleLight;
    }

    // Style-URL mit API-Key aufbauen
    const appendKey = (url: string) => `${url}?key=${apiKey}`;
    if (isDark && layer.styleDark) {
      return appendKey(layer.styleDark);
    }
    return typeof layer.styleLight === 'string' ? appendKey(layer.styleLight) : layer.styleLight;
  }

  // Dark-Variante nutzen wenn verfügbar
  if (isDark && layer.styleDark) {
    return layer.styleDark;
  }

  return layer.styleLight;
}

// ============================================
// Legacy-Export für Abwärtskompatibilität
// ============================================

export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

// ============================================
// DWD Wetter-Overlay
// ============================================

/** DWD WMS-Basis-URL für Wetterwarnungen */
export const DWD_WMS_URL = 'https://maps.dwd.de/geoserver/dwd/wms';

/** DWD WMS-Layer für Warngebiete */
export const DWD_WMS_LAYERS = 'dwd:Warnungen_Gemeinden_vereinigt';

/**
 * Erzeugt die WMS-Tile-URL für MapLibre
 * Nutzt EPSG:3857 (Web Mercator) und transparenten Hintergrund
 */
export function getDwdWmsTileUrl(): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: DWD_WMS_LAYERS,
    STYLES: '',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    SRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
  });
  return `${DWD_WMS_URL}?${params.toString()}&BBOX={bbox-epsg-3857}`;
}

// ============================================
// Karten-Defaults
// ============================================

/**
 * Default-Kartenansicht (Deutschland-Zentrum)
 * Koordinaten in GeoJSON-Reihenfolge: [longitude, latitude]
 */
export const MAP_DEFAULTS = {
  longitude: 10.4515,
  latitude: 51.1657,
  zoom: 6,
  maxZoom: 18,
  minZoom: 3,
} as const;

/**
 * Maximale Anzahl an Zeichnungen pro Lagekarte
 */
export const DRAW_FEATURE_LIMIT = 100;
