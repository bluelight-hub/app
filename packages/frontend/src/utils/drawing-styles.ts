/**
 * Drawing-Styles für Lagekarte Shapes
 *
 * Definiert die Farbschemata und Stil-Optionen für verschiedene
 * Gefahrenbereiche, Sperrbereiche, Rettungswege und Absperrungen.
 */

import type { PathOptions } from 'leaflet';

/**
 * Shape-Typ-Definitionen
 */
export type ShapeType = 'GEFAHRENBEREICH' | 'SPERRBEREICH' | 'RETTUNGSWEG' | 'ABSPERRUNG' | 'SONSTIGES';

/**
 * Drawing-Style-Konfiguration für Polygone
 */
interface PolygonStyle extends PathOptions {
  fillColor: string;
  fillOpacity: number;
  color: string;
  weight: number;
}

/**
 * Drawing-Style-Konfiguration für Linien (Polylines)
 */
interface PolylineStyle extends PathOptions {
  color: string;
  weight: number;
  dashArray?: string;
}

/**
 * Zentrale Style-Konfiguration für alle Drawing-Typen
 */
export const DRAWING_STYLES: Record<
  ShapeType,
  {
    polygon: PolygonStyle;
    polyline: PolylineStyle;
    label: string;
    description: string;
  }
> = {
  GEFAHRENBEREICH: {
    polygon: {
      color: '#ef4444', // Tailwind red-500
      fillColor: '#ef4444',
      fillOpacity: 0.3,
      weight: 2,
    },
    polyline: {
      color: '#ef4444',
      weight: 4,
    },
    label: 'Gefahrenbereich',
    description: 'Bereich mit akuter Gefahr (z.B. Evakuierungszone)',
  },
  SPERRBEREICH: {
    polygon: {
      color: '#f97316', // Tailwind orange-500
      fillColor: '#f97316',
      fillOpacity: 0.3,
      weight: 2,
    },
    polyline: {
      color: '#f97316',
      weight: 4,
    },
    label: 'Sperrbereich',
    description: 'Gesperrter Bereich (kein Zutritt)',
  },
  RETTUNGSWEG: {
    polygon: {
      color: '#10b981', // Tailwind green-500
      fillColor: '#10b981',
      fillOpacity: 0.2,
      weight: 2,
    },
    polyline: {
      color: '#10b981',
      weight: 4,
      dashArray: '10, 5', // Dashed line
    },
    label: 'Rettungsweg',
    description: 'Sicherer Flucht- oder Rettungsweg',
  },
  ABSPERRUNG: {
    polygon: {
      color: '#eab308', // Tailwind yellow-500
      fillColor: '#eab308',
      fillOpacity: 0.2,
      weight: 2,
    },
    polyline: {
      color: '#eab308',
      weight: 4,
    },
    label: 'Absperrung',
    description: 'Temporäre Absperrung oder Barriere',
  },
  SONSTIGES: {
    polygon: {
      color: '#3b82f6', // Tailwind blue-500
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 2,
    },
    polyline: {
      color: '#3b82f6',
      weight: 4,
    },
    label: 'Sonstiges',
    description: 'Sonstige Markierung',
  },
};

/**
 * Default-Style für neue Shapes (vor Typ-Auswahl)
 */
export const DEFAULT_SHAPE_STYLE: PolygonStyle = {
  color: '#6b7280', // Tailwind gray-500
  fillColor: '#6b7280',
  fillOpacity: 0.2,
  weight: 2,
};
