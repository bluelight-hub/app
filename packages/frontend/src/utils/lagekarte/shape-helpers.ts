import * as L from 'leaflet';
import type { LayerWithStyle, LayerWithTextContent, OriginalStyle } from './types';

/**
 * Generate unique shape ID using crypto.randomUUID()
 * Fallback to Date.now() + random suffix for older browsers
 */
export const generateShapeId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix to avoid collisions
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Check if layer has style methods
 */
const isLayerWithStyle = (layer: L.Layer): layer is LayerWithStyle => {
  return 'setStyle' in layer && typeof (layer as LayerWithStyle).setStyle === 'function';
};

/**
 * Apply highlight style to selected layer
 */
export const highlightLayer = (layer: L.Layer, originalStylesRef: Map<string, OriginalStyle>, shapeId: string) => {
  // Skip text markers (no style to highlight)
  if (!isLayerWithStyle(layer)) {
    return;
  }

  // Store original style if not already stored
  if (!originalStylesRef.has(shapeId)) {
    const currentStyle = layer.options;
    originalStylesRef.set(shapeId, {
      color: currentStyle.color,
      weight: currentStyle.weight,
      opacity: currentStyle.opacity,
      fillOpacity: currentStyle.fillOpacity,
    });
  }

  // Apply highlight style
  layer.setStyle({
    color: '#3b82f6', // blue-500
    weight: 4,
    opacity: 1.0,
    fillOpacity: 0.5,
  });
};

/**
 * Remove highlight style from layer
 */
export const unhighlightLayer = (layer: L.Layer, originalStylesRef: Map<string, OriginalStyle>, shapeId: string) => {
  // Skip text markers
  if (!isLayerWithStyle(layer)) {
    return;
  }

  // Restore original style if available
  const originalStyle = originalStylesRef.get(shapeId);
  if (originalStyle) {
    layer.setStyle(originalStyle);
    originalStylesRef.delete(shapeId);
  }
};

/**
 * Extract text content from Leaflet.PM text marker layer
 */
export const extractTextContent = (layer: L.Layer & Partial<LayerWithTextContent>, eventShape?: string): string | null => {
  let textContent = null;

  // Try multiple methods to extract text from the layer
  if (layer._textContent) {
    // Custom property we set
    textContent = layer._textContent;
  } else if (layer.getElement) {
    // Try to get from DOM element
    const element = layer.getElement();
    const textDiv = element?.querySelector('.lagekarte-text-marker, [contenteditable]');
    textContent = textDiv?.textContent || textDiv?.innerText;
  }

  // If still no text, try event shape property
  if (!textContent && eventShape === 'Text') {
    textContent = 'Beschriftung'; // Default text from textOptions
  }

  return textContent;
};

/**
 * Create Leaflet Text Marker from GeoJSON Feature
 */
export const createTextMarker = (feature: GeoJSON.Feature, map: L.Map): (L.Marker & LayerWithTextContent) | null => {
  if (feature.geometry.type !== 'Point' || !feature.properties?.text) {
    return null;
  }

  const coordinates = feature.geometry.coordinates as [number, number];

  // Sanitize text content to prevent XSS
  const safeText = feature.properties.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const textMarker = L.marker([coordinates[1], coordinates[0]], {
    icon: L.divIcon({
      html: `<div class="lagekarte-text-marker">${safeText}</div>`,
      className: '',
      iconSize: undefined,
    }),
    draggable: false, // Draggable only when in edit mode
  }) as L.Marker & LayerWithTextContent;

  // Store text content for later editing
  textMarker._textContent = feature.properties.text;

  return textMarker;
};
