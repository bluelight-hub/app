/**
 * Typen für die Lagekarte-Zeichenwerkzeuge
 *
 * Gemeinsame Typen für Draw-Modi, Styles und Feature-Properties.
 */

/** Verfügbare Zeichenmodi */
export type DrawMode =
  | 'idle'
  | 'select'
  | 'draw_point'
  | 'draw_line_string'
  | 'draw_polygon'
  | 'draw_freehand'
  | 'draw_text'
  | 'osm_mark'
  | 'draw_circle'
  | 'draw_rectangle'
  | 'draw_sector'
  | 'draw_gams';

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
  /** Farbfüllung aktiv */
  fillEnabled: boolean;
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
  fillEnabled: true,
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
  featureType: 'drawing' | 'osm_marking' | 'gams_zone';
  /** OSM-Feature-ID (nur für OSM-Markierungen) */
  osmFeatureId?: string;
  /** OSM-Layer-ID (nur für OSM-Markierungen) */
  osmLayerId?: string;
  /** Markierungsstatus (nur für OSM-Markierungen) */
  osmStatus?: OsmMarkierungStatus;
  /** Shape-Typ für parametrische Formen (Kreis, Rechteck, Sektor) */
  shapeType?: 'circle' | 'rectangle' | 'sector';
  /** Mittelpunkt als JSON-String "[lng, lat]" (MapboxDraw erlaubt nur Primitive) */
  shapeCenter?: string;
  /** Radius in Metern (für Kreis/Sektor) */
  shapeRadius?: number;
  /** Kompasswinkel in Grad (für Sektor) */
  shapeBearing?: number;
  /** Öffnungswinkel in Grad (für Sektor) */
  shapeOpeningAngle?: number;
}

/** Standard-Radien für GAMS-Zonen in Metern [Rot, Orange, Gelb, Grün] */
export const GAMS_DEFAULT_RADIEN: [number, number, number, number] = [50, 100, 300, 500];

/** Farbzuordnung für GAMS-Zonen */
export const GAMS_ZONEN_FARBEN = ['#ef4444', '#f97316', '#eab308', '#22c55e'] as const;

/** Namen der GAMS-Zonen */
export const GAMS_ZONEN_NAMEN = ['Gefahrenzone (Rot)', 'Absperrbereich (Orange)', 'Warnbereich (Gelb)', 'Äußerer Bereich (Grün)'] as const;

/** Farbzuordnung für OSM-Markierungsstatus */
export const OSM_MARKING_COLORS: Record<OsmMarkierungStatus, string> = {
  betroffen: '#fbbf24',
  gesperrt: '#ef4444',
  evakuiert: '#a855f7',
};
