import { Button } from '@/components/atoms/button.atom';
import { Input } from '@/components/atoms/input.atom';
import { DRAWING_STYLES, type ShapeType } from '@/utils/drawing-styles';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type React from 'react';
import { useState } from 'react';
import { PiPentagon, PiX } from 'react-icons/pi';
import type * as GeoJSON from 'geojson';

/**
 * Props für ShapeLabelModal
 */
export interface ShapeLabelModalProps {
  /**
   * Ob Modal geöffnet ist
   */
  isOpen: boolean;

  /**
   * Callback zum Schließen des Modals
   */
  onClose: () => void;

  /**
   * Shape-Feature für das Label/Typ gesetzt werden soll
   */
  shape: GeoJSON.Feature | null;

  /**
   * Callback wenn Label & Typ gespeichert werden
   */
  onSave: (label: string, type: ShapeType) => void;
}

/**
 * Shape-Label-Modal-Komponente
 *
 * Headless UI Dialog für Shape-Label-Eingabe nach Erstellung.
 * - Zeigt Formular für Label-Text und Typ-Auswahl
 * - Unterstützt Dark-Mode
 * - Security: Sanitizes label input (max 255 chars, strips HTML)
 * - Mobile-responsive
 *
 * @param isOpen - Ob Modal geöffnet ist
 * @param onClose - Callback zum Schließen
 * @param shape - GeoJSON Feature des Shapes
 * @param onSave - Callback mit (label, type)
 *
 * @example
 * ```tsx
 * <ShapeLabelModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   shape={createdShape}
 *   onSave={(label, type) => {
 *     updateShape({ ...shape, properties: { ...shape.properties, label, type } });
 *   }}
 * />
 * ```
 */
export const ShapeLabelModal: React.FC<ShapeLabelModalProps> = ({ isOpen, onClose, shape, onSave }) => {
  const [label, setLabel] = useState('');
  const [shapeType, setShapeType] = useState<ShapeType>('GEFAHRENBEREICH');
  const [error, setError] = useState<string | null>(null);

  /**
   * Sanitize label input (XSS prevention)
   * - Strip HTML tags
   * - Limit to 255 characters
   */
  const sanitizeLabel = (input: string): string => {
    // Strip HTML tags
    const stripped = input.replace(/<[^>]*>/g, '');
    // Limit length
    return stripped.slice(0, 255);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate label
    const sanitizedLabel = sanitizeLabel(label);
    if (sanitizedLabel.length < 3) {
      setError('Mindestens 3 Zeichen erforderlich');
      return;
    }

    // Save and close
    onSave(sanitizedLabel, shapeType);
    onClose();

    // Reset form
    setLabel('');
    setShapeType('GEFAHRENBEREICH');
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setLabel('');
    setShapeType('GEFAHRENBEREICH');
    setError(null);
    onClose();
  };

  // Shape-Typ-Optionen
  const shapeTypes: ShapeType[] = ['GEFAHRENBEREICH', 'SPERRBEREICH', 'RETTUNGSWEG', 'ABSPERRUNG', 'SONSTIGES'];

  return (
    <Dialog open={isOpen} onClose={handleCancel} className="relative z-[9999]">
      {/* Backdrop */}
      <DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg border border-gray-300 bg-white p-6 shadow-xl transition-all sm:max-w-md dark:border-gray-600 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <PiPentagon size={24} color="#3b82f6" aria-hidden="true" />
              <DialogTitle as="h3" className="font-semibold text-gray-900 text-lg dark:text-gray-100">
                Bereich beschriften
              </DialogTitle>
            </div>

            {/* Close Button */}
            <Button type="button" onClick={handleCancel} intent="secondary" appearance="ghost" size="icon" aria-label="Modal schließen">
              <PiX size={20} />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Label Field */}
            <div>
              <label htmlFor="shape-label" className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Beschreibung <span className="text-red-500">*</span>
              </label>
              <Input id="shape-label" name="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z.B. Überschwemmtes Gebiet" className="w-full" maxLength={255} required />
              {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
              <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">Max. 255 Zeichen</p>
            </div>

            {/* Type Dropdown */}
            <div>
              <label htmlFor="shape-type" className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Typ <span className="text-red-500">*</span>
              </label>
              <select
                id="shape-type"
                name="type"
                value={shapeType}
                onChange={(e) => setShapeType(e.target.value as ShapeType)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400"
                required
              >
                {shapeTypes.map((type) => {
                  const config = DRAWING_STYLES[type];
                  return (
                    <option key={type} value={type}>
                      {config.label}
                    </option>
                  );
                })}
              </select>
              {shapeType && <p className="mt-1 text-gray-600 text-xs dark:text-gray-400">{DRAWING_STYLES[shapeType].description}</p>}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <Button type="button" onClick={handleCancel} intent="secondary" appearance="outline" size="md" className="flex-1">
                Abbrechen
              </Button>
              <Button type="submit" intent="primary" appearance="filled" size="md" className="flex-1">
                Speichern
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
