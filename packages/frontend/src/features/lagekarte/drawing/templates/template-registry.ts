/**
 * Vordefinierte Shape-Templates für häufige taktische Zeichnungsobjekte
 *
 * Templates sind Stil-Voreinstellungen, die beim Zeichnen angewendet werden.
 * Sie nutzen bestehende Draw-Modi — kein eigener Mode nötig.
 */

import type { DrawMode, DrawingStyle, HatchConfig } from '../types';

/** Definition eines Shape-Templates */
export interface ShapeTemplate {
  /** Eindeutige Template-ID */
  id: string;
  /** Anzeigename */
  label: string;
  /** Kurzbeschreibung */
  description: string;
  /** Ziel-Zeichenmodus */
  drawMode: DrawMode;
  /** Voreingestellter Stil */
  style: Partial<DrawingStyle>;
}

/** Vordefinierte Templates für taktische Einsatzplanung */
export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    id: 'sperrzone',
    label: 'Sperrzone',
    description: 'Rot, schraffiert',
    drawMode: 'draw_polygon',
    style: {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillEnabled: true,
      fillOpacity: 0.15,
      strokeWidth: 3,
      hatch: { type: 'cross', spacing: 12, width: 1.5, color: '' } as HatchConfig,
    },
  },
  {
    id: 'gefahrenbereich',
    label: 'Gefahrenbereich',
    description: 'Orange, diagonal schraffiert',
    drawMode: 'draw_polygon',
    style: {
      color: '#f97316',
      fillColor: '#f97316',
      fillEnabled: true,
      fillOpacity: 0.15,
      strokeWidth: 2,
      hatch: { type: 'diagonal', spacing: 10, width: 1.5, color: '' } as HatchConfig,
    },
  },
  {
    id: 'einsatzabschnitt',
    label: 'Einsatzabschnitt',
    description: 'Blau, transparent',
    drawMode: 'draw_polygon',
    style: {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillEnabled: true,
      fillOpacity: 0.08,
      strokeWidth: 2,
      hatch: { type: 'none', spacing: 12, width: 1.5, color: '' } as HatchConfig,
    },
  },
  {
    id: 'behandlungsplatz',
    label: 'Behandlungsplatz',
    description: 'Grün, gefüllt',
    drawMode: 'draw_polygon',
    style: {
      color: '#22c55e',
      fillColor: '#22c55e',
      fillEnabled: true,
      fillOpacity: 0.2,
      strokeWidth: 2,
      hatch: { type: 'none', spacing: 12, width: 1.5, color: '' } as HatchConfig,
    },
  },
  {
    id: 'evakuierungsbereich',
    label: 'Evakuierungsbereich',
    description: 'Lila, leicht transparent',
    drawMode: 'draw_polygon',
    style: {
      color: '#a855f7',
      fillColor: '#a855f7',
      fillEnabled: true,
      fillOpacity: 0.12,
      strokeWidth: 2,
      hatch: { type: 'horizontal', spacing: 14, width: 1, color: '' } as HatchConfig,
    },
  },
  {
    id: 'anfahrtsweg',
    label: 'Anfahrtsweg',
    description: 'Blauer Pfeil',
    drawMode: 'draw_arrow',
    style: {
      color: '#3b82f6',
      strokeWidth: 3,
    },
  },
  {
    id: 'zufahrt-gesperrt',
    label: 'Zufahrt gesperrt',
    description: 'Rote Linie, breit',
    drawMode: 'draw_line_string',
    style: {
      color: '#ef4444',
      strokeWidth: 4,
    },
  },
  {
    id: 'wasserversorgung',
    label: 'Wasserversorgung',
    description: 'Blaue Linie',
    drawMode: 'draw_line_string',
    style: {
      color: '#0ea5e9',
      strokeWidth: 2,
    },
  },
];
