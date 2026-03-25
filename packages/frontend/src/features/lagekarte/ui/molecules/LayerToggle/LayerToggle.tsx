import { Switch } from '@headlessui/react';
import type React from 'react';
import { PiEye, PiEyeSlash } from 'react-icons/pi';

/**
 * Layer-Definition für Layer-Toggle
 */
export interface Layer {
  /**
   * Eindeutiger Name des Layers
   */
  name: string;
  /**
   * Angezeigtes Label für den Layer
   */
  label: string;
  /**
   * Ob Layer sichtbar ist
   */
  visible: boolean;
}

interface LayerToggleProps {
  /**
   * Liste der Layer mit Visibility-State
   */
  layers: Layer[];
  /**
   * Callback wenn Layer-Visibility geändert wird
   */
  onToggle: (layerName: string) => void;
}

/**
 * LayerToggle-Komponente für Lagekarte
 *
 * Zeigt Headless UI Switches für POI-Layer und Drawing-Layer an,
 * mit denen der User die Layer-Sichtbarkeit togglen kann.
 *
 * @param layers - Layer mit Namen und Visibility-State
 * @param onToggle - Callback wenn Layer getoggled wird
 *
 * @remarks
 * - Position: Top-right corner (absolute right-4 top-64 z-50)
 * - Headless UI Switch mit Eye-Icon
 * - Dark-Mode Support
 * - Mobile-responsive (compact auf Mobile)
 *
 * @example
 * ```tsx
 * <LayerToggle
 *   layers={[
 *     { name: 'poi', label: 'POI-Marker', visible: true },
 *     { name: 'drawing', label: 'Zeichnungen', visible: true }
 *   ]}
 *   onToggle={(layerName) => toggleLayer(layerName)}
 * />
 * ```
 */
export const LayerToggle: React.FC<LayerToggleProps> = ({ layers, onToggle }) => {
  return (
    <div className="absolute top-64 right-4 z-50 rounded-lg border border-border-subtle bg-surface-panel p-3 shadow-md">
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-text-primary">Layer</h3>
      </div>

      {/* Layer Switches */}
      <div className="flex flex-col gap-2">
        {layers.map((layer) => (
          <Switch.Group key={layer.name}>
            <div className="flex items-center justify-between gap-3">
              {/* Label */}
              <Switch.Label className="cursor-pointer text-sm font-medium text-text-secondary">{layer.label}</Switch.Label>

              {/* Switch */}
              <Switch
                checked={layer.visible}
                onChange={() => onToggle(layer.name)}
                className={`${
                  layer.visible ? 'bg-action-primary' : 'bg-surface-raised'
                } relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none`}
                aria-label={`${layer.label} ${layer.visible ? 'ausblenden' : 'einblenden'}`}
              >
                {/* Switch Circle */}
                <span
                  className={`${layer.visible ? 'translate-x-6' : 'translate-x-1'} inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-surface-panel shadow-sm transition-transform`}
                >
                  {/* Icon */}
                  {layer.visible ? <PiEye size={12} className="text-action-primary" aria-hidden="true" /> : <PiEyeSlash size={12} className="text-text-secondary" aria-hidden="true" />}
                </span>
              </Switch>
            </div>
          </Switch.Group>
        ))}
      </div>
    </div>
  );
};
