import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type * as GeoJSON from 'geojson';
import { CloseButton } from '@/shared/ui/atoms/close-button.atom';
import { PropertyPanelContent } from '@/features/lagekarte';

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
 * - Atomic Design: Verwendet Atom/Molecule-Komponenten
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

  // Shared change handlers for PropertyPanelContent
  const changeHandlers = {
    label: (value: string) => {
      setLabel(value);
      handleChange('label', value);
    },
    color: (value: string) => {
      setColor(value);
      handleChange('color', value);
    },
    strokeWidth: (value: number) => {
      setStrokeWidth(value);
      handleChange('strokeWidth', value);
    },
    fillOpacity: (value: number) => {
      setFillOpacity(value);
      handleChange('fillOpacity', value);
    },
    description: (value: string) => {
      setDescription(value);
      handleChange('description', value);
    },
  };

  return (
    <>
      {/* Desktop: Fixed Right Sidebar */}
      <div className="fixed top-0 right-0 z-[1000] hidden h-full w-80 border-gray-200 border-l bg-white/95 p-4 shadow-xl backdrop-blur-sm md:block dark:border-gray-700 dark:bg-gray-800/95">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Shape-Eigenschaften</h3>
          <CloseButton onClick={onClose} />
        </div>

        {/* Form Fields */}
        <PropertyPanelContent label={label} color={color} strokeWidth={strokeWidth} fillOpacity={fillOpacity} description={description} onChange={changeHandlers} idSuffix="desktop" />
      </div>

      {/* Mobile: Slide-up Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[1000] max-h-[70vh] overflow-y-auto rounded-t-2xl border-gray-200 border-t bg-white/95 p-4 shadow-xl backdrop-blur-sm md:hidden dark:border-gray-700 dark:bg-gray-800/95">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Shape-Eigenschaften</h3>
          <CloseButton onClick={onClose} />
        </div>

        {/* Form Fields */}
        <PropertyPanelContent label={label} color={color} strokeWidth={strokeWidth} fillOpacity={fillOpacity} description={description} onChange={changeHandlers} idSuffix="mobile" />
      </div>
    </>
  );
};
