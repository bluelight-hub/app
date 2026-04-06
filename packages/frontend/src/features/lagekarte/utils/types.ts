import type { ShapeType } from './drawing-styles';

/**
 * Properties eines gezeichneten Shapes (in GeoJSON Feature.properties)
 */
export interface ShapeProperties {
  id: string;
  label?: string;
  type?: ShapeType;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  description?: string;
  createdAt: string;
}

/**
 * Original-Style für Highlight-Restore (reine Daten, kein Library-Bezug)
 */
export interface OriginalStyle {
  color?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
}
