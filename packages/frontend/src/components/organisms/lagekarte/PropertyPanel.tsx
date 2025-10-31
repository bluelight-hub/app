import { useState, useEffect } from 'react';
import { PiX } from 'react-icons/pi';
import { useDebouncedCallback } from 'use-debounce';
import type * as GeoJSON from 'geojson';

/**
 * Shape-Properties Interface
 */
export interface ShapeProperties {
  label?: string;
  color: string;
  strokeWidth: number;
  fillOpacity: number;
  description?: string;
}

/**
 * PropertyPanel Props
 */
export interface PropertyPanelProps {
  /** Selected Shape (GeoJSON Feature) */
  selectedShape: GeoJSON.Feature | null;
  /** Callback wenn Properties geändert werden */
  onPropertiesChange: (shapeId: string, properties: Partial<ShapeProperties>) => void;
  /** Callback zum Schließen des Panels */
  onClose: () => void;
}

/**
 * PropertyPanel - Rechte Sidebar für Shape-Eigenschaften
 *
 * Zeigt editierbare Properties für selektierte Shapes:
 * - Label (Text Input)
 * - Color (Color Picker + Hex Input)
 * - Stroke Width (Range Slider 1-10px)
 * - Fill Opacity (Range Slider 0-100%)
 * - Description (Textarea)
 *
 * Features:
 * - Debounced Updates (500ms) für optimale Performance
 * - Live-Preview auf Karte durch onPropertiesChange Callback
 * - Responsive Design: Fixed Sidebar (Desktop), Slide-up Panel (Mobile)
 * - Glassmorphism Design mit Backdrop-Blur
 *
 * @param selectedShape - Aktuell selektiertes GeoJSON Feature
 * @param onPropertiesChange - Callback für Property-Änderungen (debounced)
 * @param onClose - Callback zum Schließen des Panels
 *
 * @example
 * ```tsx
 * <PropertyPanel
 *   selectedShape={selectedShape}
 *   onPropertiesChange={(shapeId, props) => updateShapeStyle(shapeId, props)}
 *   onClose={() => setShowPropertyPanel(false)}
 * />
 * ```
 */
export const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedShape, onPropertiesChange, onClose }) => {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillOpacity, setFillOpacity] = useState(0.2);
  const [description, setDescription] = useState('');

  // Load shape properties when selection changes
  useEffect(() => {
    if (selectedShape) {
      setLabel(selectedShape.properties?.label || '');
      setColor(selectedShape.properties?.color || '#3b82f6');
      setStrokeWidth(selectedShape.properties?.strokeWidth || 2);
      setFillOpacity(selectedShape.properties?.fillOpacity || 0.2);
      setDescription(selectedShape.properties?.description || '');
    }
  }, [selectedShape]);

  // Debounced update callback (500ms delay)
  const debouncedUpdate = useDebouncedCallback((shapeId: string, props: Partial<ShapeProperties>) => {
    onPropertiesChange(shapeId, props);
  }, 500);

  /**
   * Handle property change and trigger debounced update
   */
  const handleChange = (field: keyof ShapeProperties, value: string | number) => {
    const shapeId = selectedShape?.properties?.id;
    if (!shapeId) return;

    debouncedUpdate(shapeId, { [field]: value });
  };

  // Render nothing if no shape is selected
  if (!selectedShape) return null;

  return (
    <>
      {/* Desktop: Fixed Right Sidebar */}
      <div className="fixed top-0 right-0 z-[1000] hidden h-full w-80 border-gray-200 border-l bg-white/95 p-4 shadow-xl backdrop-blur-sm md:block dark:border-gray-700 dark:bg-gray-800/95">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Shape-Eigenschaften</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Schließen">
            <PiX className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Label Input */}
          <div>
            <label htmlFor="shape-label-desktop" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Label
            </label>
            <input
              id="shape-label-desktop"
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                handleChange('label', e.target.value);
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Beschriftung hinzufügen..."
            />
          </div>

          {/* Color Picker */}
          <div>
            <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">Farbe</span>
            <div className="mt-1 flex gap-2">
              <input
                id="shape-color-picker-desktop"
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  handleChange('color', e.target.value);
                }}
                className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600"
                aria-label="Farbe auswählen"
              />
              <input
                id="shape-color-text-desktop"
                type="text"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  handleChange('color', e.target.value);
                }}
                className="flex-1 rounded border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                aria-label="Farbe als Hex-Code"
              />
            </div>
          </div>

          {/* Stroke Width Slider */}
          <div>
            <label htmlFor="shape-stroke-width-desktop" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Linienstärke: {strokeWidth}px
            </label>
            <input
              id="shape-stroke-width-desktop"
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => {
                const value = Number(e.target.value);
                setStrokeWidth(value);
                handleChange('strokeWidth', value);
              }}
              className="mt-1 w-full"
            />
          </div>

          {/* Fill Opacity Slider */}
          <div>
            <label htmlFor="shape-fill-opacity-desktop" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Transparenz: {Math.round(fillOpacity * 100)}%
            </label>
            <input
              id="shape-fill-opacity-desktop"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={fillOpacity}
              onChange={(e) => {
                const value = Number(e.target.value);
                setFillOpacity(value);
                handleChange('fillOpacity', value);
              }}
              className="mt-1 w-full"
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label htmlFor="shape-description-desktop" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Beschreibung
            </label>
            <textarea
              id="shape-description-desktop"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleChange('description', e.target.value);
              }}
              rows={3}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Beschreibung hinzufügen..."
            />
          </div>
        </div>
      </div>

      {/* Mobile: Slide-up Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[1000] max-h-[70vh] overflow-y-auto rounded-t-2xl border-gray-200 border-t bg-white/95 p-4 shadow-xl backdrop-blur-sm md:hidden dark:border-gray-700 dark:bg-gray-800/95">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Shape-Eigenschaften</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Schließen">
            <PiX className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Form Fields (same as desktop) */}
        <div className="space-y-4">
          {/* Label Input */}
          <div>
            <label htmlFor="shape-label-mobile" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Label
            </label>
            <input
              id="shape-label-mobile"
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                handleChange('label', e.target.value);
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Beschriftung hinzufügen..."
            />
          </div>

          {/* Color Picker */}
          <div>
            <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">Farbe</span>
            <div className="mt-1 flex gap-2">
              <input
                id="shape-color-picker-mobile"
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  handleChange('color', e.target.value);
                }}
                className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600"
                aria-label="Farbe auswählen"
              />
              <input
                id="shape-color-text-mobile"
                type="text"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  handleChange('color', e.target.value);
                }}
                className="flex-1 rounded border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                aria-label="Farbe als Hex-Code"
              />
            </div>
          </div>

          {/* Stroke Width Slider */}
          <div>
            <label htmlFor="shape-stroke-width-mobile" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Linienstärke: {strokeWidth}px
            </label>
            <input
              id="shape-stroke-width-mobile"
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => {
                const value = Number(e.target.value);
                setStrokeWidth(value);
                handleChange('strokeWidth', value);
              }}
              className="mt-1 w-full"
            />
          </div>

          {/* Fill Opacity Slider */}
          <div>
            <label htmlFor="shape-fill-opacity-mobile" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Transparenz: {Math.round(fillOpacity * 100)}%
            </label>
            <input
              id="shape-fill-opacity-mobile"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={fillOpacity}
              onChange={(e) => {
                const value = Number(e.target.value);
                setFillOpacity(value);
                handleChange('fillOpacity', value);
              }}
              className="mt-1 w-full"
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label htmlFor="shape-description-mobile" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Beschreibung
            </label>
            <textarea
              id="shape-description-mobile"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleChange('description', e.target.value);
              }}
              rows={3}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Beschreibung hinzufügen..."
            />
          </div>
        </div>
      </div>
    </>
  );
};
